import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { INSTITUTE } from '../config/institute';
import { formatDayLabel, localDayKey } from '../lib/utils';
import { Logo } from '../components/Logo';
import { ClientRegisterModal } from '../components/ClientRegisterModal';

/**
 * Page cote employee — optimisee tablette.
 * Le QR s'affiche en permanence : l'employee laisse simplement la tablette
 * sur le comptoir, le client scanne avec son telephone et le formulaire
 * s'ouvre sur son ecran (`/client`).
 */
export function EmployeePage() {
  const [stats, setStats] = useState<{ total: number; waiting: number } | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const day = localDayKey();

  // URL absolue du formulaire client, resolue sur l'hote courant.
  // Derivee pendant le rendu : pas d'effet, pas de clignotement du QR.
  const clientUrl = new URL('/client', window.location.origin).toString();

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats/today');
      if (!response.ok) throw new Error(String(response.status));
      setStats((await response.json()) as { total: number; waiting: number });
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }, []);

  useEffect(() => {
    void loadStats();
    // Rafraichit le compteur toutes les 30 s : plusieurs employees, plusieurs tablettes.
    const timer = window.setInterval(() => void loadStats(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadStats]);

  const copyLink = async () => {
    if (!clientUrl) return;
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-cream flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-7 px-5 py-10 sm:py-14">
        <header className="animate-fade-up flex flex-col items-center gap-3 text-center">
          {/*
            Le logo contient deja « Le Printemps », en plus grand que ne le
            serait ce titre : l'afficher une seconde fois ferait doublon. Le
            titre est conserve pour les lecteurs d'ecran et le référencement.
          */}
          <h1 className="sr-only">{INSTITUTE.name} — borne d'inscription</h1>
          <Logo size={72} />
          <p className="eyebrow">{INSTITUTE.location}</p>
        </header>

        {/* --- Carte blanche centree : le QR ----------------------------- */}
        <section
          aria-label="QR code d'inscription"
          className="bg-surface animate-pop border-primary-light w-full max-w-md rounded-card border p-6 shadow-card sm:p-8"
        >
          <div className="flex flex-col items-center gap-5">
            <div className="border-primary-light bg-white rounded-tile border p-4">
              <QRCodeSVG
                value={clientUrl}
                size={264}
                level="H"
                marginSize={0}
                fgColor="#2d1f1d"
                bgColor="#ffffff"
                title="Scanner pour s'inscrire"
              />
            </div>

            <div className="text-center">
              <h2 className="text-ink font-serif text-xl"> inscrivez-vous</h2>
              <p className="text-muted mt-1.5 text-sm">
                Scannez ce QR code avec l’appareil photo de votre téléphone pour
                réserver vos prestations.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={copyLink}
                className="text-primary-ink border-primary hover:bg-primary-light flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill border px-5 py-2.5 text-sm font-medium transition-colors"
              >
                {copied ? <ShieldCheck className="size-4" /> : <RefreshCw className="size-4" />}
                {copied ? 'Lien copié' : 'Copier le lien'}
              </button>

              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="text-ink hover:bg-primary-light flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill border border-card-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors"
              >
                <Users className="size-4" aria-hidden="true" />
                Inscrire sur place
              </button>
            </div>
          </div>
        </section>

        {/* --- Compteur du jour ------------------------------------------ */}
        <section
          className="border-primary-light bg-primary-light/50 flex w-full max-w-md items-center justify-between gap-4 rounded-tile border px-5 py-4"
          aria-label="Inscriptions du jour"
        >
          <span className="text-primary-ink flex items-center gap-2.5 text-sm font-semibold">
            <CalendarDays className="size-4" aria-hidden="true" />
            <span className="capitalize">{formatDayLabel(day)}</span>
          </span>

          {statsError ? (
            <span className="text-muted text-sm">Compteur indisponible</span>
          ) : stats === null ? (
            <span className="text-muted text-sm">Chargement…</span>
          ) : (
            <span className="text-ink text-sm">
              <strong className="text-primary-ink font-serif text-xl">{stats.total}</strong>
              <span className="text-muted ml-1.5">
                inscription{stats.total > 1 ? 's' : ''}
              </span>
              {stats.waiting > 0 && (
                <span className="text-muted ml-2">· {stats.waiting} en attente</span>
              )}
            </span>
          )}
        </section>

        <p className="text-muted text-center text-xs">
          Espace employé :{' '}
          <Link
            to="/admin"
            className="text-primary-ink font-semibold underline decoration-primary-glow underline-offset-4"
          >
            consulter le registre
          </Link>
        </p>
      </main>

      <ClientRegisterModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
