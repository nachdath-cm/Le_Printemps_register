import { LogOut, QrCode } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '../lib/utils';
import { Logo } from './Logo';

export interface AdminHeaderProps {
  children?: ReactNode;
  onSignOut?: () => void;
}

/**
 * Header blanc, logo a gauche, action orange a droite.
 * Le logo depose par l'institut contient deja la mention « LE PRINTEMPS » :
 * on ne lui ajoute donc pas de texte a cote, ce qui le doublerait.
 */
export function AdminHeader({ children, onSignOut }: AdminHeaderProps) {
  return (
    <header className="border-primary-light bg-surface/95 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-[90px] sm:px-6">
        <Link to="/borne" className="flex items-center gap-3" aria-label="Le Printemps — page d'accueil">
          <Logo size={40} />
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {children}

          <Link
            to="/borne"
            className="text-primary-ink border-primary hover:bg-primary-light inline-flex items-center gap-2 rounded-pill border px-4 py-2 font-sans text-sm font-medium transition-colors sm:px-5"
          >
            <QrCode className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Borne</span>
          </Link>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className={cn(
                'bg-primary-strong text-white shadow-brand hover:bg-primary-strong-hover',
                'inline-flex cursor-pointer items-center gap-2 rounded-pill px-4 py-2',
                'font-sans text-sm font-medium transition-all duration-300 sm:px-5 sm:py-2.5',
              )}
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sortir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
