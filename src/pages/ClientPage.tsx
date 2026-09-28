import { useCallback, useState } from 'react';

import { INSTITUTE } from '../config/institute';
import { ClientRegisterModal } from '../components/ClientRegisterModal';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';

/**
 * Page client — ouverte en scannant le QR.
 * Mobile-first : la modale occupe l'ecran, le fond n'est qu'un appoint si
 * le client l'a fermee.
 */
export function ClientPage() {
  const [open, setOpen] = useState(true);
  const reopen = useCallback(() => setOpen(true), []);

  return (
    <div className="bg-cream flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        {/* Le nom est deja dans le logo : titre reserve aux lecteurs d'ecran. */}
        <h1 className="sr-only">{INSTITUTE.name} — inscription</h1>
        <Logo size={64} />
        <p className="eyebrow">{INSTITUTE.tagline}</p>
      </div>

      {!open && (
        <div className="animate-fade-up mt-8 flex flex-col items-center gap-3">
          <Button onClick={reopen} size="lg">
            Ouvrir le formulaire
          </Button>
          <p className="text-muted text-center text-xs">
            {INSTITUTE.location} · {INSTITUTE.phoneDisplay}
          </p>
        </div>
      )}

      <ClientRegisterModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
