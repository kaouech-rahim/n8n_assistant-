import React from 'react'
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import styles from './Toast.module.css'

const ICONS = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
}

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div className={styles.container}>
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.type]} ${t.leaving ? styles.leaving : ''}`}
          >
            <Icon size={14} className={styles.icon} />
            <span className={styles.message}>{t.message}</span>
            <button className={styles.close} onClick={() => onRemove(t.id)}>
              <X size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
