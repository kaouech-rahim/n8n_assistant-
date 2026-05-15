# n8n Assistant

Interface web fullstack pour l'automatisation intelligente via [n8n](https://n8n.io/), avec des agents IA spécialisés pour la gestion des emails, réunions, documents, Telegram et bien plus.

---

## Aperçu

n8n Assistant est une application React + Express qui agit comme un **orchestrateur centralisé** entre l'utilisateur et des workflows n8n. Elle expose 8 agents IA via une interface moderne, chacun connecté à des services externes (Gmail, Google Calendar, Google Drive, Telegram, etc.) via webhooks.

```
Navigateur (React)  →  Backend Express (localhost:3001)  →  n8n (webhooks)  →  Services externes
```

---

## Fonctionnalités

| Agent | Description |
|-------|-------------|
| **Tableau de bord** | Statistiques globales, journal d'activité, alertes admin |
| **Classification spam** | Détection et scoring des emails indésirables |
| **Boîte IMAP** | Consultation et filtrage des emails par importance/catégorie |
| **Mail Agent** | Rédaction et validation de réponses assistées par IA |
| **Telegram** | Flux d'événements et messages reçus |
| **Réunions** | Transcription automatique, résumé et points d'action |
| **Documents** | Analyse de PDF/Word, résumé et extraction de données |
| **Journal système** | Logs d'exécution, événements API et traces |

---

## Stack technique

### Frontend
- **React 18** — Interface utilisateur
- **Tailwind CSS v4** — Styles utilitaires
- **Vite 5** — Bundler et serveur de développement
- **Lucide React** — Icônes

### Backend
- **Express 5** — Serveur API / proxy vers n8n
- **dotenv** — Variables d'environnement
- **cors** — Gestion des origines croisées

### Outillage
- **concurrently** — Lancement simultané frontend + backend

---

## Prérequis

- **Node.js** 16 ou supérieur
- **npm** 7 ou supérieur
- Une instance **n8n** accessible (locale ou via tunnel ngrok)

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-repo>
cd n8n-assistant-main

# 2. Installer les dépendances
npm install
```

---

## Configuration

Créez ou éditez le fichier `.env` à la racine :

```env
# URL du backend Express (utilisée par le frontend)
VITE_API_URL=http://localhost:3001

# URL de l'instance n8n (utilisée par le frontend pour les liens directs)
VITE_N8N_URL=http://localhost:5678

# URL de base n8n pour les webhooks (utilisée par le backend)
N8N_URL=http://localhost:5678
N8N_WEBHOOK_BASE=http://localhost:5678/webhook
```

> Si vous utilisez ngrok pour exposer n8n publiquement, remplacez `N8N_WEBHOOK_BASE` par l'URL ngrok fournie (ex: `https://xxxx.ngrok-free.dev/webhook-test`).

---

## Lancement

### Mode développement complet (recommandé)

```bash
npm run dev:full
```

Lance en parallèle :
- Frontend Vite : [http://localhost:5173](http://localhost:5173)
- Backend Express : [http://localhost:3001](http://localhost:3001)

### Lancement séparé

```bash
# Terminal 1 — Backend API
npm run dev:api

# Terminal 2 — Frontend
npm run dev:web
```

### Build de production

```bash
npm run build      # Génère le dossier dist/
npm run preview    # Prévisualise le build produit
```

---

## Structure du projet

```
n8n-assistant-main/
├── src/
│   ├── api/
│   │   └── client.js           # Client HTTP centralisé vers le backend
│   ├── components/
│   │   ├── Dashboard.jsx        # Page d'accueil et statistiques
│   │   ├── MailAgent.jsx        # Agent email
│   │   ├── MeetingAgent.jsx     # Agent réunions
│   │   ├── DocAgent.jsx         # Agent documents
│   │   ├── EmailInbox.jsx       # Boîte IMAP
│   │   ├── SpamResults.jsx      # Classification spam
│   │   ├── TelegramFeed.jsx     # Flux Telegram
│   │   ├── ActivityLogs.jsx     # Journal système
│   │   ├── Sidebar.jsx          # Navigation latérale
│   │   ├── Topbar.jsx           # Barre supérieure
│   │   ├── ChatArea.jsx         # Interface de chat générique
│   │   ├── ChatInput.jsx        # Saisie de message
│   │   ├── ChatMessage.jsx      # Affichage d'un message
│   │   ├── Toast.jsx            # Notifications temporaires
│   │   └── ui/                  # Composants réutilisables (Card, PageHeader)
│   ├── data/
│   │   └── agents.js            # Configuration des agents IA
│   ├── hooks/
│   │   ├── useChat.js           # Logique de chat et appels webhooks n8n
│   │   ├── useStats.js          # Récupération des statistiques
│   │   ├── useSpamResults.js    # Résultats de classification
│   │   ├── useEmailResults.js   # Résultats IMAP
│   │   ├── useTelegramFeed.js   # Événements Telegram
│   │   └── useNotifications.js  # Notifications admin
│   ├── styles/
│   │   └── global.css           # Design system (variables CSS, tokens)
│   ├── App.jsx                  # Routing principal (8 onglets)
│   └── main.jsx                 # Point d'entrée React
├── server.js                    # Backend Express — 14 endpoints API
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── .env
```

---

## API Backend

Le backend Express (`server.js`) expose les endpoints suivants :

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Vérification de l'état du serveur |
| GET/POST | `/api/spam-results` | Résultats de classification spam |
| GET/POST | `/api/email-results` | Emails IMAP reçus |
| GET/POST | `/api/telegram-events` | Événements Telegram |
| GET/POST/PATCH | `/api/admin-notifications` | Notifications admin |
| POST | `/api/mail-action` | Proxy vers webhook n8n Mail Agent |
| POST | `/api/meeting` | Proxy vers webhook n8n Meeting Agent |
| POST | `/api/doc` | Proxy vers webhook n8n Doc Agent |
| GET/POST/DELETE | `/api/drafts` | Gestion des brouillons en mémoire |
| GET/POST | `/api/meeting-history` | Historique des réunions |
| GET/POST | `/api/doc-history` | Historique des analyses de documents |
| GET | `/api/stats` | Statistiques agrégées de tous les agents |
| GET | `/api/logs` | Journal des événements système |

> **Note** : Le stockage est en mémoire. Les données sont perdues au redémarrage du serveur.

---

## Mode démo

Si n8n est indisponible ou non configuré, le backend active automatiquement un **mode démo** qui retourne des réponses simulées. Cela permet de tester l'interface sans connexion à n8n.

---

## Design system

L'interface utilise un système de design cohérent défini dans `src/styles/global.css` :

- **Couleur d'accent** : Teal (`#0d9488`)
- **Fond** : Blanc + Slate-50
- **Sidebar** : Slate-900 (sombre)
- **Typographie** : Plus Jakarta Sans (sans-serif) + IBM Plex Mono (code)
- **Responsive** : Sidebar repliable sur mobile (breakpoint `md`)

---

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev:full` | Lance frontend + backend en parallèle |
| `npm run dev:api` | Lance uniquement le backend Express (port 3001) |
| `npm run dev:web` | Lance uniquement le frontend Vite (port 5173) |
| `npm run build` | Compile le frontend pour la production |
| `npm run preview` | Prévisualise le build de production |