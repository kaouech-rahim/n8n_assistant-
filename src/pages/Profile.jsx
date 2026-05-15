import React, { useState, useRef } from 'react'
import {
  User, Mail, Shield, Settings, Zap, CheckCircle2,
  Video, FileText, CalendarDays, LogOut, Edit3,
  Server, Globe, Activity, Bell, Loader2, Camera,
  Lock, Eye, EyeOff, Sun, Moon, Check, X,
} from 'lucide-react'
import { authUpdateMe, authUploadAvatar, authChangePassword } from '../api/client.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'mail',     label: 'Mail Agent',       icon: Mail,         color: 'bg-blue-100 text-blue-600',           active: true  },
  { id: 'meeting',  label: 'Réunion & Tâches', icon: Video,        color: 'bg-orange-100 text-orange-600',       active: true  },
  { id: 'calendar', label: 'Google Calendar',  icon: CalendarDays, color: 'bg-emerald-100 text-emerald-600',     active: true  },
  { id: 'document', label: 'Document Agent',   icon: FileText,     color: 'bg-purple-100 text-purple-600',       active: true  },
]

function SectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h3>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ height: '22px', minWidth: '40px' }}
      className={`relative rounded-full transition-all shrink-0 ${on ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <span
        style={{ width: '18px', height: '18px' }}
        className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
      />
    </div>
  )
}

// ─── Tab: Profil ──────────────────────────────────────────────────────────────

function ProfileTab({ user, onUpdateUser }) {
  const [editMode, setEditMode] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveMsg,  setSaveMsg]  = useState('')
  const [name,   setName]   = useState(user?.name  || '')
  const [email,  setEmail]  = useState(user?.email || '')
  const [role,   setRole]   = useState(user?.role  || '')
  const [bio,    setBio]    = useState(user?.bio   || '')
  const [avatar, setAvatar] = useState(user?.avatar || null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      const { user: updated } = await authUpdateMe(name, role, bio)
      onUpdateUser?.({ ...updated, avatar })
      setSaveMsg('Profil mis à jour ✓')
      setEditMode(false)
    } catch (e) {
      setSaveMsg(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { avatar: url } = await authUploadAvatar(file)
      setAvatar(url)
      onUpdateUser?.({ ...user, name, role, bio, avatar: url })
    } catch (e) {
      setSaveMsg(e.message || 'Erreur upload avatar')
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setUploading(false)
    }
  }

  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 relative">
          <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute right-12 bottom-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/2" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-4">
            {/* Avatar */}
            <div className="relative group">
              {avatar
                ? <img src={avatar} alt="" className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg" />
                : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white dark:ring-slate-900">
                    {initials}
                  </div>
              }
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploading
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />
                }
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex items-center gap-2">
              {saveMsg && (
                <span className={`text-xs font-medium ${saveMsg.includes('✓') ? 'text-emerald-500' : 'text-red-500'}`}>
                  {saveMsg}
                </span>
              )}
              <button
                onClick={editMode ? handleSave : () => setEditMode(true)}
                disabled={saving}
                className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl transition-all disabled:opacity-60 ${
                  editMode
                    ? 'bg-violet-500 text-white shadow-sm shadow-violet-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                {editMode ? (saving ? 'Sauvegarde…' : 'Enregistrer') : 'Modifier'}
              </button>
            </div>
          </div>

          {editMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Nom complet" value={name} onChange={setName} />
                <InputField label="Rôle" value={role} onChange={setRole} />
              </div>
              <InputField label="Email" value={email} onChange={setEmail} type="email" />
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  placeholder="Parlez-nous de vous…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{email}</p>
              {bio && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{bio}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 text-[11px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full px-2.5 py-1">
                  <Shield className="w-3 h-3" /> {role || 'Utilisateur'}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="w-3 h-3" /> Actif
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agents status */}
      <div>
        <SectionTitle>Agents configurés</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AGENTS.map(({ id, label, icon: Icon, color, active: agentActive }) => (
            <div key={id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm flex flex-col items-center gap-2.5 text-center">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">{label}</p>
              <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                agentActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 text-slate-400'
              }`}>
                {agentActive ? '● Actif' : '○ Inactif'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* App config */}
      <div>
        <SectionTitle>Configuration</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
          {[
            { icon: Server,   label: 'Backend API',  value: 'localhost:3001', mono: true  },
            { icon: Globe,    label: 'n8n Webhook',  value: 'localhost:5678', mono: true  },
            { icon: Activity, label: 'Version',      value: '1.0.0',          mono: false },
            { icon: Zap,      label: 'Mode',         value: 'Développement',  mono: false },
          ].map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
              </div>
              <span className={`text-xs ${mono ? 'font-mono' : 'font-medium'} text-slate-400`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Paramètres ──────────────────────────────────────────────────────────

function SettingsTab({ onLogout, darkMode, toggleDarkMode }) {
  const [oldPwd,   setOldPwd]   = useState('')
  const [newPwd,   setNewPwd]   = useState('')
  const [confPwd,  setConfPwd]  = useState('')
  const [showOld,  setShowOld]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [pwdMsg,   setPwdMsg]   = useState('')
  const [pwdOk,    setPwdOk]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [prefs, setPrefs] = useState({
    notifications: true,
    sounds: false,
  })

  async function handleChangePwd(e) {
    e.preventDefault()
    if (newPwd !== confPwd) { setPwdMsg('Les mots de passe ne correspondent pas'); return }
    if (newPwd.length < 8) { setPwdMsg('Minimum 8 caractères'); return }
    setSaving(true); setPwdMsg(''); setPwdOk(false)
    try {
      await authChangePassword(oldPwd, newPwd)
      setPwdOk(true)
      setPwdMsg('Mot de passe modifié avec succès ✓')
      setOldPwd(''); setNewPwd(''); setConfPwd('')
    } catch (err) {
      setPwdMsg(err.message || 'Erreur')
    } finally {
      setSaving(false)
      setTimeout(() => setPwdMsg(''), 4000)
    }
  }

  return (
    <div className="space-y-6">

      {/* Apparence */}
      <div>
        <SectionTitle>Apparence</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-amber-50'}`}>
                {darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {darkMode ? 'Mode nuit actif' : 'Mode jour actif'}
                </p>
                <p className="text-[11px] text-slate-400">Basculer entre thème clair et sombre</p>
              </div>
            </div>
            <Toggle on={darkMode} onChange={toggleDarkMode} />
          </div>
        </div>
      </div>

      {/* Préférences */}
      <div>
        <SectionTitle>Préférences</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
          {[
            { id: 'notifications', label: 'Notifications push',  desc: 'Recevoir des alertes en temps réel' },
            { id: 'sounds',        label: "Sons de l'interface", desc: 'Effets sonores sur les actions'     },
          ].map(({ id, label, desc }) => (
            <div key={id} className="flex items-center justify-between px-4 py-3.5 gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
              </div>
              <Toggle on={prefs[id]} onChange={v => setPrefs(p => ({ ...p, [id]: v }))} />
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div>
        <SectionTitle>Sécurité</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Changer le mot de passe</p>
          </div>

          <form onSubmit={handleChangePwd} className="space-y-3">
            {/* Old password */}
            <div className="relative">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Mot de passe actuel</label>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button type="button" onClick={() => setShowOld(v => !v)} className="absolute right-3 top-[28px] text-slate-400 hover:text-slate-600">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* New password */}
            <div className="relative">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Nouveau mot de passe</label>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-[28px] text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confPwd}
                onChange={e => setConfPwd(e.target.value)}
                required
                className={`w-full px-3 py-2 text-sm border rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 ${
                  confPwd && confPwd !== newPwd ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {confPwd && confPwd !== newPwd && (
                <p className="text-[10px] text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {pwdMsg && (
              <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${
                pwdOk ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500'
              }`}>
                {pwdOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {pwdMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !oldPwd || !newPwd || newPwd !== confPwd}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? 'En cours…' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Déconnexion</p>
          <p className="text-xs text-slate-400 mt-0.5">Mettre fin à la session en cours</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 text-sm font-semibold rounded-xl ring-1 ring-red-100 dark:ring-red-900/40 hover:bg-red-100 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Profile({ user, onLogout, onUpdateUser, initialTab = 'profile', darkMode, toggleDarkMode }) {
  const [tab, setTab] = useState(initialTab === 'settings' ? 'settings' : 'profile')

  const tabs = [
    { id: 'profile',  label: 'Mon profil',  icon: User     },
    { id: 'settings', label: 'Paramètres',  icon: Settings },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile'  && <ProfileTab  user={user} onUpdateUser={onUpdateUser} />}
      {tab === 'settings' && <SettingsTab onLogout={onLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
    </div>
  )
}
