/**
 * Source unique des prestations.
 * ---------------------------------------------------------------------------
 * Tout le site (formulaire client, pastilles, recherche admin, export CSV)
 * lit cette liste. Pour ajouter / renommer / retirer une prestation, c'est
 * le SEUL fichier à modifier : rien d'autre n'est codé en dur.
 */

export type ServiceCategoryId = 'spa' | 'beaute' | 'coiffure';

export interface ServiceCategory {
  id: ServiceCategoryId;
  label: string;
  /** Courte phrase affichée sous le titre de catégorie dans le formulaire. */
  hint: string;
}

export interface Service {
  /** Identifiant stable, stocké dans les inscriptions. Ne pas modifier après usage. */
  id: string;
  label: string;
  categoryId: ServiceCategoryId;
  /** Nombre de pièces dans un bon (carnet) pour cette prestation. Défaut 1. */
  pieces?: number;
}

/** Pièces dans un bon pour cette prestation (1 = bon unitaire). */
export function piecesForService(serviceId: string): number {
  const p = SERVICES.find((s) => s.id === serviceId)?.pieces;
  return typeof p === 'number' && p > 0 ? p : 1;
}

export const SERVICE_CATEGORIES: readonly ServiceCategory[] = [
  {
    id: 'spa',
    label: 'Soins du Spa',
    hint: 'Détente, relaxation et régénération de la peau',
  },
  {
    id: 'beaute',
    label: 'Soins de Beauté',
    hint: 'Mains, pieds et ongles soignés',
  },
  {
    id: 'coiffure',
    label: 'Salon de Coiffure',
    hint: 'Coupes, soins et coiffages',
  },
] as const;

export const SERVICES: readonly Service[] = [
  // Soins du Spa
  { id: 'soins-du-visage', label: 'Soins du visage', categoryId: 'spa', pieces: 2 },
  { id: 'soins-du-visage-eclat', label: 'Soins du visage éclat', categoryId: 'spa', pieces: 3 },
  { id: 'soins-du-corps', label: 'Soins du corps', categoryId: 'spa' },
  { id: 'massages-relaxants', label: 'Massages relaxants', categoryId: 'spa', pieces: 2 },
  { id: 'gommages-du-corps', label: 'Gommages du corps', categoryId: 'spa', pieces: 2 },
  { id: 'gommages-du-visage', label: 'Gommages du visage', categoryId: 'spa' },

  // Soins de Beauté
  { id: 'manucure-prestige', label: 'Manucure prestige', categoryId: 'beaute', pieces: 3 },
  { id: 'pedicure-spa', label: 'Pédicure spa', categoryId: 'beaute' },
  { id: 'vernis-semi-permanent', label: 'Pose vernis semi-permanent', categoryId: 'beaute' },

  // Salon de Coiffure
  { id: 'coiffure-femme', label: 'Coiffure Femme', categoryId: 'coiffure', pieces: 6 },
  { id: 'coiffure-homme', label: 'Coiffure Homme', categoryId: 'coiffure', pieces: 6 },
  { id: 'coiffure-enfant', label: 'Coiffure Enfant', categoryId: 'coiffure', pieces: 6 },
] as const;

/** Identifiant réservé à la pastille « Autre ». */
export const OTHER_SERVICE_ID = 'autre';

/** Identifiant utilisé quand aucune prestation n'a été choisie. */
export const NO_SERVICE_ID = 'aucune';

export const CATEGORY_BY_ID: ReadonlyMap<ServiceCategoryId, ServiceCategory> = new Map(
  SERVICE_CATEGORIES.map((c) => [c.id, c]),
);

export const SERVICE_BY_ID: ReadonlyMap<string, Service> = new Map(
  SERVICES.map((s) => [s.id, s]),
);

/** Toutes les prestations d'une catégorie, dans l'ordre de declaration. */
export function servicesByCategory(categoryId: ServiceCategoryId): Service[] {
  return SERVICES.filter((s) => s.categoryId === categoryId);
}

/**
 * Resout un identifiant vers un libelle affichable.
 * Inconnue -> fallback lisible plutot qu'un `undefined` a l'ecran.
 */
export function serviceLabel(id: string): string {
  if (id === OTHER_SERVICE_ID) return 'Autre';
  if (id === NO_SERVICE_ID) return 'Aucune prestation';
  return SERVICE_BY_ID.get(id)?.label ?? id;
}

/** Tous les identifiants acceptes par l'API (prestations + « Autre »). */
export const VALID_SERVICE_IDS: ReadonlySet<string> = new Set([
  ...SERVICES.map((s) => s.id),
  OTHER_SERVICE_ID,
]);
