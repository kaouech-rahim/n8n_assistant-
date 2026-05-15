# ── Stage 1: Install production deps (native addons compiled here) ────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_URL intentionally unset so frontend uses relative /api in production
RUN npm run build

# ── Stage 3: Minimal production image ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Copy production node_modules (with compiled native addons)
COPY --from=deps /app/node_modules ./node_modules

# Copy built React app
COPY --from=builder /app/dist ./dist

# Copy server source
COPY server.js db.js ./
COPY src/data ./src/data

# Persistent directories (overridden by volumes in docker-compose)
RUN mkdir -p /app/data /app/public/avatars

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/app.db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
