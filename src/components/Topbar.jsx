import React, { useState } from 'react'
import { Bell, Settings, Search, Zap, X, Check } from 'lucide-react'
import styles from './Topbar.module.css'

export default function Topbar({ unreadCount, notifications, onMarkAllRead, onSearch }) {
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const typeIcon = { success: '✅', info: '💬', warning: '⚠️', error: '❌' }

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <Zap size={16} />
        </div>
        <span className={styles.brandName}>n8n Assistant</span>
        <span className={styles.live}>
          <span className={styles.liveDot} />
          Live
        </span>
      </div>

      <div className={styles.actions}>
        {/* Search */}
        {showSearch && (
          <div className={styles.searchBox}>
            <Search size={13} className={styles.searchIcon} />
            <input
              autoFocus
              className={styles.searchInput}
              placeholder="Rechercher dans l'historique..."
              value={searchVal}
              onChange={(e) => { setSearchVal(e.target.value); onSearch?.(e.target.value) }}
              onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
            />
            <button className={styles.searchClose} onClick={() => { setShowSearch(false); setSearchVal('') }}>
              <X size={12} />
            </button>
          </div>
        )}

        <button className={styles.iconBtn} onClick={() => setShowSearch(!showSearch)} title="Rechercher">
          <Search size={15} />
        </button>

        {/* Notifications */}
        <div className={styles.notifWrap}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            title="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifPanel && (
            <div className={styles.notifPanel}>
              <div className={styles.notifHeader}>
                <span>Notifications</span>
                <button className={styles.markRead} onClick={() => { onMarkAllRead(); setShowNotifPanel(false) }}>
                  <Check size={12} /> Tout lire
                </button>
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 && (
                  <div className={styles.notifEmpty}>Aucune notification</div>
                )}
                {notifications.map((n) => (
                  <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.unread : ''}`}>
                    <span className={styles.notifIcon}>{typeIcon[n.type] || '💬'}</span>
                    <div className={styles.notifContent}>
                      <div className={styles.notifMsg}>{n.message}</div>
                      <div className={styles.notifTime}>{n.time}</div>
                    </div>
                    {!n.read && <span className={styles.unreadDot} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className={styles.iconBtn} title="Paramètres">
          <Settings size={15} />
        </button>
      </div>

      {/* Backdrop */}
      {showNotifPanel && (
        <div className={styles.backdrop} onClick={() => setShowNotifPanel(false)} />
      )}
    </header>
  )
}
