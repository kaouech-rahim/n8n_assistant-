# n8n Assistant

Interface web fullstack pour l'automatisation intelligente via [n8n](https://n8n.io/), avec des agents IA spécialisés pour la gestion des emails, réunions, documents et agenda.

---

## Aperçu

n8n Assistant est une application **React + Express + SQLite** qui agit comme un orchestrateur centralisé entre l'utilisateur et des workflows n8n. Elle expose plusieurs agents IA via une interface moderne, chacun connecté à des services externes via webhooks n8n.

```
Navigateur (React)  →  Backend Express (port 3001)  →  n8n (webhooks)  →  Services externes
```

---

## Fonctionnalités

| Page | Description |
|------|-------------|
| **Tableau de bord** | Statistiques globales, activité récente, alertes admin |
| **Mail Agent** | Consultation IMAP, classification spam, rédaction de réponses assistée par IA |
| **Meeting Agent** | Upload audio/vidéo, transcription automatique, résumé et points d'action |
| **Document Agent** | Analyse de PDF/Word, résumé et extraction de données par IA |
| **Calendar Agent** | Consultation et gestion de l'agenda Google Calendar |
| **Historique** | Journal de toutes les conversations sauvegardées (emails, réunions, documents) |
| **Profil** | Gestion du compte utilisateur et avatar |

---

## Stack technique

### Frontend
- **React 18** — Interface utilisateur
- **Tailwind CSS v4** — Styles utilitaires
- **Vite 5** — Bundler et serveur de développement
- **Lucide React** — Icônes

### Backend
- **Express 5** — Serveur API REST + proxy vers n8n
- **better-sqlite3** — Base de données SQLite persistante
- **multer** — Upload de fichiers (audio, documents, avatars)
- **dotenv / cors** — Configuration et sécurité

### Infrastructure
- **Docker** — Conteneurisation (Nginx + Express séparés)
- **GitHub Actions** — CI/CD : build + push images sur ghcr.io
- **OCI Free Tier** — Hébergement cloud gratuit (VM AMD Micro)

---

## Prérequis

- **Node.js** 20 ou supérieur
- **npm** 9 ou supérieur
- Une instance **n8n** accessible (locale ou distante)
- **Docker** (optionnel, pour le déploiement)

---

## Installation locale (développement)

```bash
# 1. Cloner le dépôt
git clone https://github.com/kaouech-rahim/n8n-assistant.git
cd n8n-assistant

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env selon votre configuration n8n
```

### Lancement

```bash
# Frontend + Backend en parallèle (recommandé)
npm run dev:full
```

- Frontend Vite : [http://localhost:5173](http://localhost:5173)
- Backend Express : [http://localhost:3001](http://localhost:3001)

```bash
# Séparé
npm run dev:api   # Backend uniquement (port 3001)
npm run dev:web   # Frontend uniquement (port 5173)
```

---

## Configuration

Créez un fichier `.env` à la racine (basé sur `.env.example`) :

```env
# URL de base du serveur n8n
N8N_URL=http://localhost:5678

# Base URL des webhooks n8n (utilisée par le backend)
N8N_WEBHOOK_BASE=http://localhost:5678/webhook

# Port du serveur Express
PORT=3001

# Chemin de la base de données SQLite (Docker : /app/data/app.db)
# DB_PATH=/app/data/app.db
```

> Si vous utilisez ngrok, remplacez `N8N_WEBHOOK_BASE` par l'URL ngrok (ex: `https://xxxx.ngrok-free.app/webhook`).

---

## Déploiement Docker (local)

```bash
# Construire et lancer les deux conteneurs
docker compose up -d --build

# Vérifier l'état
docker compose ps
docker compose logs -f
```

L'application est accessible sur [http://localhost](http://localhost).

### Architecture Docker

| Conteneur | Image | Port | Rôle |
|-----------|-------|------|------|
| `n8n-assistant-frontend` | Nginx + React build | 80 | Sert le frontend, proxy `/api/` vers le backend |
| `n8n-assistant-backend` | Node.js + Express | 3001 | API REST, SQLite, webhooks n8n |

Les données SQLite et les avatars sont persistés dans des **volumes Docker nommés** (`db_data`, `uploads`).

---

## Déploiement cloud — OCI Free Tier

### 1. Créer une VM sur OCI

- Compte OCI gratuit sur [cloud.oracle.com](https://cloud.oracle.com)
- Instance : `VM.Standard.E2.1.Micro` (AMD, 1 OCPU, 1 GB RAM — gratuit permanent)
- Image : Ubuntu 22.04
- Ouvrir le port 80 dans les Security Lists

### 2. Installer Docker sur la VM

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

### 3. Se connecter à ghcr.io et lancer

```bash
echo "GITHUB_TOKEN" | docker login ghcr.io -u kaouech-rahim --password-stdin

mkdir ~/app && cd ~/app
# Créer docker-compose.yml avec les images ghcr.io (voir ci-dessous)
docker compose pull
docker compose up -d
```

### docker-compose.yml pour la VM OCI

```yaml
services:
  frontend:
    image: ghcr.io/kaouech-rahim/n8n-assistant-frontend:latest
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - assistant_net

  backend:
    image: ghcr.io/kaouech-rahim/n8n-assistant-backend:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - db_data:/app/data
      - uploads:/app/public/avatars
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_PATH=/app/data/app.db
      - N8N_URL=http://localhost:5678
      - N8N_WEBHOOK_BASE=http://localhost:5678/webhook
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3001/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - assistant_net

volumes:
  db_data:
  uploads:

networks:
  assistant_net:
    driver: bridge
```

---

## CI/CD — GitHub Actions

Chaque push sur `main` déclenche automatiquement 3 jobs :

| Job | Durée | Description |
|-----|-------|-------------|
| **Build** | ~2 min | `npm ci` + `npm run build` — vérifie que le code compile |
| **Docker Frontend** | ~1 min | Build + push `ghcr.io/.../n8n-assistant-frontend:latest` |
| **Docker Backend** | ~1 min | Build + push `ghcr.io/.../n8n-assistant-backend:latest` |

Les images sont poussées sur **GitHub Container Registry (ghcr.io)** et tagguées `latest` + `sha-<commit>`.

---

## API Backend

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | État du serveur |
| GET | `/api/stats` | Statistiques agrégées de tous les agents |
| GET | `/api/logs` | Journal des événements système |
| GET/POST | `/api/spam-results` | Résultats classification spam |
| GET/POST | `/api/email-results` | Emails IMAP reçus |
| GET/POST | `/api/telegram-events` | Événements Telegram |
| GET/POST/PATCH | `/api/admin-notifications` | Notifications admin |
| POST | `/api/mail-action` | Proxy webhook n8n → Mail Agent |
| POST | `/api/meeting` | Proxy webhook n8n → Meeting Agent |
| POST | `/api/doc` | Proxy webhook n8n → Document Agent |
| GET/POST | `/api/meeting-history` | Historique réunions (SQLite) |
| GET/POST | `/api/doc-history` | Historique documents (SQLite) |
| GET/POST | `/api/conversations` | Toutes les conversations (SQLite) |
| GET/POST/DELETE | `/api/drafts` | Brouillons en mémoire |

> Les données sont persistées dans **SQLite** (`app.db`). Elles survivent aux redémarrages du conteneur grâce aux volumes Docker.

---

## Structure du projet

```
n8n-assistant/
├── src/
│   ├── api/
│   │   └── client.js              # Client HTTP centralisé
│   ├── pages/
│   │   ├── Dashboard.jsx          # Tableau de bord + statistiques
│   │   ├── MailAgent.jsx          # Agent email (IMAP + spam + rédaction)
│   │   ├── MeetingAgent.jsx       # Agent réunions (transcription + résumé)
│   │   ├── DocumentAgent.jsx      # Agent documents (PDF/Word + IA)
│   │   ├── CalendarAgent.jsx      # Agent agenda Google Calendar
│   │   ├── History.jsx            # Historique des conversations
│   │   ├── Profile.jsx            # Profil utilisateur
│   │   ├── Login.jsx              # Page de connexion
│   │   └── Signup.jsx             # Page d'inscription
│   ├── components/
│   │   ├── Sidebar.jsx            # Navigation latérale
│   │   ├── Topbar.jsx             # Barre supérieure
│   │   ├── ChatArea.jsx           # Interface de chat générique
│   │   ├── ChatInput.jsx          # Saisie de message
│   │   ├── ChatMessage.jsx        # Affichage d'un message
│   │   ├── Toast.jsx              # Notifications temporaires
│   │   └── ui/                    # Composants réutilisables (Card, PageHeader…)
│   ├── data/
│   │   └── agents.js              # Configuration des agents IA
│   ├── hooks/                     # Hooks React (stats, spam, email, telegram…)
│   ├── styles/
│   │   └── global.css             # Design system (variables CSS, tokens)
│   ├── App.jsx                    # Routing principal
│   └── main.jsx                   # Point d'entrée React
├── server.js                      # Backend Express — API + proxy n8n
├── db.js                          # Schéma SQLite + helpers
├── Dockerfile                     # Image backend (Node.js + Express)
├── Dockerfile.frontend            # Image frontend (Vite build + Nginx)
├── nginx.conf                     # Config Nginx (proxy /api/ → backend)
├── docker-compose.yml             # Orchestration locale
├── .github/workflows/ci.yml       # Pipeline CI/CD GitHub Actions
├── .env.example                   # Template variables d'environnement
└── package.json
```

---

## Design system

- **Couleur d'accent** : Teal (`#0d9488`)
- **Fond** : Blanc + Slate-50
- **Sidebar** : Slate-900 (sombre)
- **Typographie** : Plus Jakarta Sans + IBM Plex Mono
- **Responsive** : Sidebar repliable sur mobile

---

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev:full` | Lance frontend + backend en parallèle |
| `npm run dev:api` | Lance uniquement le backend Express (port 3001) |
| `npm run dev:web` | Lance uniquement le frontend Vite (port 5173) |
| `npm run build` | Compile le frontend pour la production |
| `npm run preview` | Prévisualise le build de production |
