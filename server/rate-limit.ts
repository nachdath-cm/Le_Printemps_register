/**
 * Limitation des tentatives sur la connexion administrateur.
 *
 * Le PIN fait quatre chiffres, soit 10 000 combinaisons. Sans limitation,
 * un script qui envoie une requete par seconde les essaie toutes en moins
 * de trois heures et tombe sur le bon : un PIN « secret » ne protege
 * alors plus rien. C'est la raison de ce module.
 *
 * Le compteur vit en memoire, ce qui convient a notre deploy : un service
 * Railway ou Render a une seule instance. Un passage a plusieurs replicas
 * exigerait de partager ce compteur (Redis, ou une table en base), sinon
 * chaque instance compterait de son cote et la limite ne s'appliquerait
 * plus.
 */

/** Apres ce nombre d'echecs, on bloque et on double progressively. */
const FREE_ATTEMPTS = 5;

/** Duree de depart du blocage, doublee a chaque palier. */
const FIRST_LOCK_MS = 60 * 1000;
const MAX_LOCK_MS = 30 * 60 * 1000;

/** Fenetre au-dela de laquelle un compteur inactif est oublie. */
const FORGET_AFTER_MS = 60 * 60 * 1000;

interface Bucket {
  /** Nombre d'echecs consecutifs, plafonne a FREE_ATTEMPTS. */
  failures: number;
  /** Instant de liberation du blocage, 0 si le client n'est pas bloque. */
  lockedUntil: number;
  /** Derniere activite, pour purger les seaux inertes. */
  lastSeen: number;
}

const buckets = new Map<string, Bucket>();

export interface RateVerdict {
  ok: boolean;
  /** Secondes restantes avant de pouvoir reessayer. */
  retryAfter: number;
}

function lockMs(failures: number): number {
  const over = failures - FREE_ATTEMPTS;
  return Math.min(MAX_LOCK_MS, FIRST_LOCK_MS * 2 ** Math.max(0, over));
}

function purge(now: number): void {
  for (const [key, bucket] of buckets) {
    const idle = now - bucket.lastSeen;
    const expired = bucket.lockedUntil <= now && idle > FORGET_AFTER_MS;
    if (expired) buckets.delete(key);
  }
}

/**
 * Autorise-t-on une tentative ? A appeler avant de comparer le PIN.
 *
 * L'echec de verification doit toujours etre contabilise, meme quand le
 * client est bloque : sinon un attaquant peut tester 10 000 codes puis
 * attendre la fin du blocage, recommencer, et reduire a chaque tour la
 * portion de codes encore possible.
 */
export function checkLoginRate(clientId: string): RateVerdict {
  const now = Date.now();
  purge(now);
  const bucket = buckets.get(clientId);
  if (!bucket) return { ok: true, retryAfter: 0 };
  if (bucket.lockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((bucket.lockedUntil - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Enregistre un PIN refuse et applique le blocage correspondant. */
export function recordLoginFailure(clientId: string): void {
  const now = Date.now();
  const bucket = buckets.get(clientId) ?? {
    failures: 0,
    lockedUntil: 0,
    lastSeen: now,
  };
  bucket.failures = Math.min(bucket.failures + 1, FREE_ATTEMPTS + 12);
  bucket.lastSeen = now;
  // On ne prolonge que si l'on vient d'atteindre un palier de blocage.
  if (bucket.failures >= FREE_ATTEMPTS) {
    bucket.lockedUntil = now + lockMs(bucket.failures);
  }
  buckets.set(clientId, bucket);
}

/** Oublie le client : un code correct redonne acces immediatement. */
export function recordLoginSuccess(clientId: string): void {
  buckets.delete(clientId);
}

/** Visible pour les tests. */
export function _resetRateLimits(): void {
  buckets.clear();
}

// Purge periodique : le Map ne doit pas grossir indefiniment. `unref` evite
// de garder le processus en vie rien que pour ce minuteur.
const timer = setInterval(() => purge(Date.now()), 10 * 60 * 1000);
timer.unref?.();
