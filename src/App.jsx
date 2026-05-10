import React, { useState } from 'react';
import {
  LayoutDashboard,
  Shield,
  Mail,
  Video,
  FileText,
  Inbox,
  Send,
  ScrollText,
} from 'lucide-react';
import SpamResults from './components/SpamResults.jsx';
import MailAgent from './components/MailAgent.jsx';
import MeetingAgent from './components/MeetingAgent.jsx';
import DocAgent from './components/DocAgent.jsx';
import Dashboard from './components/Dashboard.jsx';
import EmailInbox from './components/EmailInbox.jsx';
import TelegramFeed from './components/TelegramFeed.jsx';
import ActivityLogs from './components/ActivityLogs.jsx';
import './App.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Accueil', icon: LayoutDashboard, component: Dashboard },
  { id: 'spam-results', label: 'Classification', shortLabel: 'Spam', icon: Shield, component: SpamResults },
  { id: 'email-inbox', label: 'Boîte IMAP', shortLabel: 'IMAP', icon: Inbox, component: EmailInbox },
  { id: 'mail-agent', label: 'Mail Agent', shortLabel: 'Mail', icon: Mail, component: MailAgent },
  { id: 'telegram', label: 'Telegram', shortLabel: 'TG', icon: Send, component: TelegramFeed },
  { id: 'meeting-agent', label: 'Réunions', shortLabel: 'Meet', icon: Video, component: MeetingAgent },
  { id: 'doc-agent', label: 'Documents', shortLabel: 'Docs', icon: FileText, component: DocAgent },
  { id: 'logs', label: 'Journal', shortLabel: 'Logs', icon: ScrollText, component: ActivityLogs },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const Active = TABS.find((t) => t.id === activeTab)?.component ?? Dashboard;

  return (
    <div className="app-root flex min-h-screen bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
      <aside className="app-sidebar hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r border-[var(--border-mid)] bg-[var(--bg-primary)] md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-[var(--border-light)] px-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] font-bold text-white text-sm shadow-[var(--shadow-sm)]">
            n8
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Assistant</p>
            <p className="truncate text-[11px] text-[var(--text-tertiary)]">Agents IA · n8n</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Navigation principale">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-[var(--border-mid)] bg-[var(--bg-primary)]/90 px-4 backdrop-blur-md md:hidden">
          <span className="font-semibold text-[var(--text-primary)]">n8n Assistant</span>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="max-w-[55%] rounded-lg border border-[var(--border-mid)] bg-[var(--bg-primary)] px-2 py-2 text-sm"
            aria-label="Changer de section"
          >
            {TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.shortLabel} — {t.label}
              </option>
            ))}
          </select>
        </header>

        <main className="flex-1 motion-safe:animate-[fadeIn_0.35s_ease-out_both]">
          <Active key={activeTab} />
        </main>

        <footer className="border-t border-[var(--border-mid)] bg-[var(--bg-primary)] px-4 py-3 text-center text-xs text-[var(--text-tertiary)]">
          <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>
              API{' '}
              <code className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                :3001
              </code>
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              n8n{' '}
              <code className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                :5678
              </code>
            </span>
          </span>
        </footer>
      </div>
    </div>
  );
}
