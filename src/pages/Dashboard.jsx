import React, { useState, useEffect } from 'react'
import Sidebar from '../components/layout/Sidebar.jsx'
import Header from '../components/layout/Header.jsx'
import ChatWidget from '../components/ChatWidget.jsx'
import MailAgent from './MailAgent.jsx'
import MeetingAgent from './MeetingAgent.jsx'
import CalendarAgent from './CalendarAgent.jsx'
import DocumentAgent from './DocumentAgent.jsx'
import Profile from './Profile.jsx'
import HistoryPage from './History.jsx'
import { Mail, Video, CalendarDays, FileText, TrendingUp, Clock, Zap, MessageSquare, AlertCircle } from 'lucide-react'
import { fetchStats } from '../api/client.js'

const AGENTS_CARDS = [
  { id: 'mail',     label: 'Mail Agent',       icon: Mail,        desc: 'Classifiez, répondez et gérez vos emails automatiquement.',            color: 'from-blue-500 to-cyan-500',     badge: (s) => `${s?.inbox?.total ?? 0} emails` },
  { id: 'meeting',  label: 'Réunion & Tâches', icon: Video,       desc: 'Transcription, résumé et extraction des points d\'action.',            color: 'from-orange-500 to-amber-400',  badge: () => 'Transcription IA' },
  { id: 'calendar', label: 'Google Calendar',  icon: CalendarDays,desc: 'Planification intelligente et gestion de votre agenda.',               color: 'from-emerald-500 to-teal-500',  badge: () => 'Agenda' },
  { id: 'document', label: 'Document Agent',   icon: FileText,    desc: 'Analyse, résumé et extraction de données depuis vos fichiers.',        color: 'from-purple-500 to-violet-500', badge: () => 'PDF · DOCX' },
]

function StatCard({ label, value, delta, icon: Icon, color, bg, ring }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ring-1 ${ring} flex flex-col gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
      <div className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-emerald-500" />
        <span className="text-[11px] text-slate-500">{delta}</span>
      </div>
    </div>
  )
}

function DashboardHome({ setActive, user }) {
  const [stats, setStats] = useState(null)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user?.name?.split(' ')[0] || 'Admin'

  useEffect(() => {
    function load() {
      fetchStats().then(setStats).catch(() => {})
    }
    load()
    const t = setInterval(load, 20_000)
    return () => clearInterval(t)
  }, [])

  const STATS = [
    {
      label: 'Emails classifiés',
      value: stats?.classification?.total ?? '—',
      delta: `${stats?.classification?.spam ?? 0} spam détectés`,
      icon: Mail, color: 'text-blue-500', bg: 'bg-blue-50', ring: 'ring-blue-100',
    },
    {
      label: 'Emails IMAP',
      value: stats?.inbox?.total ?? '—',
      delta: `${stats?.inbox?.highImportance ?? 0} haute importance`,
      icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50', ring: 'ring-orange-100',
    },
    {
      label: 'Événements Telegram',
      value: stats?.telegram?.events ?? '—',
      delta: 'Messages reçus',
      icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50', ring: 'ring-purple-100',
    },
    {
      label: 'Alertes non lues',
      value: stats?.admin?.unread ?? '—',
      delta: 'Notifications admin',
      icon: AlertCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-100',
    },
  ]

  return (
    <div className="p-6 space-y-6 page-enter">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 p-6 text-white shadow-lg shadow-indigo-200">
        <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute right-16 bottom-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">{greeting} 👋</p>
            <h2 className="text-2xl font-bold mt-0.5">Bienvenue, {firstName}</h2>
            <p className="text-indigo-200 text-sm mt-1.5">Vos agents sont actifs et prêts à travailler.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-amber-300" />
            <span className="text-sm font-semibold">4 agents actifs</span>
          </div>
        </div>
      </div>

      {/* Stats temps réel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Statistiques en temps réel</h3>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Mise à jour toutes les 20s
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      </div>

      {/* Activité récente */}
      {stats?.recentActivity?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Activité récente</h3>
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm divide-y divide-slate-50">
            {stats.recentActivity.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                <p className="text-[13px] text-slate-600 flex-1 truncate">{a.message}</p>
                <span className="text-[11px] text-slate-400 shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Accès rapide aux agents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AGENTS_CARDS.map(({ id, label, icon: Icon, desc, color, badge }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="group text-left bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md hover:ring-slate-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[11px] font-medium bg-slate-100 text-slate-500 rounded-full px-2.5 py-1">
                  {badge(stats)}
                </span>
              </div>
              <p className="text-[14px] font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">{label}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
              <div className="flex items-center gap-1 mt-3">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] text-slate-400">Mis à jour en temps réel</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ auth, onLogout, onUpdateUser, darkMode, toggleDarkMode }) {
  const [active, setActive] = useState('home')

  const isProfile = active === 'profile' || active === 'settings'
  const profileTab = active === 'settings' ? 'settings' : 'profile'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar active={active} setActive={setActive} onLogout={onLogout} user={auth?.user} />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          activePage={active}
          onLogout={onLogout}
          user={auth?.user}
          setActive={setActive}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
        <main className={`flex-1 ${active === 'document' ? 'overflow-hidden' : 'main-scroll'}`}>
          {active === 'mail'     && <MailAgent />}
          {active === 'meeting'  && <MeetingAgent />}
          {active === 'calendar' && <CalendarAgent />}
          {active === 'document' && <DocumentAgent />}
          {isProfile && (
            <Profile
              user={auth?.user}
              onLogout={onLogout}
              onUpdateUser={onUpdateUser}
              initialTab={profileTab}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
            />
          )}
          {active === 'history' && <HistoryPage />}
          {!['mail','meeting','calendar','document','profile','settings','history'].includes(active) && (
            <DashboardHome setActive={setActive} user={auth?.user} />
          )}
        </main>
      </div>

      <ChatWidget user={auth?.user} />
    </div>
  )
}
