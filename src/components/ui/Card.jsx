import React from 'react';

/** Surface carte — bordure slate légère, ombre neutre, pas d’animation intrusive */
export function Card({ children, className = '', padded = true }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--border-mid)] bg-[var(--bg-primary)] shadow-[var(--shadow-sm)] ${padded ? 'p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
