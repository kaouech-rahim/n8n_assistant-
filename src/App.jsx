import React, { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'

const TOKEN_KEY   = 'ai_auth_token'
const USER_KEY    = 'ai_auth_user'
const DARK_KEY    = 'ai_dark_mode'

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw   = localStorage.getItem(USER_KEY)
    if (token && raw) {
      try { return { token, user: JSON.parse(raw) } } catch {}
    }
    return null
  })
  const [page, setPage] = useState(auth ? 'dashboard' : 'login')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_KEY) === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(DARK_KEY, darkMode)
  }, [darkMode])

  function login(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setAuth({ token, user })
    setPage('dashboard')
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAuth(null)
    setPage('login')
  }

  function updateUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setAuth(prev => ({ ...prev, user }))
  }

  const navigate = (p) => setPage(p)

  if (page === 'signup') return <Signup navigate={navigate} onLogin={login} />
  if (auth && page === 'dashboard') return (
    <Dashboard
      auth={auth}
      onLogout={logout}
      onUpdateUser={updateUser}
      darkMode={darkMode}
      toggleDarkMode={() => setDarkMode(v => !v)}
    />
  )
  return <Login navigate={navigate} onLogin={login} />
}
