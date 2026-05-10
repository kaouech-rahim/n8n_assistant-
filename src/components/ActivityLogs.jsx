import React, { useState, useEffect, useCallback } from 'react';
import { fetchLogs } from '../api/client.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import { ScrollText, RefreshCw, AlertCircle } from 'lucide-react';

const LEVEL_STYLES = {
  info: 'text-sky-900 bg-sky-50 ring-1 ring-sky-200',
  warn: 'text-amber-900 bg-amber-50 ring-1 ring-amber-200',
  error: 'text-red-800 bg-red-50 ring-1 ring-red-200',
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchLogs(level || undefined, 120);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={ScrollText}
        title="Journal système"
        subtitle="Traces des appels API et événements applicatifs (consultation et diagnostic)."
        actions={
          <>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
            >
              <option value="">Tous les niveaux</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
          </>
        }
      />

      {error ? (
        <Card className="mb-6 border-red-500/30">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        </Card>
      ) : null}

      <Card padded={false} className="overflow-hidden">
        <div className="divide-y divide-[var(--border-light)]">
          {logs.length === 0 && !loading ? (
            <p className="p-8 text-center text-[var(--text-secondary)]">Aucune entrée pour le moment.</p>
          ) : null}
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-2 px-5 py-4 text-sm motion-safe:animate-[fadeIn_0.25s_ease-out_both] sm:flex-row sm:items-start sm:gap-4"
            >
              <span
                className={`inline-flex w-fit shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
                  LEVEL_STYLES[log.level] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}
              >
                {log.level}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text-primary)]">{log.message}</p>
                <p className="mt-1 font-mono text-xs text-[var(--text-tertiary)]">{log.timestamp}</p>
                {log.details && Object.keys(log.details).length > 0 ? (
                  <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-[var(--bg-secondary)] p-2 text-xs text-[var(--text-secondary)]">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
