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
