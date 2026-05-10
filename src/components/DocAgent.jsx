import React, { useState, useEffect, useCallback } from 'react';
import { sendDocQuery, saveDocHistory, fetchDocHistory } from '../api/client.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import {
  FileText,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  XCircle,
  History,
  Shuffle,
  Loader2,
} from 'lucide-react';

export default function DocAgent() {
  const [question, setQuestion] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await fetchDocHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addNotification = (type, message) => {
    setNotifications((prev) => [{ id: Date.now(), type, message }, ...prev].slice(0, 5));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    const sid = sessionId.trim();
    if (!q || !sid) {
      setError('Question et session requises.');
      addNotification('error', 'Champs manquants');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const response = await sendDocQuery(q, sid);
      setResult(response);
      await saveDocHistory(q, sid, response);
      await loadHistory();
      addNotification('success', 'Réponse enregistrée côté serveur');
      setQuestion('');
    } catch (err) {
      setError(err.message);
      addNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSessionId = () => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(id);
    addNotification('info', 'Nouvelle session générée');
  };

  const loadFromHistory = (item) => {
    setQuestion(item.question);
    setSessionId(item.session_id);
    setResult(item.result);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={FileText}
        title="Agent Documents"
        subtitle="Questions / réponses RAG sur vos fichiers (PDF, Word…) via n8n."
      />

      {notifications.length > 0 ? (
        <div className="mb-6 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-[var(--border-mid)] bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-primary)]"
            >
              {n.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Bonnes pratiques</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Réutilisez la même session pour des questions de suivi sur un même document.
              </li>
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Le lien Drive est renvoyé par le workflow si configuré.
              </li>
            </ul>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <History className="h-5 w-5 text-[var(--accent-text)]" />
              Historique serveur
            </h3>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {historyLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">Chargement…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Aucune entrée.</p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadFromHistory(item)}
                    className="w-full rounded-lg border border-[var(--border-mid)] bg-[var(--bg-secondary)] p-3 text-left text-sm hover:bg-[var(--bg-hover)]"
                  >
                    <p className="line-clamp-2 font-medium text-[var(--text-primary)]">{item.question}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {item.session_id.slice(0, 14)}… · {new Date(item.savedAt).toLocaleString('fr-FR')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Interrogation</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="sessionId" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Session
                </label>
                <div className="flex gap-2">
                  <input
                    id="sessionId"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Identifiant de session"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateSessionId}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border-mid)] bg-[var(--bg-secondary)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)]"
                  >
                    <Shuffle className="h-4 w-4" />
                    Générer
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="question" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Question
                </label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={5}
                  className="w-full resize-y rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Envoyer à n8n
              </button>
            </form>
          </Card>

          {error ? (
            <Card className="border-red-500/35 bg-red-500/5">
              <div className="flex gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
              </div>
            </Card>
          ) : null}

          {result ? (
            <div className="space-y-4">
              {result.reponse ? (
                <Card>
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                    <MessageSquare className="h-5 w-5 text-[var(--accent-text)]" />
                    Réponse
                  </h4>
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-primary)]">
                    {String(result.reponse)
                      .split('\n')
                      .map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                  </div>
                </Card>
              ) : null}
              {result.lien_drive ? (
                <Card>
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                    <ExternalLink className="h-5 w-5 text-emerald-600" />
                    Google Drive
                  </h4>
                  <a
                    href={result.lien_drive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    Ouvrir le fichier
                  </a>
                </Card>
              ) : null}
              {!result.reponse && !result.lien_drive ? (
                <Card>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
