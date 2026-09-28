import type { ServiceCategoryId } from '../config/services';

/** Petit helper de classes : ignore les valeurs vides. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Journee locale de l'institut (Benin, UTC+1) au format YYYY-MM-DD.
 * On ne se fie pas a `toISOString()` : celle-ci decale en UTC et ferait
 * basculer les inscriptions de 23h dans le mauvais jour.
 */
const INSTITUTE_TZ_OFFSET_MINUTES = 60;

export function localDayKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + INSTITUTE_TZ_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** « lundi 28 septembre » — en-tete de la journee cote employee. */
export function formatDayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** « ADJOINT » 28/09 14:32 — ligne d'un registre. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })} à ${formatTime(iso)}`;
}

export const CATEGORY_ORDER: readonly ServiceCategoryId[] = ['spa', 'beaute', 'coiffure'];

/** Jours de la semaine courts, pour l'onglet du jour. */
export function weekdayInitials(): { key: number; label: string }[] {
  return ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, key) => ({ key, label }));
}
