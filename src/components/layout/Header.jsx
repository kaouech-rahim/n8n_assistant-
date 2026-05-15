import React, { useState, useEffect, useRef } from 'react'
import { Bell, ChevronDown, User, Settings, LogOut, CheckCheck, Info, AlertTriangle, Sun, Moon } from 'lucide-react'
import { fetchNotifications, markAdminNotificationRead } from '../../api/client.js'

function NotifIcon({ type }) {
  if (type === 'error' || type === 'danger')
    return <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
  if (type === 'warn' || type === 'warning')
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
  return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
}

const PAGE_TITLES = {
  home:     'Tableau de bord',
  mail:     'Mail Agent',
  meeting:  'Réunion & Tâches',
  calendar: 'Google Calendar',
  document: 'Document Agent',
  profile:  'Mon profil',
  settings: 'Paramètres',
  history:  'Historique',
}

export default function Header({ activePage, onLogout, user, setActive, darkMode, toggleDarkMode }) {
  const [dropOpen,   setDropOpen]   = useState(false)
  const [bellOpen,   setBellOpen]   = useState(false)
  const [notifs,     setNotifs]     = useState([])
  const bellRef = useRef(null)

  useEffect(() => {
    function load() {
      fetchNotifications().then(setNotifs).catch(() => {})
    }
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  const unread = notifs.filter(n => !n.read).length

  async function markRead(id) {
    await markAdminNotificationRead(id).catch(() => {})
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await Promise.all(notifs.filter(n => !n.read).map(n => markAdminNotificationRead(n.id).catch(() => {})))
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  function navigate(page) {
    setDropOpen(false)
    setActive?.(page)
  }

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
      {/* Left — page title */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
          {PAGE_TITLES[activePage] ?? 'Tableau de bord'}
        </h2>
        <p className="text-[11px] text-slate-400 leading-tight">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          title={darkMode ? 'Mode jour' : 'Mode nuit'}
        >
          {darkMode
            ? <Sun  className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Notifications bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setBellOpen(v => !v); setDropOpen(false) }}
            className="relative w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-violet-500 rounded-full ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[9px] font-bold text-white px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-black/10 border border-slate-100 dark:border-slate-800 z-20 overflow-hidden animate-[cardIn_0.15s_ease-out_both]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    Notifications {unread > 0 && <span className="text-violet-500">({unread})</span>}
                  </p>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 font-medium">
                      <CheckCheck className="w-3.5 h-3.5" />Tout lire
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-8">Aucune notification</p>
                  ) : (
                    notifs.slice(0, 20).map(n => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`w-full flex items-start gap-2.5 px-4 py-3 text-left border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${!n.read ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''}`}
                      >
                        <NotifIcon type={n.type} />
                        <div className="flex-1 min-w-0">
                          {n.title && <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">{n.title}</p>}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(n.receivedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-violet-500 mt-1 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => { setDropOpen(!dropOpen); setBellOpen(false) }}
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-xl object-cover" />
              : <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user?.name ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                </div>
            }
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">{user?.name || 'Profil'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-black/10 border border-slate-100 dark:border-slate-800 py-1.5 z-20 animate-[cardIn_0.15s_ease-out_both]">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{user?.name || 'Utilisateur'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
                </div>
                <button
                  onClick={() => navigate('profile')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Mon profil
                </button>
                <button
                  onClick={() => navigate('settings')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Paramètres
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
