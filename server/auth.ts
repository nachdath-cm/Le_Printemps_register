import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Repertoire de donnees. On reutilise exactement la meme resolution que
 * `store.ts` : sur Railway ou Render, DATA_DIR pointe vers le volume
 * persistant, le secret de session doit y vivre aussi. Sinon il serait
 * regenere a chaque redemarrage et toutes les sessions admin seraient
 * invalidees — le symptome etant « il faut ressaisir le PIN sans arret ».
 */
const DATA_DIR = process.env.DATA_DIR ?? join(here, 'data');
const SECRET_FILE = join(DATA_DIR, '.session-secret');

/** Duree de validite d'une session admin : une journee de travail. */
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/** Duree de validite d'une session client : 90 jours. */
const CLIENT_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const DEFAULT_PIN = '2468';

/** PIN administrateur, ou `null` quand aucun PIN n'est configure en production. */
function adminPin(): string | null {
  const fromEnv = process.env.ADMIN_PIN?.trim();
  if (fromEnv) return fromEnv;
  // Refuser le PIN par defaut en production : c'est un code connu de tous
  // les depots publics, on ne peut pas l'utiliser comme garde-fou.
  if (process.env.NODE_ENV === 'production') return null;
  return DEFAULT_PIN;
}

/**
 * Un PIN est-il reellement configure ? C'est la seule distinction a faire en
 * production : soit l'admin est accessible, soit la plateforme est mal
 * configuree. On doit pouvoir dire lequel des deux, pas renvoyer un 500.
 */
export function isPinConfigured(): boolean {
  return adminPin() !== null;
}

export function verifyPin(pin: string): boolean {
  const expected = adminPin();
  if (expected === null) return false;
  return safeEqual(pin, expected);
}

/**
 * Secret de signature des jetons, conserve sur disque afin que les sessions
 * restent valides d'un redemarrage a l'autre. Genere a la volee sinon.
 */
function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  try {
    return readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {
    const generated = randomBytes(32).toString('hex');
    try {
      mkdirSync(dirname(SECRET_FILE), { recursive: true });
      writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    } catch {
      /* filesystem non inscriptible : secret ephemere, sessions invalidees au redemarrage */
    }
    return generated;
  }
}

const secret = sessionSecret();

function sign(payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Comparaison a temps constant : evite de fuir le PIN par timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // On compare quand meme pour uniformiser le temps, puis on renvoie false.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function issueSigned(data: Record<string, unknown>, ttl: number): string {
  const payload = Buffer.from(
    JSON.stringify({ ...data, exp: Date.now() + ttl }),
    'utf8',
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readSigned<T extends { exp?: number }>(token: string | undefined | null): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
    return typeof decoded.exp === 'number' && Date.now() < decoded.exp ? decoded : null;
  } catch {
    return null;
  }
}

export function issueToken(): string {
  return issueSigned({}, TOKEN_TTL_MS);
}

export function issueClientToken(clientId: string): string {
  return issueSigned({ cid: clientId }, CLIENT_TOKEN_TTL_MS);
}

export function readClientToken(token: string | undefined | null): string | null {
  const decoded = readSigned<{ cid?: string; exp?: number }>(token);
  return decoded && typeof decoded.cid === 'string' ? decoded.cid : null;
}

export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(payload))) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    return typeof decoded.exp === 'number' && Date.now() < decoded.exp;
  } catch {
    return false;
  }
}

/** Extrait le jeton de l'en-tete Authorization ou de la query (export CSV). */
export function readToken(req: {
  headers: Record<string, unknown>;
  query: Record<string, unknown>;
}): string | null {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }
  const query = req.query.token;
  if (typeof query === 'string' && query) return query;
  return null;
}

/**
 * Signale au demarrage ce qui empechera l'acces admin de fonctionner.
 *
 * On ne bloque pas le demarrage : la borne du salon doit rester utilisable
 * meme si l'admin est mal configure, sinon une variable manquante mettrait
 * tout le service hors service. On crie dans les logs, et la route de
 * connexion renvoie un message actionnable.
 */
export function warnAboutAuthConfig(): void {
  if (isPinConfigured()) {
    if (!process.env.SESSION_SECRET?.trim()) {
      console.warn(
        `\n  i  SESSION_SECRET non defini — secret lu/ecrit dans ${SECRET_FILE}\n` +
          '     Definit SESSION_SECRET pour un secret stable et explicite.\n',
      );
    }
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '\n  ✖  ADMIN_PIN MANQUANT — l\'acces administrateur est ferme.\n' +
        '     Definit ADMIN_PIN dans les variables de ta plateforme\n' +
        '     (Railway/Render : service > Variables). Sans lui,\n' +
        '     /api/auth/login repond 503 « Serveur non configure ».\n',
    );
    return;
  }
  console.warn(
    '\n  ⚠  ADMIN_PIN non defini — PIN administrateur par defaut : ' +
      `${DEFAULT_PIN}\n     Definissez ADMIN_PIN dans .env avant la mise en production.\n`,
  );
}
