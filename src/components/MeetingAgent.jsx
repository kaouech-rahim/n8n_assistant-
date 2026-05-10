import React, { useState, useEffect, useCallback } from 'react';
import { sendMeetingTranscription, saveMeetingHistory, fetchMeetingHistory } from '../api/client.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import { Video, FileText, CheckCircle, XCircle, History, Loader2 } from 'lucide-react';

export default function MeetingAgent() {
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await fetchMeetingHistory();
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
    setNotifications((prev) => [{ id: Date.now(), type, message, at: new Date() }, ...prev].slice(0, 5));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = transcription.trim();
    if (!text) {
      setError('Veuillez saisir une transcription.');
      addNotification('error', 'Transcription manquante');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const response = await sendMeetingTranscription(text);
      setResult(response);
      await saveMeetingHistory(text, response);
      await loadHistory();
      addNotification('success', 'Analyse enregistrée côté serveur');
      setTranscription('');
    } catch (err) {
      setError(err.message);
      addNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item) => {
    setTranscription(item.transcription);
    setResult(item.result);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={Video}
        title="Agent Réunions"
        subtitle="Compatible avec la chaîne Telegram → transcription Whisper → résumé / tâches (n8n)."
      />

      {notifications.length > 0 ? (
        <div className="mb-6 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                n.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Étapes typiques</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Réception média / message Telegram (workflow n8n).
              </li>
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Transcription (Whisper / Groq) puis envoi vers cet agent.
              </li>
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Résumé structuré et liste de tâches.
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
                <p className="text-sm text-[var(--text-secondary)]">Aucune analyse stockée.</p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadFromHistory(item)}
                    className="w-full rounded-lg border border-[var(--border-mid)] bg-[var(--bg-secondary)] p-3 text-left text-sm transition hover:bg-[var(--bg-hover)]"
                  >
                    <p className="line-clamp-2 text-[var(--text-primary)]">{item.transcription}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {new Date(item.savedAt).toLocaleString('fr-FR')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Transcription</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                rows={10}
                placeholder="Collez la transcription ou le texte issu de votre workflow…"
                className="w-full resize-y rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Envoyer à n8n
              </button>
            </form>
          </Card>

          {error ? (
            <Card className="border-red-500/35 bg-red-500/5">
              <div className="flex gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            </Card>
          ) : null}

          {result ? (
            <div className="space-y-4">
              {result.resume ? (
                <Card>
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                    <FileText className="h-5 w-5 text-[var(--accent-text)]" />
                    Résumé
                  </h4>
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-primary)]">
                    {String(result.resume)
                      .split('\n')
                      .filter(Boolean)
                      .map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                  </div>
                </Card>
              ) : null}
              {result.taches ? (
                <Card>
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    Tâches
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {String(result.taches)
                      .split('\n')
                      .filter((l) => l.trim())
                      .map((task, i) => (
                        <li
                          key={i}
                          className="flex gap-3 rounded-lg bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-primary)] ring-1 ring-[var(--border-light)]"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {task}
                        </li>
                      ))}
                  </ul>
                </Card>
              ) : null}
              {!result.resume && !result.taches ? (
                <Card>
                  <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Réponse brute</p>
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
