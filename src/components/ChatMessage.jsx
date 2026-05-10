import React from 'react'
import { Bot, User, Paperclip } from 'lucide-react'
import styles from './ChatMessage.module.css'

function formatText(text) {
  // Bold: **text**
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`${styles.row} ${isUser ? styles.user : styles.bot}`}>
      <div className={`${styles.avatar} ${isUser ? styles.avatarUser : styles.avatarBot}`}>
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      <div className={styles.content}>
        {/* File attachments */}
        {message.files && message.files.length > 0 && (
          <div className={styles.attachments}>
            {message.files.map((f, i) => (
              <span key={i} className={styles.fileChip}>
                <Paperclip size={10} />
                {f.name.length > 20 ? f.name.slice(0, 17) + '…' : f.name}
                <span className={styles.fileSize}>
                  {f.size ? `${(f.size / 1024).toFixed(0)}KB` : ''}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Text bubble */}
        {message.text && (
          <div
            className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleBot}`}
            dangerouslySetInnerHTML={{ __html: formatText(message.text) }}
          />
        )}

        <span className={styles.time}>{message.time}</span>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className={`${styles.row} ${styles.bot}`}>
      <div className={`${styles.avatar} ${styles.avatarBot}`}>
        <Bot size={13} />
      </div>
      <div className={styles.content}>
        <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typingBubble}`}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
    </div>
  )
}
