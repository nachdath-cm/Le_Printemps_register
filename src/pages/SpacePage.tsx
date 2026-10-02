import { Flower2, Gift, History, LogIn, MessageCircle, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { INSTITUTE } from '../config/institute';
import { serviceLabel } from '../config/services';
import { getSpace, redeemFromSpace, requestPhoneLink, confirmPhoneLink, ApiError } from '../lib/api';
import { XP_LABEL, formatFcfa, nextTier, tierFor, tierProgress } from '../lib/loyalty';
import { REDEMPTION_STATUS_LABEL, type SpaceData } from '../lib/types';
import { formatDateTime } from '../lib/utils';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';

/**
 * Espace personnel public, accessible uniquement via le space_token.
 * Ne révèle que les informations prévues par le cahier des charges :
 * profil, histoires de visites terminées, solde de Fleurs, catalogue,
 * échanges et liaison du numéro.
 */
export function SpacePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SpaceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await getSpace(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lien invalide.');
      setData(null);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token || error) {
    return (
      <div className="bg-cream flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={64} />
        <h1 className="text-ink font-serif text-2xl">Lien introuvable</h1>
        <p className="text-muted max-w-sm text-sm">
          {error ?? "Ce lien d'espace personnel n'est pas valide. Demandez un nouveau lien à l'accueil du Printemps."}
        </p>
        <Link to="/borne" className="text-primary-ink font-semibold underline underline-offset-4 decoration-primary-glow">
          Retour à l'accueil
        </Link>
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
        </header>

        {/* --- Fidélité ------------------------------------------------ */}
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

          <p className="text-muted text-xs">
            {data.client.totalXp.toLocaleString('fr-FR')} {XP_LABEL} au total · {data.flowersTotal}{' '}
            Fleur{data.flowersTotal > 1 ? 's' : ''} gagnée{data.flowersTotal > 1 ? 's' : ''} au
            total.
          </p>
        </section>

        {/* --- Lier mon numéro ------------------------------------------ */}
        {!data.client.phoneLinked && token && <PhoneLinkCard token={token} onLinked={load} />}

        {/* --- Historique des visites ----------------------------------- */}
        <section className="flex flex-col gap-3">
          <h2 className="text-ink flex items-center gap-2 font-serif text-xl">
            <History className="text-primary-ink size-5" aria-hidden="true" />
            Historique des visites
          </h2>
          {data.visits.length === 0 ? (
            <p className="text-muted text-sm">
              Aucune visite terminée pour le moment. Elles apparaîtront ici après votre
              passage.
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

        {/* --- Récompenses ---------------------------------------------- */}
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
                  token={token!}
                  onRedeemed={load}
                />
              ))}
            </ul>
          )}
        </section>

        {/* --- Mes échanges ---------------------------------------------- */}
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
  token,
  onRedeemed,
}: {
  rewardId: string;
  title: string;
  description: string;
  costFlowers: number;
  canAfford: boolean;
  token: string;
  onRedeemed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
      await redeemFromSpace(token, rewardId);
      await onRedeemed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échange impossible.");
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
      {error && <p role="alert" className="text-danger text-xs font-medium">{error}</p>}
      <div className="mt-1 self-start">
        <Button size="sm" variant={canAfford ? 'primary' : 'secondary'} disabled={!canAfford || busy} loading={busy} onClick={redeem}>
          {canAfford ? 'Échanger' : 'Solde insuffisant'}
        </Button>
      </div>
    </li>
  );
}

/** Carte « Lier mon numéro » : code envoyé via WhatsApp puis confirmé ici. */
function PhoneLinkCard({ token, onLinked }: { token: string; onLinked: () => void }) {
  const [phone, setPhone] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await requestPhoneLink(token, phone);
      setWhatsappUrl(result.whatsappUrl);
      setCode(result.code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Demande impossible.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await confirmPhoneLink(token, code);
      setLinked(true);
      await onLinked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide.');
    } finally {
      setBusy(false);
    }
  };

  if (linked) {
    return (
      <section className="border-success-soft bg-success-soft text-success flex items-center gap-2 rounded-card border p-4 text-sm font-medium">
        <ShieldCheck className="size-5" aria-hidden="true" />
        Numéro lié avec succès.
      </section>
    );
  }

  return (
    <section className="border-primary-light bg-surface flex flex-col gap-4 rounded-card border p-6 shadow-card">
      <div className="flex items-center gap-2">
        <LogIn className="text-primary-ink size-5" aria-hidden="true" />
        <h2 className="text-ink font-serif text-xl">Lier mon numéro</h2>
      </div>
      <p className="text-muted text-sm">
        Reliez votre numéro pour retrouver ce compte depuis votre prochain passage.
      </p>

      {!whatsappUrl ? (
        <>
          <Field label="Votre numéro">
            {(p) => (
              <TextInput
                {...p}
                type="tel"
                inputMode="tel"
                value={phone}
                placeholder="01 23 45 67 89"
                invalid={Boolean(error)}
                onChange={(e) => setPhone(e.target.value)}
              />
            )}
          </Field>
          {error && (
            <p role="alert" className="text-danger text-xs font-medium">{error}</p>
          )}
          <Button onClick={start} loading={busy} disabled={phone.trim().length < 6}>
            Envoyer le code
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted text-sm">
            1. Envoyez le message proposé à l’institut sur WhatsApp, puis reportez le code
            ici :
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="text-whatsapp-hover inline-flex items-center gap-2 font-sans text-sm font-semibold"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Ouvrir WhatsApp
          </a>
          <Field label="Code reçu">
            {(p) => (
              <TextInput
                {...p}
                inputMode="numeric"
                value={code}
                maxLength={6}
                placeholder="123456"
                invalid={Boolean(error)}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            )}
          </Field>
          {error && (
            <p role="alert" className="text-danger text-xs font-medium">{error}</p>
          )}
          <Button onClick={confirm} loading={busy} disabled={code.length !== 6}>
            Confirmer le code
          </Button>
        </>
      )}
    </section>
  );
}
