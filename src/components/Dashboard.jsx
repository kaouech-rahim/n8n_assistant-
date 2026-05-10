import React, { useEffect, useState, useCallback } from 'react';
import { useStats } from '../hooks/useStats.js';
import { fetchAdminNotifications, markAdminNotificationRead } from '../api/client.js';
import { PageHeader } from './ui/PageHeader.jsx';
import { Card } from './ui/Card.jsx';
import {
  LayoutDashboard,
  Mail,
  Shield,
  TrendingUp,
  Activity,
  Clock,
  Radio,
  Bell,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

function StatTile({ label, value, hint, icon: Icon, tone = 'default' }) {
  const tones = {
    default: 'from-[var(--accent-soft)] to-transparent',
    danger: 'from-red-500/10 to-transparent',
    success: 'from-emerald-500/10 to-transparent',
    warn: 'from-amber-500/10 to-transparent',
  };
  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${tones[tone] || tones.default}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p>
          {hint ? <p className="mt-2 text-xs text-[var(--text-tertiary)]">{hint}</p> : null}
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-primary)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--border-light)]">
          <Icon className="h-5 w-5 text-[var(--accent-text)]" aria-hidden />
        </span>
      </div>
    </Card>
  );
}

/** Histogramme léger sans librairie — proportions normalisées */
function MiniBars({ chart, classification }) {
  const spam = Number(chart?.spam) || 0;
  const nonSpam = Number(chart?.nonSpam) || 0;
  const inboxSpam = Number(chart?.inboxSpam) || 0;
  const inboxClean = Number(chart?.inboxClean) || 0;
  const max = Math.max(spam + nonSpam, inboxSpam + inboxClean, 1);

  const rows = [
    { label: 'Spam (IA)', value: spam, className: 'bg-red-500/80' },
    { label: 'Non-spam (IA)', value: nonSpam, className: 'bg-emerald-500/80' },
    { label: 'Spam boîte IMAP', value: inboxSpam, className: 'bg-orange-500/75' },
    { label: 'Inbox nettoyée', value: inboxClean, className: 'bg-[var(--accent)]/80' },
  ];

  return (
    <Card>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Répartition visuelle</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Basé sur les flux classification ({classification?.total ?? 0} messages) et boîte IMAP.
      </p>
      <div className="mt-6 space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-xs font-medium text-[var(--text-secondary)]">
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)] ring-1 ring-[var(--border-light)]">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${row.className}`}
                style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { stats, loading, error, refetch } = useStats();
  const [adminNotes, setAdminNotes] = useState([]);

  const loadAdmin = useCallback(async () => {
    try {
      const list = await fetchAdminNotifications();
      setAdminNotes(Array.isArray(list) ? list : []);
    } catch {
      setAdminNotes([]);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
    const id = setInterval(loadAdmin, 20000);
    return () => clearInterval(id);
  }, [loadAdmin]);

  const onMarkRead = async (nid) => {
    try {
      await markAdminNotificationRead(nid);
      await loadAdmin();
      refetch();
    } catch {
      /* ignore */
    }
  };

  const c = stats?.classification;
  const inbox = stats?.inbox;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Tableau de bord"
        subtitle="Vue consolidée : classifications spam, boîte IMAP, Telegram et alertes administrateur."
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        }
      />

      {error ? (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Classifications IA"
          value={loading && !stats ? '…' : c?.total ?? 0}
          hint="Messages analysés (workflow spam)"
          icon={Mail}
        />
        <StatTile
          label="Spam détecté"
          value={loading && !stats ? '…' : c?.spam ?? 0}
          hint="Dont faux positifs à surveiller"
          icon={Shield}
          tone="danger"
        />
        <StatTile
          label="Emails IMAP"
          value={loading && !stats ? '…' : inbox?.total ?? 0}
          hint={`Importance haute : ${inbox?.highImportance ?? 0}`}
          icon={Activity}
        />
        <StatTile
          label="Confiance moy."
          value={loading && !stats ? '…' : `${c?.avgConfidence ?? 0}%`}
          hint="Score agrégé sur les classifications"
          icon={TrendingUp}
        />
      </div>

      {adminNotes.length > 0 ? (
        <Card className="mt-8 border-amber-500/25 bg-amber-500/[0.06]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <Bell className="h-5 w-5 text-amber-600" />
              Notifications administrateur
            </h3>
            <span className="text-xs text-[var(--text-tertiary)]">
              POST /api/admin-notifications · n8n / système
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {adminNotes.slice(0, 8).map((n) => (
              <li
                key={n.id}
                className={`flex flex-col gap-2 rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] p-4 sm:flex-row sm:items-center sm:justify-between ${
                  n.read ? 'opacity-70' : ''
                }`}
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{n.title || n.message || 'Notification'}</p>
                  {n.message && n.title ? (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{n.message}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {new Date(n.receivedAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => onMarkRead(n.id)}
                    className="shrink-0 rounded-lg border border-[var(--border-mid)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    Marquer lu
                  </button>
                ) : (
                  <span className="text-xs text-[var(--text-tertiary)]">Lu</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MiniBars chart={stats?.chart} classification={c} />

        <Card>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">État des canaux</h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
            <li className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[var(--accent-text)]" />
                Événements Telegram
              </span>
              <span className="font-semibold text-[var(--text-primary)]">{stats?.telegram?.events ?? 0}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600" />
                Alertes admin non lues
              </span>
              <span className="font-semibold text-[var(--text-primary)]">{stats?.admin?.unread ?? 0}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                Non-spam (IA)
              </span>
              <span className="font-semibold text-[var(--text-primary)]">{c?.nonSpam ?? 0}</span>
            </li>
          </ul>
        </Card>
      </div>

      <Card className="mt-8">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <Activity className="h-5 w-5 text-[var(--accent-text)]" />
          Activité récente
        </h3>
        <div className="space-y-0 divide-y divide-[var(--border-light)]">
          {(stats?.recentActivity ?? []).length === 0 ? (
            <p className="py-8 text-center text-[var(--text-secondary)]">
              Aucune activité enregistrée — démarrez vos workflows n8n.
            </p>
          ) : (
            stats.recentActivity.map((activity, index) => (
              <div
                key={`${activity.at}-${index}`}
                className="flex gap-4 py-4 first:pt-0 motion-safe:animate-[slideInUp_0.35s_ease-out_both]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    activity.type === 'classification'
                      ? 'bg-[var(--accent)]'
                      : activity.type === 'inbox'
                        ? 'bg-emerald-500'
                        : activity.type === 'telegram'
                          ? 'bg-sky-500'
                          : 'bg-[var(--text-tertiary)]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{activity.message}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Clock className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
