import React, { useState, useEffect } from 'react'
import { Mail, Video, CalendarDays, FileText, LogOut, Sparkles, LayoutDashboard, Clock, ChevronDown, History } from 'lucide-react'
import { fetchConversations } from '../../api/client.js'

const NAV = [
  { id: 'home',     label: 'Tableau de bord', icon: LayoutDashboard, color: 'text-violet-400',  bg: 'bg-violet-500/15',  desc: 'Vue d\'ensemble'        },
  { id: 'mail',     label: 'Mail Agent',       icon: Mail,            color: 'text-blue-400',    bg: 'bg-blue-500/15',    desc: 'Gestion des emails'     },
  { id: 'meeting',  label: 'Réunion & Tâches', icon: Video,           color: 'text-orange-400',  bg: 'bg-orange-500/15',  desc: 'Transcriptions & suivi' },
  { id: 'calendar', label: 'Google Calendar',  icon: CalendarDays,    color: 'text-emerald-400', bg: 'bg-emerald-500/15', desc: 'Agenda intelligent'     },
  { id: 'document', label: 'Document Agent',   icon: FileText,        color: 'text-purple-400',  bg: 'bg-purple-500/15',  desc: 'Analyse de documents'  },
  { id: 'history',  label: 'Historique',       icon: History,         color: 'text-slate-400',   bg: 'bg-slate-500/15',   desc: 'Conversations sauvegardées' },
]

function fmtDate(iso) {
  const d = new Date(iso)
  const diff = Date.now() - d
  if (diff < 3600_000)  return `il y a ${Math.round(diff / 60_000)} min`
  if (diff < 86400_000) return `il y a ${Math.round(diff / 3600_000)} h`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

const AGENT_ICON = { document: FileText, meeting: Video, mail: Mail }
const AGENT_COLOR = { document: 'text-purple-400', meeting: 'text-orange-400', mail: 'text-blue-400' }

function HistorySection({ setActive }) {
  const [open,  setOpen]  = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => {
    function load() {
      fetchConversations(undefined, 5).then(convs => {
        setItems((convs || []).slice(0, 5))
      }).catch(() => {})
    }
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="px-3 pb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5"
      >
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
          <Clock className="w-3 h-3" />Récent
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="space-y-0.5">
          {items.map(conv => {
            const Icon = AGENT_ICON[conv.agent] || History
            const color = AGENT_COLOR[conv.agent] || 'text-slate-400'
            return (
              <button
                key={conv.id}
                onClick={() => setActive('history')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
              >
                <span className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] text-slate-400 group-hover:text-slate-300 truncate leading-tight">
                    {conv.title || 'Sans titre'}
                  </span>
                  <span className="block text-[10px] text-slate-600 leading-tight mt-0.5">{fmtDate(conv.savedAt)}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ active, setActive, onLogout, user }) {
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <aside className="w-[260px] shrink-0 flex flex-col h-screen bg-[#0d0f1a] border-r border-white/[0.05]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-900/40 shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white leading-tight">AI Assistant</p>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Workspace</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-3 pb-1">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-6 mb-2 mt-1">
          Navigation
        </p>
        <div className="px-3 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon, color, bg, desc }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`nav-item ${active === id ? 'active' : ''}`}
            >
              <span className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="truncate leading-tight">{label}</span>
                <span className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* History */}
        <div className="mt-3 border-t border-white/[0.04] pt-3">
          <HistorySection setActive={setActive} />
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.06] space-y-0.5 shrink-0">
        <button
          onClick={() => setActive('profile')}
          className={`nav-item ${active === 'profile' || active === 'settings' ? 'active' : ''}`}
        >
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            : <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 text-white text-[11px] font-bold shadow-sm">
                {initials}
              </span>
          }
          <span className="flex flex-col min-w-0">
            <span className="truncate leading-tight text-white text-[13px] font-medium">{user?.name || 'Profil'}</span>
            <span className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{user?.role || 'Paramètres'}</span>
          </span>
        </button>
        <button
          onClick={onLogout}
          className="nav-item text-red-400 hover:!text-red-300 hover:!bg-red-500/10 w-full"
        >
          <span className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-400" />
          </span>
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
