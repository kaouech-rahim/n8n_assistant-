import React, { useState, useRef, useEffect } from 'react'
import {
  FileText, Paperclip, Send, Loader2,
  Bot, User, Zap, MessageSquare, FileQuestion, RotateCcw,
} from 'lucide-react'
import { uploadDocFile, sendDocQuery, saveDocHistory, fetchDocSummary, fetchDocAnswer, saveConversation } from '../api/client.js'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'Points clés',   icon: Zap,           text: 'Quels sont les points clés de ce document ?' },
  { label: 'Conclusions',   icon: MessageSquare, text: 'Quelles sont les conclusions principales ?' },
  { label: 'Statistiques',  icon: FileQuestion,  text: 'Y a-t-il des données ou statistiques importantes ?' },
]

function uid()       { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
function newSid()    { return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
function fmtSize(b)  { return b < 1_048_576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1_048_576).toFixed(1)} MB` }
function fmtText(t)  {
  return (t || '')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

const WELCOME = () => ({
  id: uid(), role: 'bot', kind: 'text', ts: Date.now(),
  html:
    'Bonjour ! Je suis votre <strong>assistant documentaire</strong> IA.<br><br>' +
    'Envoyez-moi un fichier <strong>PDF</strong> ou <strong>DOCX</strong> via 📎.<br>' +
    'n8n va extraire le texte, l\'indexer et générer un résumé intelligent.',
})

// ─── Bulles de chat ────────────────────────────────────────────────────────────

function Avatar({ side }) {
  return side === 'bot' ? (
    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
      <Bot className="w-3.5 h-3.5 text-white" />
    </div>
  ) : (
    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-sm shrink-0">
      <User className="w-3.5 h-3.5 text-white" />
    </div>
  )
}

function BotBubble({ html, ts }) {
  return (
    <div className="flex items-start gap-2.5 max-w-2xl">
      <Avatar side="bot" />
      <div className="bg-white rounded-2xl rounded-tl-sm ring-1 ring-slate-100 shadow-sm px-4 py-3 min-w-0">
        <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
        <p className="text-[9px] text-slate-300 mt-2 text-right">
          {new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function UserTextBubble({ text, ts }) {
  return (
    <div className="flex items-end gap-2.5 justify-end max-w-md ml-auto">
      <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl rounded-tr-sm shadow-sm shadow-purple-100 px-4 py-3">
        <p className="text-sm text-white leading-relaxed">{text}</p>
        <p className="text-[9px] text-purple-200 mt-1.5 text-right">
          {new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <Avatar side="user" />
    </div>
  )
}

function UserFileBubble({ name, size, ts }) {
  const isPdf = /\.pdf$/i.test(name)
  return (
    <div className="flex items-end gap-2.5 justify-end ml-auto">
      <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl rounded-tr-sm shadow-sm shadow-purple-100 px-4 py-3 flex items-center gap-3 max-w-xs">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">{name}</p>
          <p className="text-[10px] text-purple-200 mt-0.5">{isPdf ? 'PDF' : 'DOCX'} · {fmtSize(size)}</p>
        </div>
      </div>
      <Avatar side="user" />
    </div>
  )
}

function LoadingBubble({ label }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar side="bot" />
      <div className="bg-white rounded-2xl rounded-tl-sm ring-1 ring-slate-100 shadow-sm px-4 py-3 flex items-center gap-2.5">
        <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0" />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar side="bot" />
      <div className="bg-white rounded-2xl rounded-tl-sm ring-1 ring-slate-100 shadow-sm px-4 py-3">
        <div className="flex gap-1 items-center" style={{ height: '14px' }}>
          {[0, 1, 2].map(i => (
            <span key={i} className="block w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SuggestionChips({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 pl-9">
      {SUGGESTIONS.map(({ label, icon: Icon, text }) => (
        <button key={label} onClick={() => onSelect(text)}
          className="flex items-center gap-1.5 text-[11px] font-medium bg-white text-purple-600 ring-1 ring-purple-200 rounded-full px-3 py-1.5 hover:bg-purple-50 hover:ring-purple-300 transition-all shadow-sm">
          <Icon className="w-3 h-3" />{label}
        </button>
      ))}
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function DocumentAgent() {
  const [messages,   setMessages]   = useState([WELCOME()])
  const [input,      setInput]      = useState('')
  const [uploading,  setUploading]  = useState(false)   // envoi vers n8n
  const [processing, setProcessing] = useState(false)   // n8n traite en arrière-plan
  const [typing,     setTyping]     = useState(false)   // Q&A en cours
  const [sessionId,  setSessionId]  = useState(null)
  const [docName,    setDocName]    = useState(null)
  const [showTips,   setShowTips]   = useState(false)

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const fileRef      = useRef(null)
  const activeRef    = useRef(null)   // sid courant — annule le polling upload si null
  const qnaActiveRef = useRef(false)  // annule le polling Q&A si false

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, uploading, processing, typing])

  // Auto-save full conversation to DB after every new message
  useEffect(() => {
    if (!sessionId || !docName || messages.length <= 1) return
    saveConversation('document', docName, messages, `doc-${sessionId}`).catch(() => {})
  }, [messages, sessionId, docName])

  function push(msg) {
    setMessages(prev => [...prev, { id: uid(), ...msg }])
  }

  // ── Polling ──────────────────────────────────────────────────────────────────

  async function pollSummary(sid, since) {
    const deadline = Date.now() + 180_000
    while (Date.now() < deadline) {
      if (activeRef.current !== sid) return null
      const result = await fetchDocSummary(sid, since).catch(() => null)
      if (result) return result
      await new Promise(r => setTimeout(r, 4_000))
    }
    throw new Error('timeout')
  }

  async function pollDocAnswer(since) {
    qnaActiveRef.current = true
    const deadline = Date.now() + 180_000
    while (Date.now() < deadline) {
      if (!qnaActiveRef.current) return null
      const result = await fetchDocAnswer(sessionId, since).catch(() => null)
      if (result) return result
      await new Promise(r => setTimeout(r, 3_000))
    }
    throw new Error('timeout')
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  async function handleFile(file) {
    if (!file || uploading || processing) return

    const valid =
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|docx)$/i.test(file.name)

    if (!valid) {
      push({ role: 'bot', kind: 'text', ts: Date.now(),
        html: '❌ Format non supporté. Envoyez un <strong>PDF</strong> ou <strong>DOCX</strong>.' })
      return
    }

    const sid = newSid()
    activeRef.current = sid

    push({ role: 'user', kind: 'file', name: file.name, size: file.size, ts: Date.now() })
    setUploading(true)

    try {
      // 1 — Envoi vers n8n (répond immédiatement)
      const res = await uploadDocFile(file, sid)
      const since = res.since ?? Date.now()
      setUploading(false)

      // 2 — n8n traite en arrière-plan
      setProcessing(true)
      push({ role: 'bot', kind: 'text', ts: Date.now(),
        html: `✅ <strong>${res.message || 'Document reçu par n8n !'}</strong><br>` +
              `⏳ Extraction, indexation et génération du résumé en cours…` })

      // 3 — Attente du résumé (polling)
      const entry = await pollSummary(sid, since)
      if (!entry) return   // annulé (reset)

      setProcessing(false)
      // Utiliser le session_id réel de n8n (peut différer de sid si n8n a utilisé 'default-session')
      setSessionId(entry.session_id)
      setDocName(file.name)

      // 4 — Afficher le résumé
      push({ role: 'bot', kind: 'text', ts: Date.now(),
        html: `📄 <strong>Résumé — ${entry.file_name}</strong><br><br>${fmtText(entry.summary)}` })
      setShowTips(true)
      setTimeout(() => inputRef.current?.focus(), 100)

    } catch (e) {
      setUploading(false)
      setProcessing(false)
      const isTimeout  = e.message === 'timeout'
      const isWorkflow = e.message?.includes('webhook') || e.message?.includes('registered')
      push({ role: 'bot', kind: 'text', ts: Date.now(),
        html: isTimeout
          ? `⏱️ <strong>Délai dépassé (3 min).</strong><br>` +
            `Vérifiez que le workflow DOC Agent est <strong>actif</strong> dans n8n ` +
            `(toggle <em>Inactive → Active</em>) puis réessayez.`
          : isWorkflow
          ? `⚠️ <strong>n8n ne répond pas.</strong><br><br>` +
            `Activez le workflow <strong>DOC Agent</strong> dans n8n puis réessayez.<br>` +
            `<code style="font-size:10px;color:#6b7280">${e.message}</code>`
          : `❌ Erreur : <em>${e.message}</em><br>` +
            `Vérifiez que le serveur tourne (<code>npm run dev:full</code>).` })
    }
  }

  // ── Q&A ──────────────────────────────────────────────────────────────────────

  async function sendMessage(text) {
    const q = (text ?? input).trim()
    if (!q || typing || uploading || processing) return
    if (!sessionId) {
      push({ role: 'bot', kind: 'text', ts: Date.now(),
        html: "Envoyez d'abord un document via <strong>📎</strong>." })
      return
    }

    setInput('')
    setShowTips(false)
    push({ role: 'user', kind: 'text', text: q, ts: Date.now() })
    setTyping(true)

    try {
      // 1 — Envoie la question à n8n (répond immédiatement avec {success, since})
      const res = await sendDocQuery(q, sessionId)
      if (!res?.success) throw new Error(res?.error || 'Erreur n8n')
      const since = res.since ?? Date.now()

      // 2 — Attend la réponse poussée par n8n sur /api/doc-summary (type:"answer")
      const entry = await pollDocAnswer(since)
      if (!entry) return   // annulé (reset)

      push({ role: 'bot', kind: 'text', ts: Date.now(), html: fmtText(entry.answer) })
      saveDocHistory(q, sessionId, entry.answer).catch(() => {})
    } catch (e) {
      const isTimeout  = e.message === 'timeout'
      const isWorkflow = e.message?.includes('webhook') || e.message?.includes('registered')
      push({ role: 'bot', kind: 'text', ts: Date.now(),
        html: isTimeout
          ? `⏱️ Pas de réponse après 3 min. Vérifiez que le workflow est <strong>actif</strong> dans n8n.`
          : isWorkflow
          ? `⚠️ Le workflow Q&A n8n n'est pas actif. Activez-le puis réessayez.`
          : `❌ Erreur : <em>${e.message}</em>` })
    } finally {
      qnaActiveRef.current = false
      setTyping(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  function reset() {
    // Auto-save conversation if there's real content (more than the welcome message)
    // Use doc-{sessionId} as deterministic ID so the aggregation in /api/conversations skips the doc_history fallback
    if (docName && messages.length > 1 && sessionId) {
      const realMessages = messages.filter(m => m.role !== undefined)
      saveConversation('document', docName, realMessages, `doc-${sessionId}`).catch(() => {})
    }
    activeRef.current = null
    qnaActiveRef.current = false
    setMessages([WELCOME()])
    setSessionId(null)
    setDocName(null)
    setShowTips(false)
    setInput('')
    setUploading(false)
    setProcessing(false)
    setTyping(false)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const canType = !!sessionId && !uploading && !processing

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-sm shadow-purple-200">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Document Agent</p>
            {processing ? (
              <p className="text-[10px] text-amber-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> n8n traite le document…
              </p>
            ) : docName ? (
              <p className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {docName}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400">Résumé IA + Q&A — PDF · DOCX via n8n</p>
            )}
          </div>
        </div>

        {(docName || uploading || processing) && (
          <button onClick={reset}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-purple-600 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Nouveau
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
        style={{ background: 'linear-gradient(180deg, #f5f3ff08 0%, #f8f9fc 100%)' }}>

        {messages.map(msg => {
          if (msg.kind === 'file')  return <UserFileBubble key={msg.id} name={msg.name} size={msg.size} ts={msg.ts} />
          if (msg.role === 'user')  return <UserTextBubble key={msg.id} text={msg.text} ts={msg.ts} />
          return <BotBubble key={msg.id} html={msg.html} ts={msg.ts} />
        })}

        {showTips && !typing && <SuggestionChips onSelect={t => sendMessage(t)} />}

        {uploading  && <LoadingBubble label="Envoi du document vers n8n…" />}
        {processing && <LoadingBubble label="n8n extrait, indexe et génère le résumé… (30–90 s)" />}
        {typing     && <TypingBubble />}

        <div ref={bottomRef} />
      </div>

      {/* Barre de saisie */}
      <div className="shrink-0 bg-white border-t border-slate-100 px-4 py-3">
        <div className="flex items-end gap-2.5">

          {/* Bouton fichier */}
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden"
            onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || processing || typing}
            title="Joindre un PDF ou DOCX"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-40 ${
              docName
                ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                : 'bg-slate-100 text-slate-500 hover:bg-purple-100 hover:text-purple-600'
            }`}>
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Zone de texte */}
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={canType ? 'Posez une question sur le document…' : 'Joignez un document avec 📎…'}
            rows={1} disabled={!canType}
            className="flex-1 resize-none px-4 py-2.5 text-sm border border-slate-200 rounded-2xl bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ minHeight: '42px', maxHeight: '128px', overflowY: 'auto' }} />

          {/* Bouton envoi */}
          <button onClick={() => sendMessage()}
            disabled={!input.trim() || typing || !canType}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 text-white flex items-center justify-center shadow-sm shadow-purple-200 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {typing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-[9px] text-slate-400 mt-1.5 text-center select-none">
          📎 joindre un document · Entrée pour envoyer · Maj+Entrée nouvelle ligne
        </p>
      </div>
    </div>
  )
}
