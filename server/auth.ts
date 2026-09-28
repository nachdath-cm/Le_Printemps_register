import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SECRET_FILE = join(here, 'data', '.session-secret');

/** Duree de validite d'une session admin : une journee de travail. */
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const DEFAULT_PIN = '2468';

function adminPin(): string {
  const fromEnv = process.env.ADMIN_PIN?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_PIN est obligatoire en production. Definissez-la dans votre .env ou vos variables d’environnement.',
    );
  }
  return DEFAULT_PIN;
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

export function verifyPin(pin: string): boolean {
  return safeEqual(pin, adminPin());
}

export function issueToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS }),
    'utf8',
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
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

/** Avertit une seule fois si le PIN par defaut est utilise. */
let warned = false;
export function warnIfDefaultPin(): void {
  if (warned || process.env.ADMIN_PIN?.trim() || process.env.NODE_ENV === 'production') return;
  warned = true;
  console.warn(
    '\n  ⚠  ADMIN_PIN non defini — PIN administrateur par defaut : ' +
      `${DEFAULT_PIN}\n     Definissez ADMIN_PIN dans .env avant la mise en production.\n`,
  );
}
