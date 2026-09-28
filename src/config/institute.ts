/** Identité et coordonnées — modifiables ici uniquement. */

export const INSTITUTE = {
  /** Nom affiché, en serif. */
  name: 'Le Printemps',
  /** Baseline sous le nom. */
  tagline: 'Soins & Coiffures',
  fullName: 'Le Printemps SPA & Lumière',
  /** Rendu dans le titre du document et l'écran d'installation PWA. */
  documentTitle: 'Le Printemps — Soins & Coiffures',
  description:
    'Registre des prestations — Le Printemps, institut de beauté et spa à Jéricho, Cotonou.',
  location: 'Jéricho, Cotonou, Bénin',
  /** Numéro de l'institut. `phone` sert au lien `tel:`, `phoneDisplay` à l'affichage. */
  phone: '+229 0197921046',
  phoneDisplay: '+229 0197921046',
  /** Chiffres uniquement, sans « + », pour un éventuel lien wa.me. */
  whatsapp: '2290197921046',
} as const;

/**
 * Le logo est déposé par le propriétaire dans `public/logo.png`.
 * Aucune image n'est générée dans le dépôt : le fichier est versionné par
 * l'utilisateur, le script `npm run icons` en dérive les tailles PWA.
 */
export const LOGO_PATH = '/logo.png';

/**
 * Version dérivée du logo : recadrée sur le sigle et détourée de son fond, par
 * `npm run icons`. C'est elle qu'on affiche dans l'interface, sinon le logo
 * arriverait entouré d'une grande zone vide et d'un carré pâle visible sur le
 * fond crème. Repli automatique sur `logo.png` si le script n'a pas tourné.
 */
export const LOGO_MARK_PATH = '/logo-mark.png';
