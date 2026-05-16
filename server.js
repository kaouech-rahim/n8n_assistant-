import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  dbAddLog, dbGetLogs,
  dbAddNotification, dbGetNotifications, dbMarkNotificationRead,
  dbAddMeetingHistory, dbGetMeetingHistory,
  dbAddDocHistory, dbGetDocHistory,
  dbGetTeam,
  dbGetMessages, dbAddMessage,
  dbCreateUser, dbFindUserByEmail, dbFindUserByToken,
  dbSetUserToken, dbUpdateUserProfile, dbUpdateUserFull,
  dbUpdateUserAvatar, dbGetUserPassword, dbUpdateUserPassword,
  dbClearUserToken,
  dbSaveConversation, dbGetConversations, dbGetConversation, dbDeleteConversation,
  dbSaveEmailResult, dbGetEmailResults, dbSaveSpamResult, dbGetSpamResults,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dir     = dirname(__filename);

const AVATAR_DIR = join(__dir, 'public', 'avatars');
try { mkdirSync(AVATAR_DIR, { recursive: true }) } catch {}

function hashPwd(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

dotenv.config();

const app = express();

const N8N_URL = process.env.N8N_URL || process.env.VITE_N8N_URL || 'http://localhost:5678';
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || `${N8N_URL}/webhook`;

/** Actions Mail Agent : proxy vers n8n (champs supplémentaires ignorés par workflows simples). */
const MAIL_ACTIONS = new Set([
  'generate',
  'validate',
  'refuse',
  'confirm_manual',
  'rewrite_assist',
]);

const MAX_ITEMS = 400;
const FETCH_TIMEOUT_MS = 45_000;

// Multer — stockage en mémoire, limite 500 MB (vidéo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Seuls les fichiers vidéo sont acceptés'));
  },
});

// Multer — avatars image, limite 5 MB
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (_req, file, cb) => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      cb(null, `${Date.now()}.${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images uniquement'));
  },
});

// Multer — documents PDF / DOCX, limite 50 MB
const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|docx)$/i.test(file.originalname);
    ok ? cb(null, true) : cb(new Error('Seuls les fichiers PDF et DOCX sont acceptés'));
  },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(join(__dir, 'public')));

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  try {
    const name     = safeString(req.body.name, '');
    const email    = safeString(req.body.email, '').toLowerCase();
    const password = safeString(req.body.password, '');
    if (!name || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });
    if (dbFindUserByEmail(email)) return res.status(409).json({ error: 'Adresse email déjà utilisée' });
    const salt  = crypto.randomBytes(16).toString('hex');
    const hash  = hashPwd(password, salt);
    const id    = dbCreateUser(name, email, hash, salt);
    const token = crypto.randomBytes(32).toString('hex');
    dbSetUserToken(id, token);
    res.json({ token, user: { id, name, email, role: 'Utilisateur' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const email    = safeString(req.body.email, '').toLowerCase();
    const password = safeString(req.body.password, '');
    const user = dbFindUserByEmail(email);
    if (!user || hashPwd(password, user.salt) !== user.password_hash)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const token = crypto.randomBytes(32).toString('hex');
    dbSetUserToken(user.id, token);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', (req, res) => {
  const user = dbFindUserByToken(req.headers['x-auth-token'] || '');
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  res.json(user);
});

app.patch('/api/auth/me', (req, res) => {
  const user = dbFindUserByToken(req.headers['x-auth-token'] || '');
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  const name = safeString(req.body.name, user.name);
  const role = safeString(req.body.role, user.role);
  const bio  = safeString(req.body.bio,  user.bio || '');
  dbUpdateUserFull(user.id, name, role, bio);
  res.json({ success: true, user: { ...user, name, role, bio } });
});

app.post('/api/auth/avatar', avatarUpload.single('avatar'), (req, res) => {
  try {
    const user = dbFindUserByToken(req.headers['x-auth-token'] || '');
    if (!user) return res.status(401).json({ error: 'Non authentifié' });
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });
    const avatar = `/uploads/avatars/${req.file.filename}`;
    dbUpdateUserAvatar(user.id, avatar);
    res.json({ success: true, avatar });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/change-password', (req, res) => {
  try {
    const user = dbFindUserByToken(req.headers['x-auth-token'] || '');
    if (!user) return res.status(401).json({ error: 'Non authentifié' });
    const oldPwd = safeString(req.body.oldPassword, '');
    const newPwd = safeString(req.body.newPassword, '');
    if (!oldPwd || !newPwd) return res.status(400).json({ error: 'Ancien et nouveau mot de passe requis' });
    if (newPwd.length < 8) return res.status(400).json({ error: 'Nouveau mot de passe trop court (8 caractères minimum)' });
    const stored = dbGetUserPassword(user.id);
    if (!stored || hashPwd(oldPwd, stored.salt) !== stored.password_hash)
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    const newSalt = crypto.randomBytes(16).toString('hex');
    dbUpdateUserPassword(user.id, hashPwd(newPwd, newSalt), newSalt);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  dbClearUserToken(req.headers['x-auth-token'] || '');
  res.json({ success: true });
});

// ─── Journal système + middleware HTTP ─────────────────────────────────────────

let systemLogs = [];

function addLog(level, message, details = {}) {
  const log = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
  systemLogs.unshift(log);
  if (systemLogs.length > MAX_ITEMS) systemLogs.length = MAX_ITEMS;
  dbAddLog(log.id, log.timestamp, level, message, details);
  console.log(`[${level.toUpperCase()}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    addLog('info', `${req.method} ${req.path}`, {
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});

// ─── Stockage mémoire (production : remplacer par Redis/DB) ───────────────────

let spamResults  = dbGetSpamResults(500);
let emailResults = dbGetEmailResults(500);
let telegramEvents = [];
let adminNotifications = [];
let mailDrafts = [];
let meetingHistoryStore = [];
let docHistoryStore = [];

// Meeting async results — n8n pousse résumé + tâches séparément après traitement
let meetingResumeStore = null;  // { data: string, receivedAt: number }
let meetingTachesStore = null;  // { data: string, receivedAt: number }

function cap(arr) {
  if (arr.length > MAX_ITEMS) arr.length = MAX_ITEMS;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchN8n(pathSuffix, body) {
  const url = `${N8N_WEBHOOK_BASE}${pathSuffix}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const n8nResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await n8nResponse.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!n8nResponse.ok) {
      const msg = data?.message || data?.error || text || `HTTP ${n8nResponse.status}`;
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data ?? {};
  } finally {
    clearTimeout(t);
  }
}

function safeString(v, fallback = '') {
  if (v === undefined || v === null) return fallback;
  return String(v).trim();
}

// ─── WORKFLOW 1 : Spam / classification ─────────────────────────────────────

app.post('/api/spam-results', (req, res) => {
  try {
    const b = req.body;

    // Normalise les noms de champs (n8n peut envoyer from/subject/score/verdict…)
    const expediteur = safeString(b.expediteur || b.from || b.sender || b.from_address || b.email);
    const objet      = safeString(b.objet || b.subject || b.titre || b.title);
    const score_raw  = b.score_confiance ?? b.score ?? b.confidence ?? b.probability ?? null;
    const score_confiance = score_raw !== null ? parseFloat(score_raw) : null;

    // Normalise la classification (spam/ham, oui/non, true/false, 1/0)
    const rawClass = String(b.classification || b.verdict || b.label || b.is_spam || '').toLowerCase();
    const classification =
      ['spam', 'oui', 'true', '1', 'yes'].includes(rawClass) ? 'spam' : 'ham';

    const result = {
      ...b,
      expediteur:       expediteur || b.expediteur || '',
      objet:            objet      || b.objet      || '',
      classification,
      score_confiance,
      receivedAt: b.receivedAt || b.date_reception || new Date().toISOString(),
    };

    spamResults.unshift(result);
    cap(spamResults);
    dbSaveSpamResult(result);
    addLog('info', `Classification reçue: ${classification}`, {
      expediteur,
      score: score_confiance,
    });
    res.json({ success: true });
  } catch (error) {
    addLog('error', 'Échec traitement spam-results', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/spam-results', (_req, res) => {
  try {
    const sorted = [...spamResults].sort(
      (a, b) =>
        new Date(b.date_reception || b.receivedAt) -
        new Date(a.date_reception || a.receivedAt)
    );
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── WORKFLOW 2 : Boîte IMAP / emails classifiés ──────────────────────────────

app.post('/api/email-results', (req, res) => {
  try {
    const b = req.body;

    // Normalise les noms de champs — n8n peut envoyer from/subject/body/text…
    const expediteur = safeString(
      b.expediteur || b.from || b.sender || b.from_address || b.email_from || b.mail_from
    , 'inconnu');

    const objet = safeString(
      b.objet || b.subject || b.titre || b.title || b.mail_subject
    , '(Sans objet)');

    const contenu = safeString(
      b.contenu || b.body || b.text || b.html || b.content || b.message || b.mail_body || b.snippet
    , '');

    const date_reception = safeString(
      b.date_reception || b.date || b.received_at || b.timestamp || b.sent_at || b.mail_date
    , '');

    const categorie = safeString(
      b.categorie || b.category || b.label || b.folder || b.tag
    , '');

    // Normalise l'importance (accepte haute/high/urgent/1/2/3 et variantes)
    const rawImp = String(b.importance || b.priority || b.priorite || '').trim().toLowerCase();
    const importance =
      ['haute', 'high', 'urgent', 'critical', 'élevée', 'elevee', '3', 'haut'].includes(rawImp) ? 'haute' :
      ['moyenne', 'medium', 'normal', 'moderate', 'modérée', 'moderee', '2', 'moyen'].includes(rawImp) ? 'moyenne' :
      ['faible', 'low', 'minor', 'basse', '1', 'bas'].includes(rawImp) ? 'faible' :
      rawImp ? 'faible' : 'faible';

    // Normalise spam (true/false/1/0/oui/non/yes/no)
    const rawSpam = String(b.spam || b.is_spam || b.isSpam || '').toLowerCase();
    const spam = ['oui', 'true', '1', 'yes', 'spam'].includes(rawSpam) ? 'oui' : 'non';

    const result = {
      email_id:       safeString(b.email_id || b.id || b.uid || b.message_id, String(Date.now())),
      expediteur,
      objet,
      contenu,
      importance,
      spam,
      date_reception,
      receivedAt:     new Date().toISOString(),
      status:         spam === 'oui' ? 'spam' : 'inbox',
      categorie,
      extractions:    b.extractions && typeof b.extractions === 'object' ? b.extractions : undefined,
    };

    const index = emailResults.findIndex((e) => e.email_id === result.email_id);
    if (index !== -1) emailResults[index] = result;
    else emailResults.unshift(result);
    cap(emailResults);
    dbSaveEmailResult(result);

    addLog('info', `Email IMAP traité: ${result.expediteur}`, {
      importance: result.importance,
      spam: result.spam,
      categorie: result.categorie || undefined,
    });
    res.json({ success: true, email_id: result.email_id, expediteur, objet });
  } catch (error) {
    addLog('error', 'Échec email-results', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── AI GEN : reçoit la réponse générée par n8n ──────────────────────────────
// n8n POST http://host.docker.internal:3001/api/ai_gen  { reponse: "..." }

let aiGenResults = [];

app.post('/api/ai_gen', (req, res) => {
  const reponse = safeString(
    req.body.reponse || req.body.response || req.body.reply ||
    req.body.text    || req.body.message  || req.body.output
  );
  const entry = {
    id:         Date.now(),
    reponse,
    receivedAt: new Date().toISOString(),
  };
  aiGenResults.unshift(entry);
  if (aiGenResults.length > 50) aiGenResults.length = 50;
  addLog('info', `AI gen reçue (${reponse.length} chars)`);
  res.json({ success: true });
});

// GET /api/ai_gen?since=<timestamp_ms>  → renvoie les entrées plus récentes que since
app.get('/api/ai_gen', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since, 10) : 0;
  const results = since
    ? aiGenResults.filter(r => r.id > since)
    : aiGenResults.slice(0, 1);
  res.json(results);
});

// ─── MEETING ASYNC RESULTS (n8n → backend) ───────────────────────────────────
// n8n POST /api/resumer_gen  { resumé: "<html>" }   après traitement du résumé
// n8n POST /api/tache_gen    { reponse: "<html>" }  après traitement des tâches
// Frontend GET /api/meeting-result?since=<ts>       pour poll les deux résultats

app.post('/api/resumer_gen', (req, res) => {
  try {
    const data = safeString(
      req.body.resumé || req.body.resume || req.body.resumer ||
      req.body.text   || req.body.output || req.body.content
    );
    meetingResumeStore = { data, receivedAt: Date.now() };
    addLog('info', `meeting résumé reçu (${data.length} chars)`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tache_gen', (req, res) => {
  try {
    const data = safeString(
      req.body.reponse || req.body.taches || req.body.tasks ||
      req.body.text    || req.body.output || req.body.content
    );
    meetingTachesStore = { data, receivedAt: Date.now() };
    addLog('info', `meeting tâches reçues (${data.length} chars)`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/meeting-result', (req, res) => {
  const since    = parseInt(req.query.since || '0', 10);
  const hasResume = meetingResumeStore && meetingResumeStore.receivedAt > since;
  const hasTaches = meetingTachesStore && meetingTachesStore.receivedAt > since;
  if (!hasResume && !hasTaches) return res.json(null);
  res.json({
    resume:   hasResume ? meetingResumeStore.data : null,
    taches:   hasTaches ? meetingTachesStore.data : null,
    complete: hasResume && hasTaches,
  });
});

// ─── DEBUG : capture le payload brut envoyé par n8n ──────────────────────────

let debugPayloads = [];

app.post('/api/debug-webhook', (req, res) => {
  const entry = {
    receivedAt: new Date().toISOString(),
    headers: req.headers,
    body: req.body,
    keys: Object.keys(req.body || {}),
  };
  debugPayloads.unshift(entry);
  if (debugPayloads.length > 10) debugPayloads.length = 10;
  console.log('[DEBUG-WEBHOOK] Payload reçu:', JSON.stringify(req.body, null, 2));
  addLog('info', 'debug-webhook: payload capturé', { keys: entry.keys });
  res.json({ success: true, keys: entry.keys, body: entry.body });
});

app.get('/api/debug-webhook', (_req, res) => {
  res.json(debugPayloads);
});

app.get('/api/email-results', (req, res) => {
  try {
    const { spam, importance, categorie } = req.query;
    let results = [...emailResults];
    if (spam !== undefined) results = results.filter((e) => e.spam === spam);
    if (importance !== undefined) results = results.filter((e) => e.importance === importance);
    if (categorie !== undefined) results = results.filter((e) => e.categorie === categorie);
    results.sort(
      (a, b) =>
        new Date(b.date_reception || b.receivedAt) - new Date(a.date_reception || a.receivedAt)
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Telegram (workflow n8n → backend) ──────────────────────────────────────

app.post('/api/telegram-events', (req, res) => {
  try {
    const evt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      receivedAt: new Date().toISOString(),
      ...req.body,
    };
    telegramEvents.unshift(evt);
    cap(telegramEvents);
    addLog('info', `Événement Telegram: ${evt.type || evt.event || 'message'}`, {
      chat_id: evt.chat_id,
      from: evt.from?.username || evt.user_id,
    });
    res.json({ success: true, id: evt.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/telegram-events', (_req, res) => {
  res.json(telegramEvents);
});

// ─── Notifications administrateur (n8n → app) ─────────────────────────────────

app.post('/api/admin-notifications', (req, res) => {
  try {
    const n = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      read: false,
      receivedAt: new Date().toISOString(),
      ...req.body,
    };
    adminNotifications.unshift(n);
    cap(adminNotifications);
    dbAddNotification(n);
    addLog('warn', `Notification admin: ${n.title || n.message || 'sans titre'}`, {});
    res.json({ success: true, id: n.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin-notifications', (_req, res) => {
  try {
    res.json(dbGetNotifications());
  } catch {
    res.json(adminNotifications);
  }
});

app.patch('/api/admin-notifications/:id/read', (req, res) => {
  dbMarkNotificationRead(req.params.id);
  const item = adminNotifications.find((x) => x.id === req.params.id);
  if (item) item.read = true;
  res.json({ success: true });
});

// ─── Brouillons mail (serveur — conforme consigne sans localStorage) ───────────

app.get('/api/drafts', (_req, res) => {
  res.json(mailDrafts);
});

app.post('/api/drafts', (req, res) => {
  try {
    const { content, email_id, title } = req.body;
    const text = safeString(content, '');
    if (!text) return res.status(400).json({ error: 'content requis' });
    const draft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: safeString(title, text.slice(0, 80)),
      content: text,
      email_id: safeString(email_id, ''),
      updatedAt: new Date().toISOString(),
    };
    mailDrafts.unshift(draft);
    cap(mailDrafts);
    addLog('info', 'Brouillon mail enregistré', { id: draft.id });
    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/drafts/:id', (req, res) => {
  const before = mailDrafts.length;
  mailDrafts = mailDrafts.filter((d) => d.id !== req.params.id);
  if (mailDrafts.length === before) return res.status(404).json({ error: 'Introuvable' });
  res.json({ success: true });
});

// ─── DOC SUMMARY + DOC ANSWER (n8n → backend → frontend polling) ─────────────
// n8n POST /api/doc-summary { type, session_id, file_name?, resume }
//   type:"summary" → docSummaryStore  (après indexation du document)
//   type:"answer"  → docAnswerStore   (après réponse Q&A)
// Browser GET /api/doc-summary?session_id=<id>&since=<ts>
// Browser GET /api/doc-answer?session_id=<id>&since=<ts>

let docSummaryStore = {};
let latestDocSummary = null;
let docAnswerStore  = {};
let latestDocAnswer = null;

app.post('/api/doc-summary', (req, res) => {
  try {
    const type = safeString(req.body.type, 'summary');

    if (type === 'answer') {
      const session_id = safeString(req.body.session_id, 'default-session');
      const answer     = safeString(req.body.resume || req.body.answer || req.body.text || req.body.output, '');
      const entry = { session_id, answer, receivedAt: Date.now() };
      docAnswerStore[session_id] = entry;
      latestDocAnswer = entry;
      addLog('info', `doc-answer reçu — session "${session_id}"`, { len: answer.length });
      return res.json({ success: true });
    }

    // type === 'summary' (default)
    const session_id = safeString(req.body.session_id, 'default-session');
    const file_name  = safeString(req.body.file_name, 'document');
    const summary    = safeString(req.body.resume || req.body.summary || req.body.text || req.body.content, '');
    const entry = { session_id, file_name, summary, receivedAt: Date.now() };
    docSummaryStore[session_id] = entry;
    latestDocSummary = entry;
    addLog('info', `doc-summary reçu — session "${session_id}"`, { file: file_name, len: summary.length });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/doc-summary', (req, res) => {
  const since      = parseInt(req.query.since || '0', 10);
  const session_id = safeString(req.query.session_id, '');
  const exact = session_id ? docSummaryStore[session_id] : null;
  if (exact && exact.receivedAt > since) return res.json(exact);
  if (latestDocSummary && latestDocSummary.receivedAt > since) {
    addLog('info', `doc-summary fallback — session reçue "${latestDocSummary.session_id}" vs demandée "${session_id}"`);
    return res.json(latestDocSummary);
  }
  res.json(null);
});

app.get('/api/doc-answer', (req, res) => {
  const since      = parseInt(req.query.since || '0', 10);
  const session_id = safeString(req.query.session_id, '');
  const exact = session_id ? docAnswerStore[session_id] : null;
  if (exact && exact.receivedAt > since) return res.json(exact);
  if (latestDocAnswer && latestDocAnswer.receivedAt > since) return res.json(latestDocAnswer);
  res.json(null);
});

// ─── Historiques Meeting / Doc (session serveur) ──────────────────────────────

app.get('/api/meeting-history', (_req, res) => {
  try { res.json(dbGetMeetingHistory()); } catch { res.json(meetingHistoryStore); }
});

app.post('/api/meeting-history', (req, res) => {
  try {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      savedAt: new Date().toISOString(),
      transcription: safeString(req.body.transcription || req.body.fileName, '(sans titre)'),
      result: req.body.result || null,
    };
    meetingHistoryStore.unshift(item);
    cap(meetingHistoryStore);
    dbAddMeetingHistory(item);
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/doc-history', (_req, res) => {
  try { res.json(dbGetDocHistory()); } catch { res.json(docHistoryStore); }
});

app.post('/api/doc-history', (req, res) => {
  try {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      savedAt: new Date().toISOString(),
      question: safeString(req.body.question, ''),
      session_id: safeString(req.body.session_id, ''),
      result: req.body.result || null,
    };
    if (!item.question || !item.session_id) {
      return res.status(400).json({ error: 'question et session_id requis' });
    }
    docHistoryStore.unshift(item);
    cap(docHistoryStore);
    dbAddDocHistory(item);
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── CONVERSATIONS (historique complet) ──────────────────────────────────────

app.get('/api/conversations', (req, res) => {
  try {
    const agent = safeString(req.query.agent, '');
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const seen = new Set();
    const result = [];

    // 1 — conversations table (explicit saves)
    for (const c of dbGetConversations(agent || undefined, 200)) {
      seen.add(c.id);
      result.push(c);
    }

    // 2 — meeting_history (fallback for existing data)
    if (!agent || agent === 'meeting') {
      for (const m of dbGetMeetingHistory()) {
        const id = `meeting-${m.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const msgs = [
          { role: 'user', kind: 'file', text: m.transcription || 'Vidéo', ts: new Date(m.savedAt).getTime() },
        ];
        if (m.result?.resume) msgs.push({ role: 'bot', kind: 'resume', html: m.result.resume, ts: new Date(m.savedAt).getTime() + 1000 });
        if (m.result?.taches) msgs.push({ role: 'bot', kind: 'taches', html: m.result.taches, ts: new Date(m.savedAt).getTime() + 2000 });
        result.push({ id, agent: 'meeting', title: (m.transcription || 'Réunion').slice(0, 80), messages: msgs, savedAt: m.savedAt });
      }
    }

    // 3 — doc_history grouped by session_id (fallback for existing data)
    if (!agent || agent === 'document') {
      const bySession = {};
      for (const d of dbGetDocHistory()) {
        (bySession[d.session_id] = bySession[d.session_id] || []).push(d);
      }
      for (const [sid, items] of Object.entries(bySession)) {
        const id = `doc-${sid}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const sorted = [...items].sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
        const msgs = [];
        for (const d of sorted) {
          msgs.push({ role: 'user', kind: 'text', text: d.question, ts: new Date(d.savedAt).getTime() });
          if (d.result !== null && d.result !== undefined) {
            const html = (typeof d.result === 'string' ? d.result : JSON.stringify(d.result)).replace(/\n/g, '<br>');
            msgs.push({ role: 'bot', kind: 'text', html, ts: new Date(d.savedAt).getTime() + 500 });
          }
        }
        result.push({
          id,
          agent: 'document',
          title: sorted[0]?.question?.slice(0, 60) || 'Document',
          messages: msgs,
          savedAt: sorted[sorted.length - 1]?.savedAt || sorted[0]?.savedAt,
        });
      }
    }

    // 4 — email_results (each email is a mail conversation)
    if (!agent || agent === 'mail') {
      for (const e of dbGetEmailResults(200)) {
        const id = `mail-${e.email_id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const isSpam = e.spam === 'oui' || e.classification === 'spam';
        const msgs = [
          {
            role: 'user', kind: 'text',
            text: `De : ${e.expediteur || 'Inconnu'}\nObjet : ${e.objet || '(Sans objet)'}${e.contenu ? `\n\n${e.contenu.slice(0, 300)}` : ''}`,
            ts: new Date(e.receivedAt || e.date_reception).getTime(),
          },
          {
            role: 'bot', kind: 'text',
            html: `<strong>Statut :</strong> ${isSpam ? '🚫 Spam' : '✅ Légitime'}<br><strong>Importance :</strong> ${e.importance || 'faible'}${e.categorie ? `<br><strong>Catégorie :</strong> ${e.categorie}` : ''}${e.extractions ? `<br><strong>Extractions :</strong> ${JSON.stringify(e.extractions)}` : ''}`,
            ts: new Date(e.receivedAt || e.date_reception).getTime() + 500,
          },
        ];
        result.push({
          id,
          agent: 'mail',
          title: `${e.objet || '(Sans objet)'} — ${e.expediteur || 'Inconnu'}`,
          messages: msgs,
          savedAt: e.receivedAt || e.date_reception || new Date().toISOString(),
        });
      }
    }

    result.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    res.json(result.slice(0, limit));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/conversations/:id', (req, res) => {
  const conv = dbGetConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Non trouvé' });
  res.json(conv);
});

app.post('/api/conversations', (req, res) => {
  try {
    const agent    = safeString(req.body.agent, '');
    const title    = safeString(req.body.title, '');
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    if (!agent) return res.status(400).json({ error: 'agent requis' });
    // Accept optional deterministic id to avoid duplicates with meeting/doc history
    const id = safeString(req.body.id, '') || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dbSaveConversation(id, agent, title, messages);
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/conversations/:id', (req, res) => {
  const ok = dbDeleteConversation(req.params.id);
  res.json({ success: ok });
});

// ─── MAIL AGENT → n8n ─────────────────────────────────────────────────────────

app.post('/api/mail-action', async (req, res) => {
  try {
    const { action, email_id, draft_text, notes, manual_confirmation } = req.body;
    if (!action || !email_id) {
      return res.status(400).json({ error: 'action et email_id requis' });
    }
    if (!MAIL_ACTIONS.has(action)) {
      return res.status(400).json({
        error: `action invalide (autorisé: ${[...MAIL_ACTIONS].join(', ')})`,
      });
    }
    const payload = {
      action,
      email_id: safeString(email_id),
      draft_text: draft_text !== undefined ? String(draft_text) : undefined,
      notes: notes !== undefined ? String(notes) : undefined,
      manual_confirmation: Boolean(manual_confirmation),
    };
    const result = await fetchN8n('/mail-agent', payload);
    addLog('info', `Mail-agent n8n: ${action}`, { email_id: payload.email_id });
    res.json(result);
  } catch (error) {
    addLog('error', 'mail-action n8n', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ─── MEETING / DOC AGENTS ──────────────────────────────────────────────────────

// Upload vidéo → répond immédiatement au frontend, envoie à n8n en tâche de fond
app.post('/api/meeting-upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier vidéo requis (champ: video)' });

  const since = Date.now();

  // Répond tout de suite → le frontend commence à poller immédiatement
  res.json({ success: true, since });

  // Envoi à n8n en arrière-plan (fire & forget)
  const url      = `${N8N_WEBHOOK_BASE}/meeting-agent`;
  const formData = new FormData();
  formData.append(
    'video',
    new Blob([req.file.buffer], { type: req.file.mimetype }),
    req.file.originalname,
  );

  addLog('info', 'meeting-upload : envoi à n8n en cours…', {
    file:   req.file.originalname,
    sizeMB: (req.file.size / 1024 / 1024).toFixed(2),
  });

  fetch(url, { method: 'POST', body: formData })
    .then(r => addLog('info', `meeting-upload n8n → ${r.status}`, { file: req.file.originalname }))
    .catch(e => addLog('error', 'meeting-upload n8n forward', { error: e.message }));
});

// Maintenu pour compatibilité Telegram (chatId + messageId)
app.post('/api/meeting', async (req, res) => {
  try {
    const chatId    = req.body.chatId    ?? req.body.chat_id    ?? null;
    const messageId = req.body.messageId ?? req.body.message_id ?? null;
    if (!chatId || !messageId) {
      return res.status(400).json({ error: 'chatId et messageId requis' });
    }
    const since = Date.now();
    await fetchN8n('/meeting-agent', { chatId, messageId });
    addLog('info', 'meeting-agent déclenché (Telegram)', { chatId, messageId });
    res.json({ success: true, since });
  } catch (error) {
    addLog('error', 'meeting-agent', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Upload document → n8n (Webhook → Respond to Webhook immédiat)
app.post('/api/doc-upload', (req, res) => {
  docUpload.single('document')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Fichier requis (PDF ou DOCX)' });

    const session_id = safeString(req.body.session_id) || `doc-${Date.now()}`;
    const url = `${N8N_WEBHOOK_BASE}/doc-upload`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append(
        'document',
        new Blob([req.file.buffer], { type: req.file.mimetype }),
        req.file.originalname,
      );
      formData.append('session_id', session_id);

      addLog('info', 'doc-upload: envoi vers n8n…', {
        file: req.file.originalname,
        sizeMB: (req.file.size / 1024 / 1024).toFixed(2),
        session_id,
      });

      const n8nRes = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
      clearTimeout(timer);
      const data = await n8nRes.json().catch(() => ({}));
      if (!n8nRes.ok) throw new Error(data?.message || data?.error || `n8n HTTP ${n8nRes.status}`);

      const since = Date.now();
      addLog('info', 'doc-upload: fichier reçu par n8n', { file: req.file.originalname, session_id });
      res.json({
        success: true,
        session_id,
        fileName: req.file.originalname,
        message: data.message || 'Document reçu, traitement en cours…',
        since,
      });
    } catch (e) {
      clearTimeout(timer);
      addLog('error', 'doc-upload', { error: e.message });
      const isTimeout = e.name === 'AbortError';
      res.status(502).json({
        error: isTimeout
          ? 'n8n ne répond pas (timeout). Activez le workflow DOC Agent dans n8n.'
          : e.message,
      });
    }
  });
});

// Q&A documentaire → n8n webhook doc-message (async — répond immédiatement)
// n8n traite la question et pousse la réponse sur POST /api/doc-summary (type:"answer")
app.post('/api/doc', async (req, res) => {
  try {
    const question   = safeString(req.body.question, '');
    const session_id = safeString(req.body.session_id, '');
    if (!question || !session_id) {
      return res.status(400).json({ error: 'question et session_id requis' });
    }
    const since = Date.now();
    const url = `${N8N_WEBHOOK_BASE}/doc-message`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const n8nRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await n8nRes.json().catch(() => ({}));
      if (!n8nRes.ok) throw new Error(data?.message || data?.error || `n8n HTTP ${n8nRes.status}`);
      addLog('info', 'doc Q&A envoyé à n8n (doc-message)', { session_id, qlen: question.length });
      res.json({ success: true, since });
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  } catch (error) {
    addLog('error', 'doc Q&A (doc-message)', { error: error.message });
    const isTimeout = error.name === 'AbortError';
    res.status(502).json({
      error: isTimeout
        ? 'n8n timeout. Activez le workflow DOC Agent dans n8n.'
        : error.message,
    });
  }
});

// ─── GOOGLE CALENDAR AGENT ────────────────────────────────────────────────────

// Store pour les résultats poussés par n8n (GET events)
let calendarResultStore = null; // { events: [], intent: string, receivedAt: number }

// Toutes les actions passent par un seul webhook n8n /calendar-action
// Le champ "intent" (= action) route dans Switch3 du workflow
app.post('/api/calendar-action', async (req, res) => {
  const { action, ...payload } = req.body;
  if (!action) return res.status(400).json({ error: 'action requis (create|update|delete|get)' });
  const since = Date.now();
  try {
    // n8n respond immediately {success:true} then processes async
    const result = await fetchN8n('/calendar-action', { intent: action, ...payload });
    addLog('info', `calendar-action: ${action}`, { action });
    res.json({ success: true, since, ...result });
  } catch (error) {
    addLog('error', `calendar-action: ${action}`, { error: error.message });
    res.status(502).json({ error: error.message });
  }
});

// n8n HTTP Request node POSTs events here after Get many events3
app.post('/api/calendar-result', (req, res) => {
  const events = Array.isArray(req.body) ? req.body
    : Array.isArray(req.body?.events) ? req.body.events
    : [];
  calendarResultStore = { events, intent: req.body?.intent || 'get', receivedAt: Date.now() };
  addLog('info', 'calendar-result reçu', { count: events.length });
  res.json({ success: true });
});

// Frontend polls here (same since-based pattern as meeting agent)
app.get('/api/calendar-result', (req, res) => {
  const since = parseInt(req.query.since) || 0;
  if (calendarResultStore && calendarResultStore.receivedAt > since) {
    return res.json(calendarResultStore);
  }
  res.json(null);
});

// ─── Statistiques agrégées ─────────────────────────────────────────────────────

app.get('/api/stats', (_req, res) => {
  try {
    const totalClassified = spamResults.length;
    const spamCount = spamResults.filter((r) => r.classification === 'spam').length;
    const nonSpamCount = spamResults.filter((r) => r.classification === 'non-spam').length;
    const avgConfidence =
      totalClassified > 0
        ? Math.round(
            spamResults.reduce((sum, r) => sum + (Number(r.score_confiance) || 0), 0) /
              totalClassified
          )
        : 0;

    const inboxTotal = emailResults.length;
    const inboxSpam = emailResults.filter((e) => e.spam === 'oui').length;
    const importanceHigh = emailResults.filter((e) => e.importance === 'haute').length;

    const recentActivity = [];

    for (const r of spamResults.slice(0, 5)) {
      const at = new Date(r.receivedAt || r.date_reception || Date.now()).toISOString();
      recentActivity.push({
        type: 'classification',
        message:
          r.classification === 'spam'
            ? `Spam détecté : ${r.objet || '(sans objet)'}`
            : `Message légitime : ${r.objet || '(sans objet)'}`,
        at,
        time: new Date(at).toLocaleString('fr-FR'),
      });
    }
    for (const e of emailResults.slice(0, 3)) {
      const at = new Date(e.receivedAt || e.date_reception || Date.now()).toISOString();
      recentActivity.push({
        type: 'inbox',
        message: `Boîte IMAP — ${e.expediteur} · ${e.importance}`,
        at,
        time: new Date(at).toLocaleString('fr-FR'),
      });
    }
    for (const t of telegramEvents.slice(0, 3)) {
      const at = new Date(t.receivedAt || Date.now()).toISOString();
      recentActivity.push({
        type: 'telegram',
        message: t.summary || t.text?.slice?.(0, 120) || 'Événement Telegram',
        at,
        time: new Date(at).toLocaleString('fr-FR'),
      });
    }

    recentActivity.sort((a, b) => new Date(b.at) - new Date(a.at));

    res.json({
      classification: {
        total: totalClassified,
        spam: spamCount,
        nonSpam: nonSpamCount,
        avgConfidence,
      },
      inbox: {
        total: inboxTotal,
        spam: inboxSpam,
        highImportance: importanceHigh,
      },
      telegram: { events: telegramEvents.length },
      admin: { unread: adminNotifications.filter((n) => !n.read).length },
      recentActivity: recentActivity.slice(0, 12),
      chart: {
        spam: spamCount,
        nonSpam: nonSpamCount,
        inboxSpam,
        inboxClean: Math.max(0, inboxTotal - inboxSpam),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Logs applicatifs ──────────────────────────────────────────────────────────

app.get('/api/logs', (req, res) => {
  try {
    const { level, limit = '80' } = req.query;
    const n = Math.min(500, Math.max(1, parseInt(limit, 10) || 80));
    res.json(dbGetLogs(level || null, n));
  } catch {
    const { level, limit = '80' } = req.query;
    let filtered = systemLogs;
    if (level) filtered = systemLogs.filter((log) => log.level === level);
    const n = Math.min(500, Math.max(1, parseInt(limit, 10) || 80));
    res.json(filtered.slice(0, n));
  }
});

// ── Team ──────────────────────────────────────────────────────────────────────

app.get('/api/team', (_req, res) => {
  try {
    res.json(dbGetTeam());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Messages (group chat + DMs) ───────────────────────────────────────────────

app.get('/api/messages', (req, res) => {
  try {
    const channel = safeString(req.query.channel, 'general');
    const since = parseInt(req.query.since || '0', 10);
    res.json(dbGetMessages(channel, since));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', (req, res) => {
  try {
    const channel = safeString(req.body.channel, 'general');
    const senderName = safeString(req.body.senderName, 'Inconnu');
    const senderEmail = safeString(req.body.senderEmail, '');
    const content = safeString(req.body.content, '');
    if (!content) return res.status(400).json({ error: 'content requis' });
    const msg = dbAddMessage(channel, senderName, senderEmail, content);
    addLog('info', `Message [${channel}] de ${senderName}`, { len: content.length });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Santé ─────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    n8nWebhookBase: N8N_WEBHOOK_BASE,
    uptime: process.uptime(),
  });
});

// ─── SPA fallback (production) ────────────────────────────────────────────────
// Serves the React build; must be AFTER all /api routes
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dir, 'dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(join(__dir, 'dist', 'index.html')));
}

// ─── Démarrage ─────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API — http://localhost:${PORT}`);
  console.log(`n8n webhook base: ${N8N_WEBHOOK_BASE}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
