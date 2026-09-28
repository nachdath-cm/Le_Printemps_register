import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  size?: Size;
  /** Icône lucide placee à gauche du libelle (style du site). */
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  // Fond orange assombri : #f2824e ne donne que 2.6:1 avec du texte blanc.
  primary: cn(
    'bg-primary-strong text-white shadow-brand',
    'hover:bg-primary-strong-hover hover:-translate-y-0.5 hover:shadow-brand-lg',
    'active:translate-y-0',
  ),
  secondary: 'border-primary text-primary-ink bg-transparent hover:bg-primary-light',
  ghost: 'text-primary-ink hover:bg-primary-light',
};

const SIZES: Record<Size, string> = {
  sm: 'px-5 py-2 text-sm',
  md: 'px-7 py-3 text-[0.95rem]',
  lg: 'px-8 py-4 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill border border-transparent',
        'font-sans font-medium transition-all duration-300 ease-smooth',
        'disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <SpinnerIcon /> : icon}
      {children}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="size-4 shrink-0 animate-spin-slow"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
