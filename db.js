import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dir, 'app.db');
// Ensure parent directory exists (needed when DB_PATH points to a Docker volume)
try { mkdirSync(dirname(DB_PATH), { recursive: true }) } catch {}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT DEFAULT 'Utilisateur',
    token TEXT UNIQUE,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL DEFAULT 'general',
    senderName TEXT NOT NULL,
    senderEmail TEXT DEFAULT '',
    content TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, id);

  CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT '',
    message TEXT DEFAULT '',
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    receivedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meeting_history (
    id TEXT PRIMARY KEY,
    savedAt TEXT NOT NULL,
    transcription TEXT DEFAULT '',
    result TEXT DEFAULT 'null'
  );

  CREATE TABLE IF NOT EXISTS doc_history (
    id TEXT PRIMARY KEY,
    savedAt TEXT NOT NULL,
    question TEXT NOT NULL,
    session_id TEXT NOT NULL,
    result TEXT DEFAULT 'null'
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent TEXT NOT NULL,
    title TEXT DEFAULT '',
    messages TEXT DEFAULT '[]',
    savedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent, savedAt);

  CREATE TABLE IF NOT EXISTS email_results (
    email_id TEXT PRIMARY KEY,
    receivedAt TEXT DEFAULT (datetime('now')),
    data TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS spam_results (
    email_id TEXT PRIMARY KEY,
    receivedAt TEXT DEFAULT (datetime('now')),
    data TEXT DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_email_results_at ON email_results(receivedAt DESC);
  CREATE INDEX IF NOT EXISTS idx_spam_results_at ON spam_results(receivedAt DESC);
`);

// Safe column migrations — SQLite throws if column already exists, we ignore that
try { db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''") } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''") } catch {}

const teamJsonPath = join(__dir, 'src', 'data', 'team.json');
if (existsSync(teamJsonPath)) {
  try {
    const team = JSON.parse(readFileSync(teamJsonPath, 'utf8'));
    const ins = db.prepare('INSERT OR IGNORE INTO team (name, email, role) VALUES (?, ?, ?)');
    db.transaction(members => { for (const m of members) ins.run(m.name, m.email, m.role || ''); })(team);
  } catch (e) {
    console.warn('[db] team seed failed:', e.message);
  }
}

// ── Logs ──────────────────────────────────────────────────────────────────────

const MAX_LOGS = 500;

export function dbAddLog(id, timestamp, level, message, details) {
  try {
    db.prepare(
      'INSERT OR IGNORE INTO system_logs (id, timestamp, level, message, details) VALUES (?, ?, ?, ?, ?)'
    ).run(id, timestamp, level, message, JSON.stringify(details ?? {}));
    db.prepare(
      `DELETE FROM system_logs WHERE id NOT IN (SELECT id FROM system_logs ORDER BY timestamp DESC LIMIT ${MAX_LOGS})`
    ).run();
  } catch { /* ignore write errors */ }
}

export function dbGetLogs(level, limit = 80) {
  const rows = level
    ? db.prepare('SELECT * FROM system_logs WHERE level = ? ORDER BY timestamp DESC LIMIT ?').all(level, limit)
    : db.prepare('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  return rows.map(r => ({ ...r, details: JSON.parse(r.details || '{}') }));
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function dbAddNotification(notif) {
  const { id, title, message, type, receivedAt } = notif;
  db.prepare(
    'INSERT OR IGNORE INTO notifications (id, title, message, type, receivedAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, title || '', message || '', type || 'info', receivedAt || new Date().toISOString());
}

export function dbGetNotifications() {
  return db.prepare('SELECT * FROM notifications ORDER BY receivedAt DESC LIMIT 100').all()
    .map(r => ({ ...r, read: r.read === 1 }));
}

export function dbMarkNotificationRead(id) {
  return db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id).changes > 0;
}

// ── Histories ─────────────────────────────────────────────────────────────────

export function dbAddMeetingHistory(item) {
  db.prepare(
    'INSERT OR IGNORE INTO meeting_history (id, savedAt, transcription, result) VALUES (?, ?, ?, ?)'
  ).run(item.id, item.savedAt, item.transcription || '', JSON.stringify(item.result ?? null));
}

export function dbGetMeetingHistory() {
  return db.prepare('SELECT * FROM meeting_history ORDER BY savedAt DESC LIMIT 200').all()
    .map(r => ({ ...r, result: JSON.parse(r.result || 'null') }));
}

export function dbAddDocHistory(item) {
  db.prepare(
    'INSERT OR IGNORE INTO doc_history (id, savedAt, question, session_id, result) VALUES (?, ?, ?, ?, ?)'
  ).run(item.id, item.savedAt, item.question, item.session_id, JSON.stringify(item.result ?? null));
}

export function dbGetDocHistory() {
  return db.prepare('SELECT * FROM doc_history ORDER BY savedAt DESC LIMIT 200').all()
    .map(r => ({ ...r, result: JSON.parse(r.result || 'null') }));
}

// ── Team ──────────────────────────────────────────────────────────────────────

export function dbGetTeam() {
  return db.prepare('SELECT id, name, email, role FROM team ORDER BY name ASC').all();
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function dbGetMessages(channel = 'general', since = 0) {
  return db.prepare(
    'SELECT * FROM messages WHERE channel = ? AND id > ? ORDER BY id ASC LIMIT 100'
  ).all(channel, since);
}

export function dbAddMessage(channel, senderName, senderEmail, content) {
  const r = db.prepare(
    'INSERT INTO messages (channel, senderName, senderEmail, content) VALUES (?, ?, ?, ?)'
  ).run(channel, senderName, senderEmail || '', content);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(r.lastInsertRowid);
}

// ── Users / Auth ──────────────────────────────────────────────────────────────

export function dbCreateUser(name, email, passwordHash, salt, role = 'Utilisateur') {
  return db.prepare(
    'INSERT INTO users (name, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, passwordHash, salt, role).lastInsertRowid;
}

export function dbFindUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function dbFindUserByToken(token) {
  if (!token) return null;
  return db.prepare('SELECT id, name, email, role, bio, avatar, createdAt FROM users WHERE token = ?').get(token);
}

export function dbSetUserToken(id, token) {
  db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, id);
}

export function dbUpdateUserProfile(id, name, role) {
  db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(name, role, id);
}

export function dbUpdateUserFull(id, name, role, bio) {
  db.prepare('UPDATE users SET name = ?, role = ?, bio = ? WHERE id = ?').run(name, role, bio || '', id);
}

export function dbUpdateUserAvatar(id, avatar) {
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, id);
}

export function dbGetUserPassword(id) {
  return db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(id);
}

export function dbUpdateUserPassword(id, hash, salt) {
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, id);
}

export function dbClearUserToken(token) {
  db.prepare('UPDATE users SET token = NULL WHERE token = ?').run(token);
}

// ── Conversations ──────────────────────────────────────────────────────────────

export function dbSaveConversation(id, agent, title, messages) {
  db.prepare(
    `INSERT OR REPLACE INTO conversations (id, agent, title, messages, savedAt)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(id, agent, title || '', JSON.stringify(messages || []));
}

export function dbGetConversations(agent, limit = 50) {
  const rows = agent
    ? db.prepare('SELECT * FROM conversations WHERE agent = ? ORDER BY savedAt DESC LIMIT ?').all(agent, limit)
    : db.prepare('SELECT * FROM conversations ORDER BY savedAt DESC LIMIT ?').all(limit);
  return rows.map(r => ({ ...r, messages: JSON.parse(r.messages || '[]') }));
}

export function dbGetConversation(id) {
  const r = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!r) return null;
  return { ...r, messages: JSON.parse(r.messages || '[]') };
}

export function dbDeleteConversation(id) {
  return db.prepare('DELETE FROM conversations WHERE id = ?').run(id).changes > 0;
}

// ── Email / Spam persistence ───────────────────────────────────────────────────

export function dbSaveEmailResult(result) {
  db.prepare(
    'INSERT OR REPLACE INTO email_results (email_id, receivedAt, data) VALUES (?, ?, ?)'
  ).run(result.email_id, result.receivedAt || new Date().toISOString(), JSON.stringify(result));
}

export function dbGetEmailResults(limit = 200) {
  return db.prepare('SELECT data FROM email_results ORDER BY receivedAt DESC LIMIT ?').all(limit)
    .map(r => JSON.parse(r.data));
}

export function dbSaveSpamResult(result) {
  const id = result.email_id || result.expediteur + result.receivedAt;
  db.prepare(
    'INSERT OR REPLACE INTO spam_results (email_id, receivedAt, data) VALUES (?, ?, ?)'
  ).run(id, result.receivedAt || new Date().toISOString(), JSON.stringify(result));
}

export function dbGetSpamResults(limit = 200) {
  return db.prepare('SELECT data FROM spam_results ORDER BY receivedAt DESC LIMIT ?').all(limit)
    .map(r => JSON.parse(r.data));
}

export default db;
