import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  CalendarDays, Plus, Edit3, List, Trash2,
  ChevronLeft, ChevronRight, MapPin, Clock, Users,
  Check, X, Search, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { apiPost, apiGet } from '../api/client.js'
import TEAM_DATA from '../data/team.json'

// ─── Calendar helpers ──────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstWeekday(year, month) {
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7 // Sun=0 → Mon=0
}

function padDate(n) {
  return String(n).padStart(2, '0')
}

function makeDateStr(year, month, day) {
  return `${year}-${padDate(month + 1)}-${padDate(day)}`
}

function formatDateFR(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── CalendarPicker ────────────────────────────────────────────────────────────

function CalendarPicker({ selected, onChange }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const daysCount = getDaysInMonth(viewYear, viewMonth)
  const firstWeekday = getFirstWeekday(viewYear, viewMonth)

  const todayStr = makeDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysCount; d++) cells.push(d)

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {MONTHS_FR[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1.5">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const dateStr = makeDateStr(viewYear, viewMonth, day)
          const isSelected = dateStr === selected
          const isToday = dateStr === todayStr
          return (
            <button
              key={dateStr}
              onClick={() => onChange(dateStr)}
              className={[
                'aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                isSelected
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-200'
                  : isToday
                  ? 'ring-1 ring-emerald-300 text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── TimePicker ────────────────────────────────────────────────────────────────

function TimePicker({ value, onChange, focusColor = 'focus:ring-emerald-300 focus:border-emerald-300' }) {
  const parts = (value || '09:00').split(':')
  const hour = parts[0] || '09'
  const minute = parts[1] || '00'

  const hours = Array.from({ length: 24 }, (_, i) => padDate(i))
  const minutes = ['00', '15', '30', '45']

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
      <select
        value={hour}
        onChange={e => onChange(`${e.target.value}:${minute}`)}
        className={`flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 ${focusColor}`}
      >
        {hours.map(h => <option key={h} value={h}>{h}h</option>)}
      </select>
      <span className="text-slate-400 font-bold text-sm">:</span>
      <select
        value={minute}
        onChange={e => onChange(`${hour}:${e.target.value}`)}
        className={`flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 ${focusColor}`}
      >
        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

// ─── ParticipantsSelector ──────────────────────────────────────────────────────

function ParticipantsSelector({ selected, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = useMemo(
    () =>
      TEAM_DATA.filter(
        m =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()),
      ).slice(0, 8),
    [search],
  )

  function toggle(member) {
    const exists = selected.some(m => m.email === member.email)
    onChange(exists ? selected.filter(m => m.email !== member.email) : [...selected, member])
  }

  const initials = name =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  return (
    <div ref={wrapRef} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(m => (
            <span
              key={m.email}
              className="flex items-center gap-1.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-full pl-2.5 pr-1.5 py-1"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                {initials(m.name)[0]}
              </span>
              {m.name}
              <button
                onClick={() => toggle(m)}
                className="w-3.5 h-3.5 rounded-full bg-emerald-200 hover:bg-emerald-300 flex items-center justify-center transition-colors"
              >
                <X className="w-2 h-2" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un participant…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg ring-1 ring-slate-100 z-20 max-h-48 overflow-y-auto">
          {filtered.map(member => {
            const isSelected = selected.some(m => m.email === member.email)
            return (
              <button
                key={member.email}
                onClick={() => { toggle(member); setSearch('') }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                  isSelected ? 'bg-emerald-50/60' : ''
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {initials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{member.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{member.role} · {member.email}</p>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Shared field styles ───────────────────────────────────────────────────────

const fieldBase =
  'w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2'

function FieldLabel({ children }) {
  return <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{children}</label>
}

function ErrorBanner({ msg }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl ring-1 ring-red-100 text-sm text-red-600">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {msg}
    </div>
  )
}

// ─── Recurrence options (matches Switch4 in n8n workflow) ─────────────────────

const RECURRENCE_OPTS = [
  { value: 'once',    label: 'Une fois'  },
  { value: 'daily',   label: 'Quotidien' },
  { value: 'weekly',  label: 'Hebdo.'    },
  { value: 'monthly', label: 'Mensuel'   },
]

// ─── Create Event Form ─────────────────────────────────────────────────────────

function CreateEventForm() {
  const [title,        setTitle]        = useState('')
  const [date,         setDate]         = useState('')
  const [startTime,    setStartTime]    = useState('09:00')
  const [endTime,      setEndTime]      = useState('10:00')
  const [recurrence,   setRecurrence]   = useState('once')
  const [participants, setParticipants] = useState([])
  const [location,     setLocation]     = useState('')
  const [status,       setStatus]       = useState('idle')
  const [errorMsg,     setErrorMsg]     = useState('')

  const canSubmit = status !== 'loading' && title.trim() && date

  async function handleCreate() {
    if (!canSubmit) return
    setStatus('loading'); setErrorMsg('')
    try {
      // Build ISO datetimes expected by n8n Edit Fields1 node
      await apiPost('/calendar-action', {
        action:     'create',
        title:      title.trim(),
        date_start: `${date}T${startTime}:00`,
        date_end:   `${date}T${endTime}:00`,
        attendees:  participants.map(p => p.email),
        recurrence,
        location:   location.trim() || undefined,
      })
      setStatus('success')
      setTimeout(() => {
        setStatus('idle'); setTitle(''); setDate(''); setStartTime('09:00')
        setEndTime('10:00'); setRecurrence('once'); setParticipants([]); setLocation('')
      }, 2500)
    } catch (e) {
      setErrorMsg(e.message); setStatus('error')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — calendar */}
      <div className="space-y-3">
        <FieldLabel>
          Date *
          {date && (
            <span className="ml-2 text-emerald-600 font-medium normal-case">
              {formatDateFR(date)}
            </span>
          )}
        </FieldLabel>
        <CalendarPicker selected={date} onChange={setDate} />
      </div>

      {/* Right — other fields */}
      <div className="space-y-4 flex flex-col">
        <div>
          <FieldLabel>Titre de l'événement *</FieldLabel>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex : Réunion hebdomadaire équipe…"
            className={`${fieldBase} focus:ring-emerald-300 focus:border-emerald-300`}
          />
        </div>

        {/* Recurrence — routes Switch4 in n8n */}
        <div>
          <FieldLabel>Récurrence</FieldLabel>
          <div className="flex p-1 gap-1 bg-slate-100 rounded-xl">
            {RECURRENCE_OPTS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecurrence(opt.value)}
                className={`flex-1 text-[11px] font-semibold py-2 rounded-lg transition-all ${
                  recurrence === opt.value
                    ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start + end time side-by-side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Heure de début *</FieldLabel>
            <TimePicker value={startTime} onChange={setStartTime} />
          </div>
          <div>
            <FieldLabel>Heure de fin *</FieldLabel>
            <TimePicker value={endTime} onChange={setEndTime} />
          </div>
        </div>

        <div>
          <FieldLabel>
            Participants{' '}
            <span className="font-normal text-slate-400">(optionnel)</span>
          </FieldLabel>
          <ParticipantsSelector selected={participants} onChange={setParticipants} />
        </div>

        <div>
          <FieldLabel>
            Lieu{' '}
            <span className="font-normal text-slate-400">(optionnel)</span>
          </FieldLabel>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ex : Salle A, Teams, Bureau…"
              className={`${fieldBase} pl-9 focus:ring-emerald-300 focus:border-emerald-300`}
            />
          </div>
        </div>

        {status === 'error' && <ErrorBanner msg={errorMsg} />}

        <button
          onClick={handleCreate}
          disabled={!canSubmit}
          className="mt-auto w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-200 hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours…</>
          ) : status === 'success' ? (
            <><CheckCircle2 className="w-4 h-4" /> Événement créé !</>
          ) : (
            <><Plus className="w-4 h-4" /> Créer l'événement</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Update Event Form ─────────────────────────────────────────────────────────

function UpdateEventForm() {
  const [eventName, setEventName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const canSubmit = status !== 'loading' && eventName.trim()

  async function handleUpdate() {
    if (!canSubmit) return
    setStatus('loading'); setErrorMsg('')
    try {
      await apiPost('/calendar-action', {
        action: 'update',
        title: eventName.trim(),
        ...(date && { date }),
        time,
      })
      setStatus('success')
      setTimeout(() => { setStatus('idle'); setEventName(''); setDate(''); setTime('09:00') }, 2500)
    } catch (e) {
      setErrorMsg(e.message); setStatus('error')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — calendar */}
      <div className="space-y-3">
        <FieldLabel>
          Nouvelle date
          {date && (
            <span className="ml-2 text-blue-600 font-medium normal-case">
              {formatDateFR(date)}
            </span>
          )}
        </FieldLabel>
        <CalendarPicker selected={date} onChange={setDate} />
      </div>

      {/* Right */}
      <div className="space-y-4 flex flex-col">
        <div>
          <FieldLabel>Nom de l'événement à modifier *</FieldLabel>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Entrez le nom exact de l'événement…"
            className={`${fieldBase} focus:ring-blue-300 focus:border-blue-300`}
          />
        </div>

        <div>
          <FieldLabel>Nouvel horaire</FieldLabel>
          <TimePicker
            value={time}
            onChange={setTime}
            focusColor="focus:ring-blue-300 focus:border-blue-300"
          />
        </div>

        {status === 'error' && <ErrorBanner msg={errorMsg} />}

        <button
          onClick={handleUpdate}
          disabled={!canSubmit}
          className="mt-auto w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-200 hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Modification en cours…</>
          ) : status === 'success' ? (
            <><CheckCircle2 className="w-4 h-4" /> Événement mis à jour !</>
          ) : (
            <><Edit3 className="w-4 h-4" /> Valider la modification</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Get Events Panel ──────────────────────────────────────────────────────────

function GetEventsPanel() {
  const [events,  setEvents]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function fetchEvents() {
    setLoading(true); setError('')
    try {
      // n8n workflow uses fire-and-forget: responds { success, since } immediately,
      // then HTTP Request node POSTs events to /api/calendar-result
      const resp = await apiPost('/calendar-action', { action: 'get' })
      const since = resp?.since ?? Date.now()
      const MAX_WAIT = 30_000
      const start = Date.now()

      while (Date.now() - start < MAX_WAIT) {
        await new Promise(r => setTimeout(r, 2000))
        const data = await apiGet(`/calendar-result?since=${since}`).catch(() => null)
        if (data?.events) {
          setEvents(data.events)
          setLoading(false)
          return
        }
      }
      throw new Error('Délai dépassé — vérifiez que le workflow n8n est actif.')
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  if (!events) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        {error && <ErrorBanner msg={error} />}
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-sm font-semibold rounded-xl shadow-sm shadow-purple-200 hover:brightness-105 transition-all disabled:opacity-40"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
          ) : (
            <><List className="w-4 h-4" /> Charger mes événements</>
          )}
        </button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <CalendarDays className="w-10 h-10 text-slate-200" />
        <p className="text-sm text-slate-400">Aucun événement trouvé.</p>
        <button
          onClick={() => setEvents(null)}
          className="text-xs text-purple-500 hover:underline"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">
          {events.length} événement{events.length > 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setEvents(null)}
          className="text-xs text-purple-500 hover:underline"
        >
          Actualiser
        </button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {events.map((ev, i) => {
          // Google Calendar node returns start.dateTime or start.date
          const rawDt = ev.start?.dateTime || ev.start?.date || ev.date
          const evDate = rawDt ? new Date(rawDt) : null
          const timeLabel = ev.start?.dateTime
            ? new Date(ev.start.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : ev.time ?? null
          return (
            <div
              key={ev.id ?? i}
              className="flex items-start gap-3 p-3.5 bg-white rounded-xl ring-1 ring-slate-100 hover:ring-purple-100 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex flex-col items-center justify-center text-purple-600 shrink-0">
                {evDate ? (
                  <>
                    <span className="text-[9px] font-bold uppercase leading-none">
                      {evDate.toLocaleDateString('fr-FR', { month: 'short' })}
                    </span>
                    <span className="text-base font-extrabold leading-none">{evDate.getDate()}</span>
                  </>
                ) : (
                  <CalendarDays className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {ev.summary || ev.title || 'Sans titre'}
                </p>
                {timeLabel && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeLabel}
                  </p>
                )}
                {ev.location && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" /> {ev.location}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Delete Event Form ─────────────────────────────────────────────────────────

function DeleteEventForm() {
  const [eventName, setEventName] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const canSubmit = status !== 'loading' && eventName.trim()

  async function handleDelete() {
    if (!canSubmit) return
    setStatus('loading'); setErrorMsg('')
    try {
      await apiPost('/calendar-action', { action: 'delete', title: eventName.trim() })
      setStatus('success')
      setTimeout(() => { setStatus('idle'); setEventName('') }, 2500)
    } catch (e) {
      setErrorMsg(e.message); setStatus('error')
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <FieldLabel>Nom de l'événement à supprimer *</FieldLabel>
        <input
          type="text"
          value={eventName}
          onChange={e => setEventName(e.target.value)}
          placeholder="Entrez le nom exact de l'événement…"
          className={`${fieldBase} focus:ring-red-300 focus:border-red-300`}
        />
      </div>

      {status === 'error' && <ErrorBanner msg={errorMsg} />}

      <button
        onClick={handleDelete}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-200 hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Suppression en cours…</>
        ) : status === 'success' ? (
          <><CheckCircle2 className="w-4 h-4" /> Événement supprimé !</>
        ) : (
          <><Trash2 className="w-4 h-4" /> Supprimer l'événement</>
        )}
      </button>
    </div>
  )
}

// ─── Action Cards ──────────────────────────────────────────────────────────────

const ACTION_CARDS = [
  {
    id: 'create',
    label: 'Créer un événement',
    icon: Plus,
    desc: 'Planifiez un nouveau meeting ou rendez-vous.',
    gradient: 'from-emerald-500 to-teal-500',
    activeRing: 'ring-emerald-300',
    ring: 'ring-emerald-100',
    formTitle: 'Créer un nouvel événement',
    titleIcon: Plus,
    titleColor: 'text-emerald-500',
  },
  {
    id: 'update',
    label: 'Modifier un événement',
    icon: Edit3,
    desc: "Changez la date, l'heure ou le lieu.",
    gradient: 'from-blue-500 to-indigo-500',
    activeRing: 'ring-blue-300',
    ring: 'ring-blue-100',
    formTitle: 'Modifier un événement',
    titleIcon: Edit3,
    titleColor: 'text-blue-500',
  },
  {
    id: 'list',
    label: 'Voir mes événements',
    icon: List,
    desc: "Consultez l'agenda en cours.",
    gradient: 'from-purple-500 to-violet-500',
    activeRing: 'ring-purple-300',
    ring: 'ring-purple-100',
    formTitle: 'Tous mes événements',
    titleIcon: List,
    titleColor: 'text-purple-500',
  },
  {
    id: 'delete',
    label: 'Supprimer un événement',
    icon: Trash2,
    desc: 'Retirez un événement du calendrier.',
    gradient: 'from-red-500 to-rose-500',
    activeRing: 'ring-red-300',
    ring: 'ring-red-100',
    formTitle: 'Supprimer un événement',
    titleIcon: Trash2,
    titleColor: 'text-red-500',
  },
]

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function CalendarAgent() {
  const [activeCard, setActiveCard] = useState(null)

  const active = ACTION_CARDS.find(c => c.id === activeCard)

  return (
    <div className="p-6 space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-200">
          <CalendarDays className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Google Calendar</h1>
          <p className="text-xs text-slate-500">Planification intelligente · Gestion de votre agenda</p>
        </div>
      </div>

      {/* 4 action cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ACTION_CARDS.map(card => {
          const { id, label, icon: Icon, desc, gradient, ring, activeRing } = card
          const isActive = activeCard === id
          return (
            <button
              key={id}
              onClick={() => setActiveCard(isActive ? null : id)}
              className={[
                'group text-left rounded-2xl p-4 shadow-sm ring-1 transition-all',
                isActive
                  ? `bg-white ${activeRing} shadow-md`
                  : `bg-white ${ring} hover:shadow-md`,
              ].join(' ')}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm mb-3`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p
                className={`text-[13px] font-semibold mb-1 transition-colors leading-snug ${
                  isActive ? 'text-slate-900' : 'text-slate-700'
                }`}
              >
                {label}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
            </button>
          )
        })}
      </div>

      {/* Expanded form panel */}
      {active && (
        <div className="bg-slate-50/80 rounded-2xl ring-1 ring-slate-200 p-5 page-enter">
          <h2
            className={`text-sm font-bold text-slate-700 mb-5 flex items-center gap-2 ${active.titleColor}`}
          >
            <active.titleIcon className="w-4 h-4" />
            <span className="text-slate-700">{active.formTitle}</span>
          </h2>

          {activeCard === 'create' && <CreateEventForm key="create" />}
          {activeCard === 'update' && <UpdateEventForm key="update" />}
          {activeCard === 'list'   && <GetEventsPanel key="list" />}
          {activeCard === 'delete' && <DeleteEventForm key="delete" />}
        </div>
      )}
    </div>
  )
}
