import React, { useRef, useState, useCallback } from 'react'
import { Paperclip, Send, X, Mic, Loader } from 'lucide-react'
import styles from './ChatInput.module.css'

export default function ChatInput({ onSend, isTyping, acceptedFiles = [], agentId }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const accept = acceptedFiles.length
    ? acceptedFiles.join(',')
    : 'audio/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx'

  const handleSend = useCallback(() => {
    if (!text.trim() && files.length === 0) return
    onSend({ text: text.trim(), files })
    setText('')
    setFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = ''
    }
  }, [text, files, onSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e) => {
    setText(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  const addFiles = (newFiles) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)])
  }

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const fileIcon = (type) => {
    if (type.startsWith('audio')) return '🎵'
    if (type.startsWith('video')) return '🎬'
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    return '📎'
  }

  return (
    <div
      className={`${styles.inputArea} ${dragging ? styles.dragging : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && (
        <div className={styles.dropOverlay}>
          <Paperclip size={24} />
          <span>Déposez vos fichiers ici</span>
        </div>
      )}

      {files.length > 0 && (
        <div className={styles.filePreview}>
          {files.map((f, i) => (
            <div key={i} className={styles.fileChip}>
              <span>{fileIcon(f.type)}</span>
              <span className={styles.fileName}>
                {f.name.length > 22 ? f.name.slice(0, 19) + '…' : f.name}
              </span>
              <span className={styles.fileSize}>
                {(f.size / 1024).toFixed(0)}KB
              </span>
              <button className={styles.removeFile} onClick={() => removeFile(i)}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.inputRow}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          className={styles.hiddenInput}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        <button
          className={styles.toolBtn}
          onClick={() => fileInputRef.current?.click()}
          title="Joindre un fichier"
        >
          <Paperclip size={16} />
        </button>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder={`Message pour l'agent ${agentId ? '' : ''}…`}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isTyping}
        />

        <button
          className={`${styles.sendBtn} ${(text.trim() || files.length > 0) && !isTyping ? styles.sendActive : ''}`}
          onClick={handleSend}
          disabled={(!text.trim() && files.length === 0) || isTyping}
          title="Envoyer (Entrée)"
        >
          {isTyping ? <Loader size={15} className={styles.spinner} /> : <Send size={15} />}
        </button>
      </div>

      <div className={styles.hint}>
        <span>Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</span>
        <span>Glisser-déposer des fichiers supporté</span>
      </div>
    </div>
  )
}
