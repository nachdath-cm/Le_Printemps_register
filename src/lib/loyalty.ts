/**
 * Regles de fidelite « Fleurs de Printemps », partagees entre le serveur
 * (credit d'XP) et le client (affichage du palier et du solde).
 */

/** 1 Fleur de Printemps par tranche de Gouttes de Rosée cumulees. */
export const XP_PER_FLOWER = 10_000;

export const FLOWER_LABEL = 'Fleurs de Printemps';
export const XP_LABEL = 'Gouttes de Rosée';

export interface Tier {
  id: string;
  label: string;
  /** total_xp minimum pour atteindre ce palier. */
  min: number;
}

/** Seuils cosmétiques — choisir ici, rien d'autre à modifier. */
export const TIERS: readonly Tier[] = [
  { id: 'bourgeon', label: 'Bourgeon', min: 0 },
  { id: 'pousse', label: 'Pousse', min: 5_000 },
  { id: 'fleur', label: 'Fleur', min: 20_000 },
  { id: 'pleine-floraison', label: 'Pleine Floraison', min: 50_000 },
] as const;

export function tierFor(totalXp: number): Tier {
  let current = TIERS[0]!;
  for (const tier of TIERS) if (totalXp >= tier.min) current = tier;
  return current;
}

/** Palier suivant, ou null si le client est au plafond. */
export function nextTier(totalXp: number): Tier | null {
  for (const tier of TIERS) if (totalXp < tier.min) return tier;
  return null;
}

/** Progression 0..1 dans le palier courant. */
export function tierProgress(totalXp: number): number {
  const current = tierFor(totalXp);
  const next = nextTier(totalXp);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (totalXp - current.min) / (next.min - current.min)));
}

export function flowersTotal(totalXp: number): number {
  return Math.max(0, Math.floor(totalXp / XP_PER_FLOWER));
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F`;
}
