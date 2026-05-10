import React from 'react';

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <header className="mb-10 flex flex-col gap-4 border-b border-[var(--border-mid)] pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-start gap-4">
          {Icon ? (
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-mid)] bg-[var(--bg-secondary)] text-[var(--accent-text)]"
              aria-hidden
            >
              <Icon className="h-5 w-5 stroke-[1.75]" />
            </span>
          ) : null}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
