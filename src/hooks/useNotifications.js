import { useState, useCallback, useEffect } from 'react'
import { NOTIFICATIONS } from '../data/agents.js'

export function useNotifications() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const [toasts, setToasts] = useState([])

  const unreadCount = notifications.filter((n) => !n.read).length

  const addToast = useCallback((message, type = 'info', duration = 3200) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, leaving: false }])
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      )
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 350)
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 350)
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const addNotification = useCallback((notif) => {
    const newNotif = {
      id: Date.now(),
      read: false,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      ...notif,
    }
    setNotifications((prev) => [newNotif, ...prev])
    addToast(notif.message, notif.type)
  }, [addToast])

  // Simulate real-time notifications
  useEffect(() => {
    const events = [
      { message: 'Workflow Email exécuté avec succès', type: 'success' },
      { message: '2 nouvelles tâches assignées', type: 'info' },
      { message: 'Calendrier synchronisé', type: 'success' },
      { message: 'Rapport hebdomadaire prêt', type: 'info' },
    ]
    let idx = 0
    const timer = setInterval(() => {
      if (idx < events.length) {
        addNotification(events[idx])
        idx++
      } else {
        clearInterval(timer)
      }
    }, 8000)
    return () => clearInterval(timer)
  }, [addNotification])

  return {
    notifications,
    toasts,
    unreadCount,
    addToast,
    removeToast,
    markAllRead,
    addNotification,
  }
}
