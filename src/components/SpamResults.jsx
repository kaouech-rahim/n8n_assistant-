import React from 'react';
import { useSpamResults } from '../hooks/useSpamResults.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import { RefreshCw, AlertCircle, Mail, Shield } from 'lucide-react';

export default function SpamResults() {
  const { results, loading, error, refetch } = useSpamResults();

  if (loading && results.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
        <RefreshCw className="mb-4 h-9 w-9 animate-spin text-[var(--accent)]" />
        <p className="text-[var(--text-secondary)]">Chargement des classifications…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Erreur</h3>
        <p className="mt-2 text-[var(--text-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={Shield}
        title="Classification anti-spam"
        subtitle="Résultats poussés par n8n vers POST /api/spam-results — confiance, résumé et raisons."
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

      {results.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <Mail className="mb-4 h-14 w-14 text-[var(--text-tertiary)]" />
            <p className="text-lg font-medium text-[var(--text-primary)]">Aucun résultat pour le moment</p>
            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              Les analyses apparaîtront lorsque votre workflow enverra des données au backend.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result, index) => (
            <Card
              key={`${result.email_id}-${index}`}
              className="transition hover:shadow-[var(--shadow-md)]"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    result.classification === 'spam'
                      ? 'bg-red-500/15 text-red-800 ring-1 ring-red-500/25 dark:text-red-200'
                      : 'bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-500/25 dark:text-emerald-100'
                  }`}
                >
                  {result.classification === 'spam' ? 'Spam' : 'Non-spam'}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {Number(result.score_confiance ?? 0)}% ·{' '}
                  {new Date(result.date_reception || result.receivedAt).toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <p className="text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">De</span> {result.expediteur}
                </p>
                <p className="text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">Objet</span> {result.objet}
                </p>
                <div className="border-t border-[var(--border-light)] pt-3">
                  <p className="text-[var(--text-primary)]">
                    <span className="font-medium text-[var(--text-secondary)]">Résumé · </span>
                    {result.resume}
                  </p>
                  <p className="mt-2 text-[var(--text-primary)]">
                    <span className="font-medium text-[var(--text-secondary)]">Raisons · </span>
                    {result.raisons}
                  </p>
                </div>
                {result.contenu ? (
                  <details className="group mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-[var(--accent-text)]">
                      Contenu complet
                    </summary>
                    <div className="mt-2 max-h-48 overflow-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-[var(--text-primary)] whitespace-pre-wrap">
                      {result.contenu}
                    </div>
                  </details>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
