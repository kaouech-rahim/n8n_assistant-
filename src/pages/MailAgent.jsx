import React, { useState, useRef, useEffect } from 'react'
import {
  Mail, ShieldAlert, RefreshCw, Inbox, AlertTriangle, Clock,
  Tag, Search, Reply, X, Minus, Send, Paperclip, Smile, Trash2,
  CheckCircle, XCircle, Sparkles
} from 'lucide-react'
import { useSpamResults } from '../hooks/useSpamResults.js'
import { useEmailResults } from '../hooks/useEmailResults.js'
import { sendMailAction, fetchAiGen, saveConversation } from '../api/client.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(str = '') {
  return str.split(/[\s@<]/)[0].slice(0, 2).toUpperCase() || '??'
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'À l\'instant'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

const IMPORTANCE_META = {
  haute:   { label: 'Haute',   cls: 'bg-red-50 text-red-600 ring-red-100',       dot: 'bg-red-500'     },
  moyenne: { label: 'Moyenne', cls: 'bg-amber-50 text-amber-600 ring-amber-100', dot: 'bg-amber-400'   },
  faible:  { label: 'Faible',  cls: 'bg-slate-50 text-slate-500 ring-slate-200', dot: 'bg-slate-400'   },
}

const AVATAR_COLORS = [
  'from-violet-500 to-indigo-500', 'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',  'from-orange-500 to-amber-400',
  'from-pink-500 to-rose-500',
]
const avatarColor = (str = '') => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length] || AVATAR_COLORS[0]

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
}

// ── Gmail-style Reply Window ──────────────────────────────────────────────────

function ReplyWindow({ email, onClose }) {
  const [minimized, setMinimized]   = useState(false)
  const [body, setBody]             = useState('')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [sendError, setSendError]   = useState(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState(null)
  const textRef    = useRef(null)
  const pollRef    = useRef(null)

  useEffect(() => {
    if (!minimized && textRef.current) textRef.current.focus()
  }, [minimized])

  // Nettoyage du polling si la fenêtre est fermée
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const to      = email.expediteur || ''
  const subject = `Re: ${email.objet || '(Sans objet)'}`

  const handleSend = async () => {
    if (!body.trim()) return
    setSending(true)
    setSendError(null)
    try {
      await sendMailAction({
        action:     'validate',
        email_id:   email.email_id || '',
        draft_text: body,
      })
      // Save reply to conversation history (updates the email's existing history entry)
      const msgs = [
        {
          role: 'user', kind: 'text',
          text: `De : ${email.expediteur || 'Inconnu'}\nObjet : ${email.objet || '(Sans objet)'}${email.contenu ? `\n\n${email.contenu.slice(0, 300)}` : ''}`,
          ts: new Date(email.receivedAt || email.date_reception || Date.now()).getTime(),
        },
        {
          role: 'bot', kind: 'text',
          html: `<strong>Statut :</strong> ${email.spam === 'oui' ? '🚫 Spam' : '✅ Légitime'}<br><strong>Importance :</strong> ${email.importance || 'faible'}`,
          ts: new Date(email.receivedAt || email.date_reception || Date.now()).getTime() + 500,
        },
        { role: 'user', kind: 'text', text: `📤 Réponse envoyée à ${to}`, ts: Date.now() - 500 },
        { role: 'bot', kind: 'text', text: body, ts: Date.now() },
      ]
      saveConversation('mail', `${email.objet || '(Sans objet)'} — ${email.expediteur || 'Inconnu'}`, msgs, `mail-${email.email_id}`).catch(() => {})
      setSent(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      setSendError(err.message || 'Erreur lors de l\'envoi')
      setSending(false)
    }
  }

  const handleAiGenerate = async () => {
    setAiLoading(true)
    setAiError(null)
    if (pollRef.current) clearInterval(pollRef.current)

    // Horodatage juste avant le déclenchement — on ne veut que les réponses après ce moment
    const since      = Date.now()
    const TIMEOUT_MS = 60_000   // 60 s max
    const startedAt  = Date.now()

    // Déclenche le workflow n8n via mail-action (le résultat async arrive sur /api/ai_gen)
    try {
      await sendMailAction({ action: 'generate', email_id: email.email_id || '' })
    } catch (_) {
      // n8n peut répondre immédiatement avec un ack vide — on continue de poller
    }

    // Polling toutes les 1,5 s jusqu'à réception ou timeout
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(pollRef.current)
        setAiLoading(false)
        setAiError('Délai dépassé (60 s) — n8n n\'a pas répondu')
        return
      }
      try {
        const results = await fetchAiGen(since)
        if (results && results.length > 0) {
          clearInterval(pollRef.current)
          const reponse = results[0].reponse
          if (reponse) {
            setBody(reponse)
            setTimeout(() => textRef.current?.focus(), 50)
          } else {
            setAiError('Réponse vide reçue de n8n')
          }
          setAiLoading(false)
        }
      } catch (_) { /* on réessaie au prochain tick */ }
    }, 1500)
  }

  return (
    <div
      className="fixed bottom-0 right-6 z-50 w-[500px] rounded-t-xl overflow-hidden"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
        style={{ background: '#404040' }}
        onClick={() => setMinimized(m => !m)}
      >
        <span className="text-[13px] font-medium text-white truncate max-w-[340px]">
          Répondre à {to}
        </span>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMinimized(m => !m)}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="bg-white flex flex-col">
          {/* À */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
            <span className="text-[12px] text-slate-400 w-10 shrink-0">À</span>
            <span className="text-[13px] text-slate-700 font-medium flex-1 truncate">{to}</span>
          </div>

          {/* Objet */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
            <span className="text-[12px] text-slate-400 w-10 shrink-0">Objet</span>
            <span className="text-[13px] text-slate-600 flex-1 truncate">{subject}</span>
          </div>

          {/* Textarea */}
          <div className="relative">
            {aiLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <p className="text-[12px] text-slate-500 font-medium">Génération en cours…</p>
              </div>
            )}
            <textarea
              ref={textRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Écrire votre réponse…"
              rows={8}
              className="w-full px-4 py-3 text-[13px] text-slate-700 placeholder:text-slate-400 resize-none outline-none leading-relaxed"
              style={{ minHeight: 200 }}
            />
            {/* Quoted original */}
            {email.contenu && (
              <div className="mx-4 mb-3 pl-3 border-l-2 border-slate-200">
                <p className="text-[11px] text-slate-400 mb-1">
                  Le {new Date(email.date_reception || email.receivedAt || Date.now())
                    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}, {to} a écrit :
                </p>
                <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-4">{email.contenu}</p>
              </div>
            )}
          </div>

          {/* Erreur IA */}
          {aiError && (
            <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-500">{aiError}</p>
              <button onClick={() => setAiError(null)} className="ml-auto text-red-300 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Erreur envoi */}
          {sendError && (
            <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-500 flex-1">{sendError}</p>
              <button onClick={() => setSendError(null)} className="text-red-300 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-1">
              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!body.trim() || sending || sent}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                  sent            ? 'bg-emerald-500 text-white' :
                  !body.trim()    ? 'bg-violet-200 text-white cursor-not-allowed' :
                  'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                }`}
              >
                {sent ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Envoyé</>
                ) : sending ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Envoi…</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Envoyer</>
                )}
              </button>

              {/* Pièce jointe */}
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Emoji */}
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                <Smile className="w-4 h-4" />
              </button>

              {/* IA — génère une réponse depuis n8n */}
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading}
                title="Générer une réponse avec l'IA"
                className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
                  aiLoading
                    ? 'bg-violet-100 text-violet-400 cursor-not-allowed'
                    : 'bg-violet-50 text-violet-500 hover:bg-violet-100 hover:text-violet-700'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {/* Supprimer brouillon */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Supprimer le brouillon"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Spam Classification Card ──────────────────────────────────────────────────

function SpamCard() {
  const { results, loading, error, refetch } = useSpamResults()

  const total = results.length
  const spams = results.filter(r => r.classification === 'spam' || r.spam === 'oui').length
  const hams  = total - spams
  const spamPct = total ? Math.round((spams / total) * 100) : 0

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <ShieldAlert style={{ width: 18, height: 18 }} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-800 leading-tight">Classification Spam</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Analyse automatique par IA</p>
          </div>
        </div>
        <button onClick={refetch} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 border-b border-slate-100 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-slate-50">
            <span className="text-2xl font-bold text-slate-700">{total}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Total</span>
          </div>
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-red-50">
            <span className="text-2xl font-bold text-red-600">{spams}</span>
            <span className="text-[10px] text-red-400 uppercase tracking-wide mt-0.5">Spam</span>
          </div>
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-emerald-50">
            <span className="text-2xl font-bold text-emerald-600">{hams}</span>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wide mt-0.5">Légitimes</span>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Taux de spam</span>
              <span className="font-semibold text-red-500">{spamPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all duration-700"
                style={{ width: `${spamPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-[380px]">
        {error && (
          <div className="flex flex-col items-center py-10 text-center px-4">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-sm text-slate-500">Erreur de chargement</p>
          </div>
        )}

        {loading && !results.length && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">Aucune classification</p>
            <p className="text-xs text-slate-400 mt-1">Les résultats n8n apparaîtront ici</p>
          </div>
        )}

        {results.map((item, idx) => {
          const isSpam  = item.classification === 'spam' || item.spam === 'oui'
          const sender  = item.expediteur || item.from || 'Inconnu'
          const subject = item.objet || item.subject || '(Sans objet)'
          const score    = item.score_confiance ?? item.score ?? null
          const rawScore = score !== null ? parseFloat(score) : null
          // n8n peut envoyer 0.85 (décimal) ou 85 (déjà en %) — on détecte
          const scorePct = rawScore !== null
            ? (rawScore > 1 ? Math.round(rawScore) : Math.round(rawScore * 100))
            : null
          const date    = item.date_reception || item.receivedAt

          return (
            <div
              key={item.email_id || idx}
              className={`flex items-start gap-3 px-4 py-3.5 border-b last:border-0 transition-colors ${
                isSpam
                  ? 'border-red-50 bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-400'
                  : 'border-slate-50 hover:bg-slate-50 border-l-4 border-l-emerald-400'
              }`}
            >
              {/* Verdict icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSpam ? 'bg-red-100' : 'bg-emerald-100'}`}>
                {isSpam
                  ? <XCircle className="w-5 h-5 text-red-500" />
                  : <CheckCircle className="w-5 h-5 text-emerald-500" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-slate-700 truncate">{sender}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(date)}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{subject}</p>

                {/* Score bar */}
                {scorePct !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isSpam ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-bold shrink-0 ${isSpam ? 'text-red-500' : 'text-emerald-600'}`}>
                      {scorePct}%
                    </span>
                  </div>
                )}
              </div>

              {/* Verdict badge */}
              <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide ${
                isSpam ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isSpam ? 'SPAM' : 'OK'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Email Inbox Card ──────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'all',   label: 'Tous'         },
  { id: 'haute', label: 'Prioritaires' },
  { id: 'spam',  label: 'Spam'         },
]

function EmailCard({ onReply }) {
  const { results, loading, error, refetch } = useEmailResults()
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(null)

  const filtered = results
    .filter(e => {
      if (activeFilter === 'haute') return e.importance === 'haute'
      if (activeFilter === 'spam')  return e.spam === 'oui'
      return true
    })
    .filter(e => {
      if (!search) return true
      const q = search.toLowerCase()
      return (e.expediteur || '').toLowerCase().includes(q) || (e.objet || '').toLowerCase().includes(q)
    })

  const spamCount = results.filter(e => e.spam === 'oui').length

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Inbox style={{ width: 18, height: 18 }} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-800 leading-tight">Boîte de réception</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {results.length} email{results.length !== 1 ? 's' : ''} synchronisé{results.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={refetch} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search + Filters */}
      <div className="px-4 pt-3 pb-2.5 space-y-2.5 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                activeFilter === f.id ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f.label}
              {f.id === 'spam' && spamCount > 0 && (
                <span className={`px-1.5 rounded-full text-[10px] font-bold ${activeFilter === 'spam' ? 'bg-white/25 text-white' : 'bg-red-100 text-red-500'}`}>
                  {spamCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-[480px]">
        {error && (
          <div className="flex flex-col items-center py-10 text-center px-4">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-sm text-slate-500">Erreur de chargement</p>
          </div>
        )}

        {loading && !results.length && (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-2/3" /><Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-14 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">Aucun email trouvé</p>
            <p className="text-xs text-slate-400 mt-1">{search ? 'Modifiez votre recherche' : 'Les emails IMAP apparaîtront ici'}</p>
          </div>
        )}

        {filtered.map((email, idx) => {
          const imp       = IMPORTANCE_META[email.importance] || IMPORTANCE_META.faible
          const isSpam    = email.spam === 'oui'
          const emailId   = email.email_id || idx
          const isSelected = selected === emailId

          return (
            <div key={emailId} className={`border-b border-slate-50 last:border-0 transition-colors ${isSelected ? 'bg-violet-50/50' : 'hover:bg-slate-50'}`}>
              {/* Row */}
              <div
                className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
                onClick={() => setSelected(isSelected ? null : emailId)}
              >
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(email.expediteur)} flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5`}>
                  {initials(email.expediteur)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{email.expediteur || 'Inconnu'}</p>
                    <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(email.date_reception || email.receivedAt)}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600 font-medium truncate mt-0.5">{email.objet || '(Sans objet)'}</p>
                  {email.contenu && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{email.contenu.slice(0, 90)}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${imp.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
                      {imp.label}
                    </span>
                    {isSpam && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">Spam</span>
                    )}
                    {email.categorie && (
                      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        <Tag className="w-2.5 h-2.5" />{email.categorie}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {isSelected && (
                <div className="px-4 pb-4 ml-12 space-y-3">
                  {email.contenu && (
                    <div className="p-3 bg-white rounded-xl border border-slate-100 text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {email.contenu.slice(0, 600)}
                      {email.contenu.length > 600 && <span className="text-slate-400 italic"> …</span>}
                    </div>
                  )}
                  {/* Reply button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onReply(email) }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    <Reply className="w-4 h-4" />
                    Répondre
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MailAgent() {
  const [replyEmail, setReplyEmail] = useState(null)

  return (
    <div className="p-6 page-enter">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-800">Mail Agent</h2>
        <p className="text-sm text-slate-500 mt-0.5">Gestion intelligente de vos emails via n8n</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <EmailCard onReply={setReplyEmail} />
        </div>
        <div className="lg:col-span-2">
          <SpamCard />
        </div>
      </div>

      {/* Gmail-style reply window */}
      {replyEmail && (
        <ReplyWindow email={replyEmail} onClose={() => setReplyEmail(null)} />
      )}
    </div>
  )
}
