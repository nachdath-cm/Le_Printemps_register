import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  labelledBy: string;
  children: ReactNode;
  /** `sheet` : plein ecran en bas sur mobile, carte centree a partir de `sm`. */
  className?: string;
  /** Rend le fond non cliquable (pendant l'envoi d'un formulaire). */
  dismissible?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FORM_CONTROLS = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * Modale accessible : role=dialog + aria-modal, ferme sur Echap, piege le
 * focus et verrouille le scroll du document.
 *
 * Point d'attention : l'effet de focus ne depend QUE de `open`. Si l'effet
 * etait recree a chaque rendu (ce qui arrive des que `onClose` est une
 * fonction recreee par le parent), il volerait le focus au milieu de la
 * saisie — une lettre sur deux se perdrait.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className,
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Dernier `onClose` connu, sans recreer les abonements ni l'effet de focus.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const getFocusable = useCallback(
    () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      ),
    [],
  );

  // --- Focus au Trap + scroll : uniquement a l'ouverture / fermeture --------
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Un champ de saisie d'abord : arriver sur le bouton « Fermer » ferait
    // fermer le formulaire d'une simple pression sur Entree.
    const preferred = panelRef.current?.querySelector<HTMLElement>(FORM_CONTROLS);
    const target = preferred ?? getFocusable()[0] ?? panelRef.current;
    target?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      // Rend le focus a l'element qui avait ouvert la modale.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open, getFocusable]);

  // --- Clavier (Echap + piege a Tab) : independant de l'identite de onClose --
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (dismissible && onCloseRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, getFocusable]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="animate-fade-up absolute inset-0 bg-dark/45 backdrop-blur-[2px]"
        onClick={dismissible && onClose ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'bg-surface animate-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden',
          'rounded-t-[28px] border border-primary-light shadow-lift outline-none',
          'sm:max-w-lg sm:rounded-card',
          className,
        )}
      >
        {dismissible && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted hover:text-primary-ink hover:bg-primary-light absolute top-4 right-4 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
