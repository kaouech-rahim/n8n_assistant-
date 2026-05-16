# Backend only — Node.js + Express + SQLite
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server.js db.js ./
COPY src/data ./src/data
RUN mkdir -p /app/data /app/public/avatars

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/app.db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server.js"]
