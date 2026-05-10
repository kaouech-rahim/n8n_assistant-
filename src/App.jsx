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
  { id: 'dashboard', label: 'Tableau de bord', shortLabel: 'Accueil', icon: LayoutDashboard, component: Dashboard },
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
    <div className="app-root flex min-h-screen">
      {/* Sidebar — fond slate foncé, navigation lisible type console pro */}
      <aside
        className="app-sidebar hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r border-slate-800 bg-slate-900 md:flex"
        aria-label="Navigation"
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-600 text-[13px] font-bold tracking-wide text-white shadow-sm">
            n8
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-white">Assistant</p>
            <p className="truncate text-[11px] text-slate-500">Console · n8n</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg border-l-2 py-2.5 pl-3 pr-2 text-left text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-teal-500 bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10'
                    : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Les données transitent par votre API locale puis les webhooks n8n.
          </p>
        </div>
      </aside>

      {/* Zone contenu — fond gris clair uniforme */}
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-4 shadow-sm md:hidden">
          <span className="text-sm font-semibold text-white">Assistant</span>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="max-w-[58%] rounded-md border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-slate-100"
            aria-label="Changer de section"
          >
            {TABS.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-800 text-slate-100">
                {t.shortLabel} · {t.label}
              </option>
            ))}
          </select>
        </header>

        <main className="flex-1">
          <div className="motion-safe:animate-[fadeIn_0.25s_ease-out_both]">
            <Active key={activeTab} />
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-[11px] text-slate-500">
            <span>
              API{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">localhost:3001</code>
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              n8n{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">localhost:5678</code>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
