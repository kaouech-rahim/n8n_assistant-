import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Users, User, ChevronLeft } from 'lucide-react'
import { fetchTeam, fetchMessages, postMessage } from '../api/client.js'

const POLL_MS = 3000

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function dmChannel(emailA, emailB) {
  return 'dm-' + [emailA, emailB].sort().join('--')
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function MemberAvatar({ name, size = 'md', color = 'violet' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  const colors = {
    violet: 'from-violet-500 to-indigo-500',
    blue: 'from-blue-500 to-cyan-500',
    teal: 'from-teal-500 to-emerald-500',
    orange: 'from-orange-500 to-amber-500',
  }
  const palette = ['violet', 'blue', 'teal', 'orange']
  const col = colors[palette[name.charCodeAt(0) % palette.length]]
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${col} flex items-center justify-center text-white font-bold shrink-0`}>
      {initials(name)}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg, isOwn, myName }) {
  if (isOwn) {
    return (
      <div className="flex justify-end gap-2 items-end">
        <div className="max-w-[75%]">
          <div className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-sm">
            <p className="text-[13px] leading-relaxed break-words">{msg.content}</p>
          </div>
          <p className="text-[10px] text-slate-400 text-right mt-0.5 pr-1">{fmtTime(msg.createdAt)}</p>
        </div>
        <MemberAvatar name={myName || 'Moi'} size="sm" />
      </div>
    )
  }
  return (
    <div className="flex gap-2 items-end">
      <MemberAvatar name={msg.senderName} size="sm" />
      <div className="max-w-[75%]">
        <p className="text-[10px] font-semibold text-slate-500 mb-0.5 ml-1">{msg.senderName}</p>
        <div className="bg-white ring-1 ring-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
          <p className="text-[13px] text-slate-700 leading-relaxed break-words">{msg.content}</p>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 ml-1">{fmtTime(msg.createdAt)}</p>
      </div>
    </div>
  )
}

// ── Chat pane ─────────────────────────────────────────────────────────────────

function ChatPane({ channel, label, currentUser }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const lastIdRef = useRef(0)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchMessages(channel, lastIdRef.current)
      if (data?.length) {
        setMessages(prev => [...prev, ...data])
        lastIdRef.current = data[data.length - 1].id
      }
    } catch { /* ignore poll errors */ }
  }, [channel])

  useEffect(() => {
    setMessages([])
    lastIdRef.current = 0
    loadMessages()
    const timer = setInterval(loadMessages, POLL_MS)
    return () => clearInterval(timer)
  }, [channel, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      const msg = await postMessage(channel, currentUser.name, currentUser.email, text)
      if (msg) {
        setMessages(prev => [...prev, msg])
        lastIdRef.current = msg.id
      }
    } catch { /* optimistic — ignore */ } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ background: 'linear-gradient(180deg,#f5f3ff10 0%,#f8f9fc 100%)' }}>
        {messages.length === 0 && (
          <p className="text-center text-xs text-slate-400 mt-8">
            Aucun message dans {label}.<br />Soyez le premier à écrire !
          </p>
        )}
        {messages.map(msg => (
          <Bubble key={msg.id} msg={msg} isOwn={msg.senderEmail === currentUser.email} myName={currentUser.name} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 px-3 py-2.5 border-t border-slate-100 bg-white flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Écrire un message…"
          className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center shadow-sm hover:brightness-110 transition-all disabled:opacity-40 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── DM member list ────────────────────────────────────────────────────────────

function DmList({ team, onSelect }) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {team.map(member => (
        <button
          key={member.email}
          onClick={() => onSelect(member)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
        >
          <MemberAvatar name={member.name} size="sm" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-700 truncate">{member.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{member.role}</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0 ml-auto" />
        </button>
      ))}
    </div>
  )
}

// ── Main widget (draggable like Messenger) ────────────────────────────────────

export default function ChatWidget({ user }) {
  const CURRENT_USER = {
    name:  user?.name  || 'Moi',
    email: user?.email || 'me@local',
  }

  const [open,     setOpen]     = useState(false)
  const [tab,      setTab]      = useState('group')
  const [team,     setTeam]     = useState([])
  const [dmTarget, setDmTarget] = useState(null)
  const [snapRight, setSnapRight] = useState(true)
  const [isSnapping, setIsSnapping] = useState(false)

  const posRef   = useRef({ x: window.innerWidth - 80, y: window.innerHeight - 120 })
  const [pos, setPos] = useState(posRef.current)
  const dragState = useRef({ active: false, ox: 0, oy: 0, bx: 0, by: 0 })
  const wasDrag   = useRef(false)

  useEffect(() => {
    fetchTeam().then(setTeam).catch(() => {})
  }, [])

  function onPointerDown(e) {
    e.preventDefault()
    wasDrag.current = false
    dragState.current = { active: true, ox: e.clientX, oy: e.clientY, bx: posRef.current.x, by: posRef.current.y }

    const onMove = (ev) => {
      if (!dragState.current.active) return
      const dx = ev.clientX - dragState.current.ox
      const dy = ev.clientY - dragState.current.oy
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) wasDrag.current = true
      if (!wasDrag.current) return
      const nx = dragState.current.bx + dx
      const ny = dragState.current.by + dy
      posRef.current = { x: nx, y: ny }
      setPos({ x: nx, y: ny })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dragState.current.active = false

      if (wasDrag.current) {
        const right = posRef.current.x + 32 > window.innerWidth / 2
        const snapX = right ? window.innerWidth - 80 : 12
        const snapY = Math.max(60, Math.min(window.innerHeight - 80, posRef.current.y))
        posRef.current = { x: snapX, y: snapY }
        setSnapRight(right)
        setIsSnapping(true)
        setPos({ x: snapX, y: snapY })
        setTimeout(() => setIsSnapping(false), 350)
      } else {
        setOpen(v => !v)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const panelLeft = snapRight
    ? Math.max(8, pos.x - 360 + 64)
    : pos.x

  const panelTop = Math.max(8, pos.y - 528 - 12)

  return (
    <>
      {/* Panel — positioned relative to bubble */}
      {open && (
        <div
          className="fixed z-50 w-[360px] bg-white rounded-2xl shadow-2xl shadow-black/20 border border-slate-200 flex flex-col overflow-hidden animate-[cardIn_0.18s_ease-out_both]"
          style={{ left: panelLeft, top: panelTop, height: '520px' }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600">
            <div className="flex items-center gap-2.5">
              {tab === 'dm' && dmTarget && (
                <button onClick={() => setDmTarget(null)} className="text-white/70 hover:text-white transition-colors mr-0.5">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <MessageCircle className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">
                {tab === 'group' ? 'Discussion Groupe' : dmTarget ? dmTarget.name : 'Messages privés'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!dmTarget && (
                <>
                  <button onClick={() => setTab('group')} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${tab === 'group' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                    <Users className="w-3.5 h-3.5 inline mr-1" />Groupe
                  </button>
                  <button onClick={() => setTab('dm')} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${tab === 'dm' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                    <User className="w-3.5 h-3.5 inline mr-1" />DM
                  </button>
                </>
              )}
              <button onClick={() => setOpen(false)} className="ml-1 w-7 h-7 rounded-lg text-white/70 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {tab === 'group' && <ChatPane channel="general" label="le groupe" currentUser={CURRENT_USER} />}
          {tab === 'dm' && !dmTarget && <DmList team={team} onSelect={setDmTarget} />}
          {tab === 'dm' && dmTarget && (
            <ChatPane
              channel={dmChannel(CURRENT_USER.email, dmTarget.email)}
              label={`la conversation avec ${dmTarget.name}`}
              currentUser={CURRENT_USER}
            />
          )}
        </div>
      )}

      {/* Draggable bubble */}
      <div
        className="fixed z-50 touch-none"
        style={{
          left: pos.x,
          top:  pos.y,
          transition: isSnapping ? 'left 0.32s cubic-bezier(0.34,1.56,0.64,1), top 0.32s ease' : 'none',
          cursor: 'grab',
        }}
        onPointerDown={onPointerDown}
      >
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-400/40 select-none">
          <MessageCircle className="w-6 h-6 pointer-events-none" />
          {!open && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </div>
      </div>
    </>
  )
}