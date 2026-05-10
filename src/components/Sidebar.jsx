import React from 'react'
import {
  Calendar, Mail, Video, CheckSquare, FileText, Mic,
  Clock, Plus, ChevronRight
} from 'lucide-react'
import { AGENTS, HISTORY_ITEMS } from '../data/agents.js'
import styles from './Sidebar.module.css'

const ICON_MAP = { Calendar, Mail, Video, CheckSquare, FileText, Mic }

const STATUS_LABEL = { online: 'En ligne', idle: 'En attente', offline: 'Hors ligne' }

export default function Sidebar({ activeAgentId, onSelectAgent, searchQuery }) {
  const filteredHistory = searchQuery
    ? HISTORY_ITEMS.filter(
        (h) =>
          h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.preview.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : HISTORY_ITEMS

  return (
    <aside className={styles.sidebar}>
      {/* Agents */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Agents</span>
          <button className={styles.addBtn} title="Nouveau agent">
            <Plus size={12} />
          </button>
        </div>

        <nav className={styles.agentList}>
          {Object.values(AGENTS).map((agent) => {
            const Icon = ICON_MAP[agent.icon]
            const isActive = agent.id === activeAgentId
            return (
              <button
                key={agent.id}
                className={`${styles.agentItem} ${isActive ? styles.active : ''}`}
                onClick={() => onSelectAgent(agent.id)}
                title={agent.description}
              >
                <span
                  className={styles.agentIcon}
                  style={{ color: isActive ? agent.color : undefined }}
                >
                  {Icon && <Icon size={15} />}
                </span>
                <span className={styles.agentName}>{agent.name}</span>
                <span
                  className={`${styles.statusDot} ${styles[agent.status]}`}
                  title={STATUS_LABEL[agent.status]}
                />
              </button>
            )
          })}
        </nav>
      </div>

      <div className={styles.divider} />

      {/* History */}
      <div className={`${styles.section} ${styles.historySection}`}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>
            <Clock size={11} style={{ marginRight: 4 }} />
            Historique
          </span>
        </div>

        <div className={styles.historyList}>
          {filteredHistory.length === 0 && (
            <div className={styles.historyEmpty}>Aucun résultat</div>
          )}
          {filteredHistory.map((item) => {
            const agent = AGENTS[item.agent]
            const Icon = agent ? ICON_MAP[agent.icon] : null
            return (
              <button key={item.id} className={styles.histItem}>
                {Icon && (
                  <span className={styles.histIcon} style={{ color: agent?.color }}>
                    <Icon size={11} />
                  </span>
                )}
                <div className={styles.histContent}>
                  <div className={styles.histTitle}>{item.title}</div>
                  <div className={styles.histTime}>{item.time}</div>
                </div>
                <ChevronRight size={11} className={styles.histArrow} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <div className={styles.footerStatus}>
          <span className={styles.footerDot} />
          <span>n8n connecté</span>
        </div>
        <a
          href="http://localhost:5678"
          target="_blank"
          rel="noreferrer"
          className={styles.footerLink}
        >
          Ouvrir n8n ↗
        </a>
      </div>
    </aside>
  )
}
