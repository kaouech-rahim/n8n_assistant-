import React from 'react';
import { useEmailResults } from '../hooks/useEmailResults.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import {
  Inbox,
  RefreshCw,
  AlertCircle,
  Mail,
  Tag,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

function badgeImportance(v) {
  if (v === 'haute') return 'bg-red-50 text-red-800 ring-1 ring-red-200';
  if (v === 'moyenne') return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

export default function EmailInbox() {
  const { results, loading, error, refetch, filters, setFilters } = useEmailResults();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={Inbox}
        title="Boîte mail IMAP"
        subtitle="Emails classifiés par le workflow n8n : importance, spam, catégorie et données extraites."
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

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filters.spam ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              spam: e.target.value || undefined,
            }))
          }
          className="rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="">Spam : tous</option>
          <option value="oui">Spam oui</option>
          <option value="non">Spam non</option>
        </select>
        <select
          value={filters.importance ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              importance: e.target.value || undefined,
            }))
          }
          className="rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="">Importance : toutes</option>
          <option value="haute">Haute</option>
          <option value="moyenne">Moyenne</option>
          <option value="faible">Faible</option>
        </select>
      </div>

      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-800">{error}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 text-sm font-medium text-[var(--accent-text)] underline"
              >
                Réessayer
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      {loading && results.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-mid)] bg-[var(--bg-secondary)]">
          <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-[var(--text-secondary)]">Chargement des emails…</p>
        </div>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <Mail className="mb-4 h-14 w-14 text-[var(--text-tertiary)]" />
            <p className="text-lg font-medium text-[var(--text-primary)]">Aucun email synchronisé</p>
            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              Les entrées apparaîtront lorsque le workflow n8n enverra des données vers{' '}
              <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-xs">POST /api/email-results</code>.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {results.map((row) => (
          <Card key={row.email_id} className="flex flex-col transition hover:shadow-[var(--shadow-md)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeImportance(row.importance)}`}
              >
                <Tag className="mr-1 h-3 w-3" />
                {row.importance}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  row.spam === 'oui'
                    ? 'bg-red-50 text-red-800 ring-1 ring-red-200'
                    : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                }`}
              >
                {row.spam === 'oui' ? (
                  <>
                    <ShieldAlert className="mr-1 inline h-3 w-3" />
                    Spam
                  </>
                ) : (
                  'Inbox'
                )}
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {new Date(row.date_reception || row.receivedAt).toLocaleString('fr-FR')}
            </p>
            <p className="mt-2 font-medium text-[var(--text-primary)]">{row.objet}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              <span className="text-[var(--text-tertiary)]">De</span> {row.expediteur}
            </p>
            {row.categorie ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--accent-text)]">
                {row.categorie}
              </p>
            ) : null}
            {row.contenu ? (
              <details className="mt-4 group">
                <summary className="cursor-pointer list-none text-sm font-medium text-[var(--accent-text)] [&::-webkit-details-marker]:hidden flex items-center gap-1">
                  Contenu
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <div className="mt-2 max-h-48 overflow-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {row.contenu}
                </div>
              </details>
            ) : null}
            {row.extractions && Object.keys(row.extractions).length > 0 ? (
              <div className="mt-4 rounded-lg bg-[var(--bg-tertiary)] p-3 text-xs font-mono text-[var(--text-secondary)]">
                <p className="mb-1 font-sans text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                  Données extraites
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(row.extractions, null, 2)}</pre>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
