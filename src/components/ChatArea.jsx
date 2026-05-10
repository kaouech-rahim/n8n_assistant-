import React, { useEffect, useRef } from 'react'
import {
  Calendar, Mail, Video, CheckSquare, FileText, Mic,
  Trash2, ExternalLink, Zap
} from 'lucide-react'
import { AGENTS } from '../data/agents.js'
import ChatMessage, { TypingIndicator } from './ChatMessage.jsx'
import ChatInput from './ChatInput.jsx'
import styles from './ChatArea.module.css'

const ICON_MAP = { Calendar, Mail, Video, CheckSquare, FileText, Mic }

const STATUS_COLOR = { online: '#22c55e', idle: '#f59e0b', offline: '#9ca3af' }
const STATUS_LABEL = { online: 'En ligne', idle: 'En attente', offline: 'Hors ligne' }

export default function ChatArea({ agentId, messages, isTyping, error, onSend, onClear }) {
  const agent = AGENTS[agentId]
  const Icon = agent ? ICON_MAP[agent.icon] : null
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  if (!agent) return null

  return (
    <div className={styles.chatArea}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.agentInfo}>
          <div
            className={styles.avatar}
            style={{ background: agent.color + '22', borderColor: agent.color + '44' }}
          >
            {Icon && <Icon size={16} style={{ color: agent.color }} />}
          </div>
          <div>
            <div className={styles.agentName}>{agent.fullName}</div>
            <div className={styles.agentMeta}>
              <span
                className={styles.statusDot}
                style={{ background: STATUS_COLOR[agent.status] }}
              />
              <span>{STATUS_LABEL[agent.status]}</span>
              <span className={styles.dot}>·</span>
              <span>{agent.description}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.capabilities}>
            {agent.capabilities.slice(0, 2).map((cap) => (
              <span key={cap} className={styles.capBadge}>{cap}</span>
            ))}
          </div>
          <a
            href={`http://localhost:5678${agent.webhookPath}`}
            target="_blank"
            rel="noreferrer"
            className={styles.headerBtn}
            title="Voir le webhook n8n"
          >
            <Zap size={14} />
          </a>
          <button className={styles.headerBtn} onClick={onClear} title="Effacer la conversation">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <div
              className={styles.emptyIcon}
              style={{ background: agent.color + '18', borderColor: agent.color + '30' }}
            >
              {Icon && <Icon size={28} style={{ color: agent.color }} />}
            </div>
            <h3>{agent.fullName}</h3>
            <p>{agent.greeting}</p>
            <div className={styles.emptyCaps}>
              {agent.capabilities.map((cap) => (
                <span key={cap} className={styles.emptyCapItem}>✓ {cap}</span>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        {error && (
          <div className={styles.errorBanner}>
            ⚠️ {error} —{' '}
            <a href="http://localhost:5678" target="_blank" rel="noreferrer">
              Vérifier n8n ↗
            </a>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        isTyping={isTyping}
        acceptedFiles={agent.acceptedFiles}
        agentId={agentId}
      />
    </div>
  )
}
