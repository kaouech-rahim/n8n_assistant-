import React, { useState, useEffect, useCallback } from 'react';
import { sendMailAction, fetchDrafts, saveDraft, deleteDraft } from '../api/client.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Bell,
  Save,
  Edit3,
  Loader2,
  Trash2,
} from 'lucide-react';

const ACTIONS = [
  {
    value: 'generate',
    label: 'Générer une réponse (brouillon IA)',
    description: 'Crée une proposition sans envoi définitif.',
  },
  {
    value: 'validate',
    label: 'Valider et envoyer',
    description: 'Confirme la réponse et déclenche l’envoi côté workflow.',
  },
  {
    value: 'refuse',
    label: 'Refuser / workflow de refus',
    description: 'Rejette la réponse générée et notifie selon votre scénario n8n.',
  },
  {
    value: 'confirm_manual',
    label: 'Confirmation manuelle',
    description: 'Marque qu’un humain valide explicitement (contrôle renforcé).',
  },
  {
    value: 'rewrite_assist',
    label: 'Aide à la rédaction',
    description: 'Affinage assisté par IA à partir du brouillon ci-dessous.',
  },
];

function ResultPanel({ data }) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-[var(--bg-secondary)] p-3 ring-1 ring-[var(--border-light)]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{k}</p>
          <p className="mt-1 break-words text-sm text-[var(--text-primary)]">
            {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function MailAgent() {
  const [emailId, setEmailId] = useState('');
  const [action, setAction] = useState('generate');
  const [draftText, setDraftText] = useState('');
  const [notes, setNotes] = useState('');
  const [manualConfirmation, setManualConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const loadDrafts = useCallback(async () => {
    try {
      setDraftsLoading(true);
      const list = await fetchDrafts();
      setDrafts(Array.isArray(list) ? list : []);
    } catch {
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const pushNotification = (type, message) => {
    setNotifications((prev) =>
      [{ id: Date.now(), type, message, at: new Date() }, ...prev].slice(0, 6)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = emailId.trim();
    if (!id) {
      setError("L'identifiant email est requis.");
      pushNotification('error', 'ID email manquant');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const response = await sendMailAction({
        action,
        email_id: id,
        draft_text: draftText.trim() || undefined,
        notes: notes.trim() || undefined,
        manual_confirmation: manualConfirmation,
      });
      setResult(response);
      pushNotification('success', `Action « ${action} » envoyée à n8n`);
    } catch (err) {
      setError(err.message);
      pushNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraftOnly = async () => {
    if (!draftText.trim()) return;
    try {
      await saveDraft({
        content: draftText.trim(),
        email_id: emailId.trim(),
        title: `Brouillon — ${emailId.trim() || 'sans id'}`,
      });
      pushNotification('success', 'Brouillon enregistré sur le serveur');
      await loadDrafts();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      await deleteDraft(draftId);
      await loadDrafts();
      pushNotification('success', 'Brouillon supprimé');
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={Mail}
        title="Mail Agent"
        subtitle="Workflow n8n : génération, validation, refus, confirmation manuelle et aide à la rédaction. Les brouillons sont stockés côté API (sans localStorage)."
      />

      {notifications.length > 0 ? (
        <div className="mb-6 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm motion-safe:animate-[slideInRight_0.35s_ease-out_both] ${
                n.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
                  : n.type === 'error'
                    ? 'border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-100'
                    : 'border-[var(--border-mid)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
              }`}
            >
              {n.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : null}
              {n.type === 'error' ? <XCircle className="h-4 w-4 shrink-0" /> : null}
              {n.type !== 'success' && n.type !== 'error' ? <Bell className="h-4 w-4 shrink-0" /> : null}
              <span className="flex-1">{n.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Couverture fonctionnelle</h3>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                IMAP, anti-spam et classification automatique (via n8n).
              </li>
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Brouillon IA, validation, refus et confirmation manuelle.
              </li>
              <li className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Emails de confirmation et notifications Telegram gérés dans vos workflows.
              </li>
            </ul>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <FileText className="h-5 w-5 text-[var(--accent-text)]" />
              Brouillons serveur ({drafts.length})
            </h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Persistance mémoire — à brancher sur une base en production.
            </p>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {draftsLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">Chargement…</p>
              ) : drafts.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Aucun brouillon enregistré.</p>
              ) : (
                drafts.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-[var(--border-mid)] bg-[var(--bg-secondary)] p-3"
                  >
                    <p className="line-clamp-3 text-sm text-[var(--text-primary)]">{d.content}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {new Date(d.updatedAt).toLocaleString('fr-FR')}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftText(d.content);
                            if (d.email_id) setEmailId(d.email_id);
                          }}
                          className="text-xs font-medium text-[var(--accent-text)] hover:underline"
                        >
                          Charger
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(d.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Actions vers n8n</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="emailId" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  ID email
                </label>
                <input
                  id="emailId"
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  placeholder="Identifiant connu du workflow (email_id)"
                  className="w-full rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label htmlFor="action" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Action
                </label>
                <select
                  id="action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                  {ACTIONS.find((a) => a.value === action)?.description}
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-[var(--bg-secondary)] p-3 ring-1 ring-[var(--border-light)]">
                <input
                  id="manual"
                  type="checkbox"
                  checked={manualConfirmation}
                  onChange={(e) => setManualConfirmation(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--border-mid)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <label htmlFor="manual" className="text-sm text-[var(--text-secondary)]">
                  Exiger une confirmation manuelle explicite dans le workflow (champ{' '}
                  <code className="rounded bg-[var(--bg-tertiary)] px-1 font-mono text-xs">manual_confirmation</code>
                  ).
                </label>
              </div>

              <div>
                <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Notes internes (optionnel)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Consignes pour l’équipe ou le nœud IA…"
                  className="w-full resize-none rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer à n8n
              </button>
            </form>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <Edit3 className="h-5 w-5 text-[var(--accent-text)]" />
              Brouillon & aide à la rédaction
            </h3>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={8}
              placeholder="Collez ou éditez le texte de réponse avant envoi. Utilisé pour « rewrite_assist » et comme référence pour la validation."
              className="mt-4 w-full resize-y rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveDraftOnly}
                disabled={!draftText.trim()}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Sauvegarder le brouillon (API)
              </button>
            </div>
          </Card>

          {error ? (
            <Card className="border-red-500/35 bg-red-500/5">
              <div className="flex gap-3">
                <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Erreur</p>
                  <p className="mt-1 text-sm text-red-800/90 dark:text-red-200">{error}</p>
                </div>
              </div>
            </Card>
          ) : null}

          {result ? (
            <Card className="border-emerald-500/25 bg-emerald-500/5">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-emerald-900 dark:text-emerald-100">Réponse n8n</p>
                  <div className="mt-3">
                    <ResultPanel data={result} />
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
