import React from 'react';

/** Carte surface avec bordure — alignée sur les variables CSS globales */
export function Card({ children, className = '', padded = true }) {
  return (
    <div
      className={`rounded-xl border border-[var(--border-mid)] bg-[var(--bg-primary)] shadow-[var(--shadow-sm)] motion-safe:animate-[slideInUp_0.35s_ease-out_both] ${padded ? 'p-6' : ''} ${className}`}
      style={{ animationDelay: '30ms' }}
    >
      {children}
    </div>
  );
}
