import React, { useState, useEffect } from 'react'
import {
  History, FileText, Video, Mail, Bot, User,
  ChevronDown, ChevronRight, Trash2, Search,
  Clock, MessageSquare, Loader2,
} from 'lucide-react'
import { fetchConversations, deleteConversation } from '../api/client.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function agentMeta(agent) {
  const map = {
    document: { label: 'Document Agent', icon: FileText, color: 'bg-purple-100 text-purple-600', dot: 'bg-purple-400' },
    meeting:  { label: 'Réunion & Tâches', icon: Video,    color: 'bg-orange-100 text-orange-600', dot: 'bg-orange-400' },
    mail:     { label: 'Mail Agent',       icon: Mail,     color: 'bg-blue-100 text-blue-600',     dot: 'bg-blue-400'   },
  }
  return map[agent] || { label: agent, icon: MessageSquare, color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' }
}

// ─── Message bubble (replay) ──────────────────────────────────────────────────

function ConvBubble({ msg }) {
  const isUser = msg.role === 'user'

  if (msg.kind === 'file') {
    return (
      <div className="flex items-end gap-2 justify-end">
        <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[70%]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-white shrink-0" />
            <p className="text-xs text-white font-medium truncate">{msg.text || 'Fichier'}</p>
          </div>
        </div>
        <div className="w-6 h-6 rounded-lg bg-slate-500 flex items-center justify-center shrink-0">
          <User className="w-3 h-3 text-white" />
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="flex items-end gap-2 justify-end">
        <div className="bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[70%]">
          <p className="text-xs text-white leading-relaxed">{msg.text}</p>
        </div>
        <div className="w-6 h-6 rounded-lg bg-slate-500 flex items-center justify-center shrink-0">
          <User className="w-3 h-3 text-white" />
        </div>
      </div>
    )
  }

  const isResume = msg.kind === 'resume'
  const isTaches = msg.kind === 'taches'
  const label = isResume ? '📋 Résumé du meeting' : isTaches ? '✅ Tâches extraites' : null

  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3 h-3 text-white" />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm ring-1 ring-slate-100 dark:ring-slate-700 px-3.5 py-2.5 max-w-[80%]">
        {label && <p className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</p>}
        {msg.html
          ? <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.html }} />
          : <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{msg.text}</p>
        }
      </div>
    </div>
  )
}

// ─── Conversation card ────────────────────────────────────────────────────────

function ConvCard({ conv, onDelete }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const meta = agentMeta(conv.agent)
  const Icon = meta.icon
  const preview = conv.messages
    .find(m => m.role === 'bot' && (m.html || m.text))
  const previewText = preview?.html?.replace(/<[^>]+>/g, '').slice(0, 120) || preview?.text?.slice(0, 120) || ''

  async function handleDelete(e) {
    e.stopPropagation()
    if (!confirm('Supprimer cette conversation ?')) return
    setDeleting(true)
    try {
      await deleteConversation(conv.id)
      onDelete(conv.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-xl ${meta.color} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{conv.title || 'Sans titre'}</p>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">{previewText}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />{fmtDate(conv.savedAt)}
            </span>
            <span className="text-[10px] text-slate-400">
              {conv.messages.length} message{conv.messages.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
          {open
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
          {conv.messages.map((msg, i) => (
            <ConvBubble key={i} msg={msg} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: '',         label: 'Tout',     icon: History },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'meeting',  label: 'Réunion',  icon: Video   },
  { id: 'mail',     label: 'Mail',     icon: Mail    },
]

export default function HistoryPage() {
  const [agent,  setAgent]  = useState('')
  const [convs,  setConvs]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,  setError]  = useState('')
  const [search, setSearch]  = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchConversations(agent || undefined, 100)
      .then(data => setConvs(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [agent])

  function handleDelete(id) {
    setConvs(prev => prev.filter(c => c.id !== id))
  }

  const filtered = search
    ? convs.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.messages.some(m => (m.text || m.html || '').toLowerCase().includes(search.toLowerCase()))
      )
    : convs

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm">
          <History className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Historique des conversations</h1>
          <p className="text-xs text-slate-400">Retrouvez toutes vos sessions Document, Réunion et Mail</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Agent tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAgent(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                agent === id
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les conversations…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">Aucune conversation enregistrée</p>
          <p className="text-xs text-slate-300 mt-1">
            Les conversations sont sauvegardées automatiquement depuis Document Agent et Réunion.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(conv => (
            <ConvCard key={conv.id} conv={conv} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
