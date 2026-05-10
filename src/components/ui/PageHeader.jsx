import React from 'react';

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between motion-safe:animate-[fadeIn_0.4s_ease-out_both]">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
          ) : null}
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-[var(--text-secondary)] text-[15px] leading-relaxed">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
