import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** `cream` = carte de service (fond creme + bordure fine), `white` = carte modale. */
  tone?: 'cream' | 'white';
}

export function Card({ tone = 'cream', className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border',
        tone === 'cream'
          ? 'border-card-border bg-card'
          : 'border-primary-light bg-surface shadow-card',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Pastille : categorie d'onglets, chips, boutons de filtre. */
export function Pill({
  active = false,
  tone = 'orange',
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  tone?: 'orange' | 'soft';
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-sans font-medium whitespace-nowrap',
        tone === 'orange'
          ? active
            ? 'bg-primary-strong text-white shadow-brand'
            : 'text-muted hover:text-primary-ink hover:bg-primary-light'
          : active
            ? 'bg-primary-light text-primary-ink'
            : 'text-muted',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Carre arrondi orange pale qui enveloppe une icone — motif du site. */
export function IconTile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'bg-primary-light text-primary-ink flex size-11 shrink-0 items-center justify-center rounded-icon',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Onglet / filtre cliquable — un vrai <button>, pas un span a role. */
export function FilterPill({
  active = false,
  onClick,
  className,
  children,
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-4 py-2',
        'font-sans text-sm font-medium whitespace-nowrap transition-all duration-200',
        active
          ? 'bg-primary-strong text-white shadow-brand'
          : 'text-muted hover:text-primary-ink hover:bg-primary-light',
        className,
      )}
    >
      {children}
    </button>
  );
}
