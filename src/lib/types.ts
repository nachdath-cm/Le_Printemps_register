export const REGISTRATION_STATUSES = ['en_attente', 'termine', 'annule'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  en_attente: 'En attente',
  termine: 'Terminé',
  annule: 'Annulé',
};

/** Versionee : le client et l'API doivent etre d'accord sur la forme. */
export const REGISTRATION_VERSION = 1;

export interface Registration {
  v: number;
  id: string;
  /** ISO 8601, heure de reception par le serveur. */
  createdAt: string;
  /** Journee locale de l'institut, format YYYY-MM-DD. Sert au regroupement. */
  day: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Identifiants issus de `src/config/services.ts` — peut contenir 'autre'. */
  services: string[];
  /** Texte libre, uniquement pertinent si 'autre' figure dans `services`. */
  other: string;
  note: string;
  status: RegistrationStatus;
  /** Client proprietaire de cette visite (null pour l'historique anterieur). */
  clientId: string | null;
  /** Montant final facture, en FCFA. Null pour l'historique anterieur. */
  amountFcfa: number | null;
  /** Gouttes de Rosée créditees — rempli uniquement au passage a Terminé. */
  xpEarned: number | null;
}

export interface CreateRegistrationInput {
  firstName: string;
  lastName: string;
  phone: string;
  services: string[];
  other?: string;
  note?: string;
}

export interface DayCount {
  day: string;
  total: number;
  en_attente: number;
}

export interface Client {
  v: 1;
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  /** Numéro (chiffres normalisés) : identifiant de connexion du client. */
  phone: string;
  /** Chiffres du téléphone saisis historiquement — rapprochement interne. */
  claimedPhone: string;
  totalXp: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  costFlowers: number;
  active: boolean;
  createdAt: string;
}

export const REDEMPTION_STATUSES = ['pending', 'used', 'cancelled'] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export const REDEMPTION_STATUS_LABEL: Record<RedemptionStatus, string> = {
  pending: 'En attente',
  used: 'Utilisé',
  cancelled: 'Annulé',
};

export interface Redemption {
  id: string;
  clientId: string;
  rewardId: string;
  status: RedemptionStatus;
  createdAt: string;
  usedAt: string | null;
}

/** Prestation du catalogue avec son prix courant. */
export interface ServicePrice {
  id: string;
  priceFcfa: number;
}

/** Visite en attente (affichée seule si elle existe). */
export interface PendingVisit {
  id: string;
  createdAt: string;
  services: string[];
  amountFcfa: number;
}

/** Visite telle qu'affichée dans l'espace client (Terminé uniquement). */
export interface SpaceVisit {
  id: string;
  createdAt: string;
  services: string[];
  amountFcfa: number;
  xpEarned: number;
}

export interface SpaceRedemption {
  id: string;
  rewardTitle: string;
  costFlowers: number;
  status: RedemptionStatus;
  createdAt: string;
  usedAt: string | null;
}

export interface SpaceData {
  client: {
    firstName: string;
    lastName: string;
    totalXp: number;
  };
  flowersTotal: number;
  flowersAvailable: number;
  pendingVisit: PendingVisit | null;
  visits: SpaceVisit[];
  rewards: Reward[];
  redemptions: SpaceRedemption[];
}
