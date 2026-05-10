import React from 'react';
import { useTelegramFeed } from '../hooks/useTelegramFeed.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import { Send, RefreshCw, AlertCircle, MessageCircle } from 'lucide-react';

export default function TelegramFeed() {
  const { events, loading, error, refetch } = useTelegramFeed();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={Send}
        title="Flux Telegram"
        subtitle="Événements poussés par n8n (messages, confirmations, erreurs). Endpoint : POST /api/telegram-events"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        }
      />

      {error ? (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
            <p className="font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        </Card>
      ) : null}

      {loading && events.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-mid)]">
          <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-[var(--text-secondary)]">Chargement…</p>
        </div>
      ) : null}

      {!loading && !error && events.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <MessageCircle className="mb-4 h-14 w-14 text-[var(--text-tertiary)]" />
            <p className="text-lg font-medium text-[var(--text-primary)]">Aucun événement Telegram</p>
            <p className="mt-2 max-w-lg text-sm text-[var(--text-secondary)]">
              Configurez votre workflow pour envoyer un JSON (texte, type, chat_id, etc.) vers le backend.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        {events.map((evt) => (
          <Card key={evt.id}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-light)] pb-3">
              <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-xs text-[var(--accent-text)]">
                {evt.type || evt.event || 'telegram'}
              </span>
              <time className="text-xs text-[var(--text-tertiary)]">
                {new Date(evt.receivedAt).toLocaleString('fr-FR')}
              </time>
            </div>
            {evt.summary || evt.text ? (
              <p className="mt-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {evt.summary || evt.text}
              </p>
            ) : null}
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-[var(--accent-text)]">Payload brut</summary>
              <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-secondary)]">
                {JSON.stringify(evt, null, 2)}
              </pre>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
