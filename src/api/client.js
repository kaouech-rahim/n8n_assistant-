/**
 * Client API centralisé — toujours passer par le backend (jamais n8n direct).
 * En dev Vite, proxy `/api` → 3001 si VITE_API_URL est vide.
 */
const RAW_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_ROOT = RAW_BASE ? `${RAW_BASE}/api` : '/api';

async function parseError(response) {
  let msg = `${response.status} ${response.statusText}`;
  try {
    const j = await response.json();
    if (j.error) msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
    else if (j.message) msg = j.message;
  } catch {
    try {
      const t = await response.text();
      if (t) msg = t.slice(0, 200);
    } catch {
      /* ignore */
    }
  }
  return msg;
}

export async function apiGet(path) {
  const response = await fetch(`${API_ROOT}${path}`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function apiPost(path, body) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function apiDelete(path) {
  const response = await fetch(`${API_ROOT}${path}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function apiPatch(path) {
  const response = await fetch(`${API_ROOT}${path}`, { method: 'PATCH' });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function fetchSpamResults() {
  return apiGet('/spam-results');
}

export async function fetchEmailResults(query = {}) {
  const q = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) q.set(k, String(v));
  });
  const s = q.toString();
  return apiGet(`/email-results${s ? `?${s}` : ''}`);
}

export async function fetchStats() {
  return apiGet('/stats');
}

export async function fetchLogs(level, limit = 80) {
  const q = new URLSearchParams();
  if (level) q.set('level', level);
  q.set('limit', String(limit));
  return apiGet(`/logs?${q}`);
}

export async function fetchTelegramEvents() {
  return apiGet('/telegram-events');
}

export async function fetchAdminNotifications() {
  return apiGet('/admin-notifications');
}

export async function markAdminNotificationRead(id) {
  return apiPatch(`/admin-notifications/${encodeURIComponent(id)}/read`);
}

export async function fetchDrafts() {
  return apiGet('/drafts');
}

export async function saveDraft({ content, email_id, title }) {
  return apiPost('/drafts', { content, email_id, title });
}

export async function deleteDraft(id) {
  return apiDelete(`/drafts/${encodeURIComponent(id)}`);
}

export async function sendMailAction(payload) {
  return apiPost('/mail-action', payload);
}

export async function sendMeetingTranscription(transcription) {
  return apiPost('/meeting', { transcription });
}

export async function sendDocQuery(question, sessionId) {
  return apiPost('/doc', { question, session_id: sessionId });
}

export async function saveMeetingHistory(transcription, result) {
  return apiPost('/meeting-history', { transcription, result });
}

export async function fetchMeetingHistory() {
  return apiGet('/meeting-history');
}

export async function saveDocHistory(question, session_id, result) {
  return apiPost('/doc-history', { question, session_id, result });
}

export async function fetchDocHistory() {
  return apiGet('/doc-history');
}
