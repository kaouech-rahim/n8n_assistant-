import { useState, useCallback, useRef } from 'react'
import { AGENTS, N8N_BASE_URL } from '../data/agents.js'

// ─── sessionId stable par onglet ──────────────────────────────────────────
const SESSION_ID = 'web-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)

export function useChat(agentId) {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const getTime = () =>
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const initChat = useCallback((agent) => {
    setMessages([
      {
        id: Date.now(),
        role: 'bot',
        text: agent.greeting,
        time: getTime(),
        agent: agent.id,
      },
    ])
    setError(null)
  }, [])

  const sendMessage = useCallback(
    async ({ text, files = [], conversationHistory = [] }) => {
      if (!text && files.length === 0) return
      const agent = AGENTS[agentId]

      const userMsg = {
        id: Date.now(),
        role: 'user',
        text,
        files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        time: getTime(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsTyping(true)
      setError(null)

      try {
        const payload = {
          message: text,
          agent: agentId,
          sessionId: SESSION_ID,
          timestamp: new Date().toISOString(),
          history: conversationHistory.slice(-10),
          files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        }

        const webhookUrl = `${N8N_BASE_URL}/webhook/central-router`

        // ── LOG 1: vérifier l'URL ─────────────────────────────────────
        console.group(`🚀 [useChat] Envoi → ${agentId}`)
        console.log('URL complète:', webhookUrl)
        console.log('N8N_BASE_URL:', N8N_BASE_URL)
        console.log('Payload:', JSON.stringify(payload, null, 2))
        console.groupEnd()

        let botText = null
        let usedDemo = false

        try {
          if (abortRef.current) abortRef.current.abort()
          abortRef.current = new AbortController()

          const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify(payload),
            signal: abortRef.current.signal,
          })

          // ── LOG 2: statut HTTP ────────────────────────────────────
          console.log(`📡 [useChat] Réponse HTTP: ${res.status} ${res.statusText}`)

          if (res.ok) {
            const rawText = await res.text()
            console.log('📥 [useChat] Corps brut:', rawText)

            try {
              const data = JSON.parse(rawText)
              console.log('📦 [useChat] Données parsées:', data)

              botText =
                data?.output ||
                data?.message ||
                data?.text ||
                data?.response ||
                null

              if (!botText) {
                console.warn('⚠️ [useChat] Aucun champ output/message/text/response dans:', data)
                // Afficher le JSON brut plutôt que la démo
                botText = '```json\n' + JSON.stringify(data, null, 2) + '\n```'
              }
            } catch {
              console.warn('⚠️ [useChat] Corps non-JSON:', rawText)
              botText = rawText || null
            }
          } else {
            const errBody = await res.text()
            console.error(`❌ [useChat] Erreur HTTP ${res.status}:`, errBody)
            setError(`Webhook HTTP ${res.status}: ${res.statusText}`)
          }
        } catch (fetchErr) {
          // ── LOG 3: erreur réseau ──────────────────────────────────
          console.error('❌ [useChat] Fetch échoué:', fetchErr.name, fetchErr.message)
          if (fetchErr.name === 'AbortError') return
          usedDemo = true
        }

        // ── Fallback démo seulement si vraiment pas de réponse ────────
        if (!botText) {
          usedDemo = true
          const replies = agent.sampleReplies
          botText = replies[Math.floor(Math.random() * replies.length)]
          console.warn('🎭 [useChat] Fallback démo utilisé')
        }

        console.log(`✅ [useChat] Source: ${usedDemo ? '🎭 DÉMO' : '✅ N8N'} | Texte:`, botText.slice(0, 100))

        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700))

        const botMsg = {
          id: Date.now() + 1,
          role: 'bot',
          // Préfixe visuel si mode démo pour distinguer facilement
          text: usedDemo
            ? `⚠️ *[Mode démo — n8n non connecté]*\n\n${botText}`
            : botText,
          time: getTime(),
          agent: agentId,
          isDemo: usedDemo,
        }
        setMessages((prev) => [...prev, botMsg])
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('❌ [useChat] Erreur globale:', err)
          setError('Erreur de connexion. Vérifiez votre webhook n8n.')
        }
      } finally {
        setIsTyping(false)
      }
    },
    [agentId]
  )

  const clearChat = useCallback(
    (agent) => {
      initChat(agent)
    },
    [initChat]
  )

  return { messages, isTyping, error, sendMessage, initChat, clearChat }
}