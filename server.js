import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

app.use(cors());
app.use(express.json({ limit: '2mb' }));

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

let spamResults = [];
let emailResults = [];
let telegramEvents = [];
let adminNotifications = [];
let mailDrafts = [];
let meetingHistoryStore = [];
let docHistoryStore = [];

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
    const result = {
      ...req.body,
      receivedAt: req.body.receivedAt || new Date().toISOString(),
    };
    spamResults.unshift(result);
    cap(spamResults);
    addLog('info', `Classification reçue: ${result.classification || '?'}`, {
      email_id: result.email_id,
      expediteur: result.expediteur,
      score: result.score_confiance,
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
    const { email_id, expediteur, objet, contenu, importance, spam, date_reception, categorie, extractions } =
      req.body;

    const result = {
      email_id: safeString(email_id, String(Date.now())),
      expediteur: safeString(expediteur, 'inconnu'),
      objet: safeString(objet, '(Sans objet)'),
      contenu: safeString(contenu, ''),
      importance: ['haute', 'moyenne', 'faible'].includes(importance) ? importance : 'faible',
      spam: ['oui', 'non'].includes(spam) ? spam : 'non',
      date_reception: safeString(date_reception, ''),
      receivedAt: new Date().toISOString(),
      status: spam === 'oui' ? 'spam' : 'inbox',
      categorie: safeString(categorie, ''),
      extractions: extractions && typeof extractions === 'object' ? extractions : undefined,
    };

    const index = emailResults.findIndex((e) => e.email_id === result.email_id);
    if (index !== -1) emailResults[index] = result;
    else emailResults.unshift(result);
    cap(emailResults);

    addLog('info', `Email IMAP traité: ${result.expediteur}`, {
      importance: result.importance,
      spam: result.spam,
      categorie: result.categorie || undefined,
    });
    res.json({ success: true, email_id: result.email_id });
  } catch (error) {
    addLog('error', 'Échec email-results', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
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
    addLog('warn', `Notification admin: ${n.title || n.message || 'sans titre'}`, {});
    res.json({ success: true, id: n.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin-notifications', (_req, res) => {
  res.json(adminNotifications);
});

app.patch('/api/admin-notifications/:id/read', (req, res) => {
  const item = adminNotifications.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  item.read = true;
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

// ─── Historiques Meeting / Doc (session serveur) ──────────────────────────────

app.get('/api/meeting-history', (_req, res) => res.json(meetingHistoryStore));

app.post('/api/meeting-history', (req, res) => {
  try {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      savedAt: new Date().toISOString(),
      transcription: safeString(req.body.transcription, ''),
      result: req.body.result || null,
    };
    if (!item.transcription) return res.status(400).json({ error: 'transcription requise' });
    meetingHistoryStore.unshift(item);
    cap(meetingHistoryStore);
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/doc-history', (_req, res) => res.json(docHistoryStore));

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
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

app.post('/api/meeting', async (req, res) => {
  try {
    const transcription = safeString(req.body.transcription, '');
    if (!transcription) return res.status(400).json({ error: 'transcription requise' });
    const result = await fetchN8n('/meeting-agent', { transcription });
    res.json(result);
  } catch (error) {
    addLog('error', 'meeting-agent', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/doc', async (req, res) => {
  try {
    const question = safeString(req.body.question, '');
    const session_id = safeString(req.body.session_id, '');
    if (!question || !session_id) {
      return res.status(400).json({ error: 'question et session_id requis' });
    }
    const result = await fetchN8n('/doc-agent', { question, session_id });
    res.json(result);
  } catch (error) {
    addLog('error', 'doc-agent', { error: error.message });
    res.status(500).json({ error: error.message });
  }
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
    let filtered = systemLogs;
    if (level) filtered = systemLogs.filter((log) => log.level === level);
    const n = Math.min(500, Math.max(1, parseInt(limit, 10) || 80));
    res.json(filtered.slice(0, n));
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

// ─── Démarrage ─────────────────────────────────────────────────────────────────

app.listen(3001, '0.0.0.0', () => {
  console.log('Backend API — http://localhost:3001');
  console.log(`n8n webhook base: ${N8N_WEBHOOK_BASE}`);
  console.log('Routes: spam-results, email-results, telegram-events, admin-notifications, drafts, mail-action, meeting, doc, stats, logs');
});
