import React, { useState } from 'react'
import { Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react'
import { authRegister } from '../api/client.js'

export default function Signup({ navigate, onLogin }) {
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', terms: false })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authRegister(form.name, form.email, form.password)
      onLogin(token, user)
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-orb-1" />
      <div className="auth-orb-2" />
      <div className="auth-orb-3" />

      <div className="auth-card w-full mx-4">
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Assistant</h1>
          <p className="text-sm text-slate-500 mt-1">Créez votre compte en quelques secondes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Nom complet
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Jean Dupont"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Adresse email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                className="form-input pr-11"
                placeholder="Minimum 8 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength */}
            {form.password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      form.password.length >= i * 3
                        ? i <= 1 ? 'bg-red-400'
                          : i <= 2 ? 'bg-amber-400'
                          : i <= 3 ? 'bg-emerald-400'
                          : 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`form-input pr-11 ${
                  form.confirm && form.confirm !== form.password
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                    : ''
                }`}
                placeholder="••••••••"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.confirm && form.confirm !== form.password && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-violet-600"
              required
            />
            <span className="text-sm text-slate-600 leading-relaxed">
              J'accepte les{' '}
              <button type="button" className="text-violet-600 font-medium hover:underline">conditions d'utilisation</button>
              {' '}et la{' '}
              <button type="button" className="text-violet-600 font-medium hover:underline">politique de confidentialité</button>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-center">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Déjà un compte ?{' '}
          <button
            type="button"
            onClick={() => navigate('login')}
            className="font-semibold text-violet-600 hover:text-violet-700 transition-colors"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  )
}
