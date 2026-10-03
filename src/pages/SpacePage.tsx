import { Flower2, Gift, History, LogOut, Plus, Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { INSTITUTE } from '../config/institute';
import { SERVICE_CATEGORIES, serviceLabel, servicesByCategory } from '../config/services';
import {
  ApiError,
  clientLogout,
  createMyVisit,
  getMe,
  redeemFromSpace,
} from '../lib/api';
import { XP_LABEL, formatFcfa, nextTier, tierFor, tierProgress } from '../lib/loyalty';
import { REDEMPTION_STATUS_LABEL, type SpaceData } from '../lib/types';
import { formatDateTime } from '../lib/utils';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';

/** Espace personnel du client connecté (session cookie). */
export function SpacePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SpaceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getMe());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/accueil-client', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = async () => {
    try {
      await clientLogout();
    } finally {
      navigate('/accueil-client', { replace: true });
    }
  };

  if (error) {
    return (
      <div className="bg-cream flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={64} />
        <p className="text-muted text-sm">{error}</p>
        <Button onClick={() => void load()}>Réessayer</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-cream flex min-h-dvh items-center justify-center text-muted text-sm">
        Chargement…
      </div>
    );
  }

  const tier = tierFor(data.client.totalXp);
  const next = nextTier(data.client.totalXp);
  const progress = Math.round(tierProgress(data.client.totalXp) * 100);

  return (
    <div className="bg-cream min-h-dvh">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 py-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <p className="eyebrow">{INSTITUTE.tagline}</p>
          <h1 className="text-ink font-serif text-3xl">
            {data.client.firstName} {data.client.lastName}
          </h1>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-muted hover:text-primary-ink inline-flex items-center gap-1.5 text-xs font-medium underline decoration-primary-glow underline-offset-4"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Se déconnecter
          </button>
        </header>

        <section className="border-primary-light bg-surface flex flex-col gap-4 rounded-card border p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Votre palier</p>
              <p className="text-ink font-serif text-2xl">{tier.label}</p>
            </div>
            <span className="bg-primary-light text-primary-ink flex items-center gap-1.5 rounded-pill px-4 py-2 text-sm font-semibold">
              <Flower2 className="size-4" aria-hidden="true" />
              {data.flowersAvailable} Fleur{data.flowersAvailable > 1 ? 's' : ''}
            </span>
          </div>

          <div>
            <div className="bg-card-border h-2.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary-strong h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progression vers le palier suivant"
              />
            </div>
            <p className="text-muted mt-1.5 text-xs">
              {next
                ? `${data.client.totalXp.toLocaleString('fr-FR')} ${XP_LABEL} — plus que ${(next.min - data.client.totalXp).toLocaleString('fr-FR')} avant « ${next.label} »`
                : `${data.client.totalXp.toLocaleString('fr-FR')} ${XP_LABEL} — palier maximum atteint`}
            </p>
          </div>
        </section>

        {/* --- Nouvelle visite / visite en attente ----------------------- */}
        {data.pendingVisit ? (
          <section className="border-card-border bg-card flex flex-col gap-1.5 rounded-card border p-4">
            <p className="text-ink font-serif text-lg">Votre visite est enregistrée</p>
            <p className="text-muted text-xs">{formatDateTime(data.pendingVisit.createdAt)}</p>
            <p className="text-ink text-sm font-medium">
              {data.pendingVisit.services.map(serviceLabel).join(' · ')}
            </p>
            <p className="text-muted text-xs">
              Montant prévu : {formatFcfa(data.pendingVisit.amountFcfa)}. Présentez-vous au
              comptoir : l'équipe la validera à la fin de votre passage.
            </p>
          </section>
        ) : (
          <NewVisit onCreated={load} />
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-ink flex items-center gap-2 font-serif text-xl">
            <History className="text-primary-ink size-5" aria-hidden="true" />
            Historique des visites
          </h2>
          {data.visits.length === 0 ? (
            <p className="text-muted text-sm">
              Aucune visite terminée pour le moment. Elles apparaîtront ici après votre passage.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.visits.map((visit) => (
                <li
                  key={visit.id}
                  className="border-card-border bg-card flex flex-col gap-1.5 rounded-card border p-4"
                >
                  <p className="text-muted text-xs">{formatDateTime(visit.createdAt)}</p>
                  <p className="text-ink text-sm font-medium">
                    {visit.services.map(serviceLabel).join(' · ')}
                  </p>
                  <p className="text-muted text-xs">
                    {formatFcfa(visit.amountFcfa)} ·{' '}
                    <span className="text-primary-ink font-semibold">
                      +{visit.xpEarned.toLocaleString('fr-FR')} {XP_LABEL}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-ink flex items-center gap-2 font-serif text-xl">
            <Gift className="text-primary-ink size-5" aria-hidden="true" />
            Nos récompenses
          </h2>
          {data.rewards.length === 0 ? (
            <p className="text-muted text-sm">De nouvelles récompenses arrivent bientôt.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.rewards.map((reward) => (
                <RewardRow
                  key={reward.id}
                  rewardId={reward.id}
                  title={reward.title}
                  description={reward.description}
                  costFlowers={reward.costFlowers}
                  canAfford={reward.costFlowers <= data.flowersAvailable}
                  onRedeemed={load}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-ink font-serif text-xl">Mes échanges</h2>
          {data.redemptions.length === 0 ? (
            <p className="text-muted text-sm">Aucun échange pour le moment.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.redemptions.map((redemption) => (
                <li
                  key={redemption.id}
                  className="border-card-border bg-card flex items-center justify-between gap-3 rounded-tile border px-4 py-3"
                >
                  <div>
                    <p className="text-ink text-sm font-medium">{redemption.rewardTitle}</p>
                    <p className="text-muted text-xs">
                      {formatDateTime(redemption.createdAt)} · {redemption.costFlowers} Fleur
                      {redemption.costFlowers > 1 ? 's' : ''}
                    </p>
                  </div>
                  <RedemptionBadge status={redemption.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

/** Formulaire « Nouvelle visite » : le client coche ses prestations. */
function NewVisit({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createMyVisit(selected);
      setOpen(false);
      setSelected([]);
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        icon={<Plus className="size-4" aria-hidden="true" />}
      >
        Nouvelle visite
      </Button>
    );
  }

  return (
    <section className="border-primary-light bg-surface flex flex-col gap-4 rounded-card border p-6 shadow-card">
      <h2 className="text-ink font-serif text-xl">Quelles prestations aujourd'hui ?</h2>
      {SERVICE_CATEGORIES.map((category) => (
        <fieldset key={category.id}>
          <legend className="text-ink mb-2 font-serif text-base font-semibold">
            {category.label}
          </legend>
          <div className="flex flex-wrap gap-2">
            {servicesByCategory(category.id).map((service) => {
              const active = selected.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => toggle(service.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-pill border px-4 py-2 font-sans text-xs font-medium transition-all ${
                    active
                      ? 'border-primary-strong bg-primary-strong text-white shadow-brand'
                      : 'border-card-border bg-surface text-muted hover:border-primary hover:text-primary-ink hover:bg-primary-light'
                  }`}
                >
                  {active && <Check className="size-3.5" aria-hidden="true" />}
                  {service.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="text-danger text-xs font-medium">
          {error}
        </p>
      )}
      <div className="flex gap-2.5">
        <Button onClick={submit} loading={busy} disabled={selected.length === 0}>
          Valider ma visite
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
      <p className="text-muted text-xs">
        L'équipe confirmera votre visite à la fin du passage ; le montant peut être ajusté sur
        place.
      </p>
    </section>
  );
}

function RedemptionBadge({ status }: { status: SpaceData['redemptions'][number]['status'] }) {
  const style =
    status === 'used'
      ? 'bg-success-soft text-success'
      : status === 'cancelled'
        ? 'bg-danger-soft text-danger'
        : 'bg-primary-light text-primary-ink';
  return (
    <span className={`rounded-pill px-3 py-1 font-sans text-[0.7rem] font-semibold ${style}`}>
      {REDEMPTION_STATUS_LABEL[status]}
    </span>
  );
}

function RewardRow({
  rewardId,
  title,
  description,
  costFlowers,
  canAfford,
  onRedeemed,
}: {
  rewardId: string;
  title: string;
  description: string;
  costFlowers: number;
  canAfford: boolean;
  onRedeemed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
      await redeemFromSpace(rewardId);
      await onRedeemed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échange impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border-card-border bg-card flex flex-col gap-2 rounded-card border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-ink font-serif text-lg leading-tight">{title}</p>
          {description && <p className="text-muted mt-1 text-sm">{description}</p>}
        </div>
        <span className="bg-primary-light text-primary-ink flex shrink-0 items-center gap-1 rounded-pill px-3 py-1 text-sm font-semibold">
          {costFlowers} <Flower2 className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      {error && (
        <p role="alert" className="text-danger text-xs font-medium">
          {error}
        </p>
      )}
      <div className="mt-1 self-start">
        <Button
          size="sm"
          variant={canAfford ? 'primary' : 'secondary'}
          disabled={!canAfford || busy}
          loading={busy}
          onClick={redeem}
        >
          {canAfford ? 'Échanger' : 'Solde insuffisant'}
        </Button>
      </div>
    </li>
  );
}
