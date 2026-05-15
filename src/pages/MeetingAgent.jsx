import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Video, Upload, FileVideo, Loader2, AlertCircle, RefreshCw,
  FileText, Sparkles, X, RotateCcw, ChevronRight,
  Check, History, CheckCircle2, Users
} from 'lucide-react'
import {
  uploadMeetingVideo,
  fetchMeetingResult,
  saveMeetingHistory,
  fetchMeetingHistory,
  saveConversation,
} from '../api/client.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  'Déclenchement du workflow n8n…',
  'Téléchargement et conversion audio…',
  'Transcription Whisper en cours…',
  'Analyse IA — génération du résumé…',
  'Extraction des tâches par personne…',
]

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Convertit les sauts de ligne en <br> pour le rendu HTML
function toHtml(text) {
  return (text || '').replace(/\n/g, '<br>')
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ file, onFile, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    e => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f && f.type.startsWith('video/')) onFile(f)
    },
    [onFile],
  )

  if (file) {
    return (
      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl ring-1 ring-orange-200">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shrink-0 shadow-md shadow-orange-200">
          <FileVideo className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{formatSize(file.size)}</p>
        </div>
        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none ${
        dragging
          ? 'border-orange-400 bg-orange-50'
          : 'border-slate-200 bg-slate-50/60 hover:border-orange-300 hover:bg-orange-50/40'
      }`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4,.mov,.webm,.avi,.mkv"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
            dragging
              ? 'bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-orange-200'
              : 'bg-orange-100'
          }`}
        >
          <Upload className={`w-7 h-7 transition-colors ${dragging ? 'text-white' : 'text-orange-500'}`} />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {dragging ? 'Relâchez pour ajouter' : 'Déposez votre vidéo de réunion ici'}
        </p>
        <p className="text-xs text-slate-400 mt-1">ou cliquez pour parcourir</p>
        <span className="mt-4 text-[11px] text-slate-400 bg-white ring-1 ring-slate-200 rounded-full px-3 py-1">
          MP4 · MOV · WEBM · AVI · MKV
        </span>
      </div>
    </div>
  )
}

// ─── Input Phase ──────────────────────────────────────────────────────────────

function InputPhase({ onSubmit, loading }) {
  const [videoFile, setVideoFile] = useState(null)
  const canSubmit = !loading && videoFile !== null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <UploadZone
        file={videoFile}
        onFile={setVideoFile}
        onRemove={() => setVideoFile(null)}
      />

      <button
        onClick={() => onSubmit({ file: videoFile })}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-orange-200 hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi de la vidéo…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Analyser le meeting
          </>
        )}
      </button>
    </div>
  )
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % LOADING_STEPS.length), 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-xl shadow-orange-200">
        <Sparkles className="w-9 h-9 text-white animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700">{LOADING_STEPS[step]}</p>
        <p className="text-xs text-slate-400">Le workflow n8n traite votre réunion en arrière-plan…</p>
      </div>
      <div className="w-52 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <style>{`@keyframes barSlide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
        <div
          className="h-full w-1/4 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
          style={{ animation: 'barSlide 1.8s ease-in-out infinite' }}
        />
      </div>
      <div className="flex gap-2">
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'bg-orange-500 scale-125' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── HTML Content Card ────────────────────────────────────────────────────────

function HtmlCard({ title, html, icon: Icon, gradient, pending = false }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-100 flex flex-col gap-4 min-h-[260px]">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {pending && !html && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-amber-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            En attente…
          </span>
        )}
      </div>
      {html ? (
        <div
          className="flex-1 text-sm text-slate-600 meeting-html"
          dangerouslySetInnerHTML={{ __html: toHtml(html) }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-300 italic">
            {pending ? 'Génération en cours…' : 'Aucun contenu.'}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Result Phase ─────────────────────────────────────────────────────────────

function ResultPhase({ result, onReset, onSave, saved }) {
  const { resume, taches, complete } = result

  return (
    <div className="space-y-5">
      {!complete && (
        <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 rounded-xl ring-1 ring-amber-100 text-sm text-amber-600">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          Résultats partiels — en attente des données restantes…
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <HtmlCard
          title="Résumé du meeting"
          html={resume}
          icon={FileText}
          gradient="from-orange-500 to-amber-400"
          pending={!complete}
        />
        <HtmlCard
          title="Tâches pour l'équipe"
          html={taches}
          icon={Users}
          gradient="from-violet-500 to-indigo-500"
          pending={!complete}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-600 text-sm font-medium rounded-xl ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Nouvelle analyse
        </button>
        {complete && (
          <button
            onClick={onSave}
            disabled={saved}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold rounded-xl shadow-sm hover:brightness-105 transition-all disabled:opacity-60"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Enregistré</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Enregistrer le résultat</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({ items }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Historique des analyses</span>
          <span className="text-[11px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">
            {items.length}
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {items.map(item => {
            const res = item.result || {}
            const preview = (res.resume || '').replace(/<[^>]+>/g, '').slice(0, 100)
            return (
              <div key={item.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-xs font-medium text-slate-600 truncate flex-1">
                    {(item.transcription || '').slice(0, 70)}…
                  </p>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(item.savedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                {preview && (
                  <p className="text-[11px] text-slate-400 truncate">{preview}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MeetingAgent() {
  const [phase, setPhase] = useState('input')   // 'input' | 'loading' | 'result'
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [history, setHistory] = useState([])
  const [lastTranscription, setLastTranscription] = useState('')
  const [saved, setSaved]     = useState(false)
  const pollRef = useRef(false)

  useEffect(() => {
    fetchMeetingHistory().then(setHistory).catch(() => {})
  }, [])

  async function handleSubmit({ file }) {
    const transcription = file.name
    setLastTranscription(transcription)
    setError('')
    setSaved(false)
    setResult(null)
    setPhase('loading')
    pollRef.current = true

    try {
      const resp = await uploadMeetingVideo(file)
      // n8n répond immédiatement {success, since} — traitement asynchrone en arrière-plan
      const since = resp?.since ?? Date.now()

      const MAX_WAIT = 600_000  // 10 min — traitement Whisper + IA peut être long
      const start = Date.now()
      let localResult = null

      while (pollRef.current && Date.now() - start < MAX_WAIT) {
        await new Promise(r => setTimeout(r, 2500))
        if (!pollRef.current) break

        const data = await fetchMeetingResult(since).catch(() => null)
        if (data && (data.resume || data.taches)) {
          localResult = data
          setResult(data)
          setPhase('result')
          if (data.complete) {
            // Auto-save as soon as both resume + taches arrive
            try {
              const savedItem = await saveMeetingHistory(transcription, data)
              const convId = savedItem?.item?.id ? `meeting-${savedItem.item.id}` : undefined
              const msgs = [
                { role: 'user', kind: 'file', text: transcription, ts: Date.now() - 5000 },
                data.resume && { role: 'bot', kind: 'resume', html: data.resume, ts: Date.now() - 3000 },
                data.taches && { role: 'bot', kind: 'taches', html: data.taches, ts: Date.now() },
              ].filter(Boolean)
              await saveConversation('meeting', transcription, msgs, convId)
              setSaved(true)
              fetchMeetingHistory().then(setHistory).catch(() => {})
            } catch {}
            return
          }
        }
      }

      if (pollRef.current && !localResult) {
        setError('Délai dépassé — le workflow n8n n\'a pas répondu dans les 3 minutes.')
        setPhase('input')
      }
    } catch (e) {
      if (pollRef.current) {
        setError(e.message)
        setPhase('input')
      }
    } finally {
      pollRef.current = false
    }
  }

  function handleReset() {
    pollRef.current = false
    setResult(null)
    setPhase('input')
  }

  async function handleSave() {
    if (!result || saved) return
    try {
      const saved_item = await saveMeetingHistory(lastTranscription, result)
      // Use meeting-{item.id} as deterministic ID to avoid duplicates with meeting_history fallback
      const convId = saved_item?.item?.id ? `meeting-${saved_item.item.id}` : undefined
      const msgs = [
        { role: 'user', kind: 'file', text: lastTranscription, ts: Date.now() - 5000 },
        result.resume  && { role: 'bot', kind: 'resume',  html: result.resume,  ts: Date.now() - 3000 },
        result.taches  && { role: 'bot', kind: 'taches',  html: result.taches,  ts: Date.now() },
      ].filter(Boolean)
      await saveConversation('meeting', lastTranscription, msgs, convId).catch(() => {})
      setSaved(true)
      const updated = await fetchMeetingHistory()
      setHistory(updated)
    } catch {}
  }

  return (
    <div className="p-6 space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-orange-200">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Réunion & Tâches</h1>
          <p className="text-xs text-slate-500">
            Transcription Whisper · Résumé IA · Extraction de tâches par personne
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 rounded-xl ring-1 ring-red-100 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {phase === 'input'   && <InputPhase onSubmit={handleSubmit} loading={false} />}
      {phase === 'loading' && <LoadingScreen />}
      {phase === 'result'  && result && (
        <ResultPhase
          result={result}
          saved={saved}
          onReset={handleReset}
          onSave={handleSave}
        />
      )}

      <HistoryPanel items={history} />
    </div>
  )
}
