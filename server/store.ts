import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Registration, RegistrationStatus } from '../src/lib/types.ts';
import { REGISTRATION_STATUSES, REGISTRATION_VERSION } from '../src/lib/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? join(here, 'data');
const DATA_FILE = join(DATA_DIR, 'registrations.json');

/** Le Benin (UTC+1) sans dependre du fuseau du serveur qui heberge l'institut. */
const TZ_OFFSET_MINUTES = 60;

function dayKeyOf(date: Date): string {
  return new Date(date.getTime() + TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/**
 * Ecriture atomique : on ecrit un fichier temporaire puis on le renomme.
 * Ainsi une coupure de courant ne peut pas laisser un `registrations.json`
 * tronque au milieu d'une ligne.
 */
let writeChain: Promise<unknown> = Promise.resolve();

async function writeAll(registrations: Registration[]): Promise<void> {
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(tmp, `${JSON.stringify(registrations, null, 2)}\n`, 'utf8');
  await rename(tmp, DATA_FILE);
}

/** Serialise les mutations pour eviter deux ecritures concurrentes. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => undefined);
  return next;
}

let cache: Registration[] | null = null;

async function readAll(): Promise<Registration[]> {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as Registration[]) : [];
  } catch {
    // Fichier absent ou illisible : on demarre a vide plutot que de bloquer.
    cache = [];
  }
  return cache;
}

export interface NewRegistration {
  firstName: string;
  lastName: string;
  phone: string;
  services: string[];
  other: string;
  note: string;
}

export function createRegistration(input: NewRegistration): Promise<Registration> {
  return enqueue(async () => {
    const all = await readAll();
    const now = new Date();
    const record: Registration = {
      v: REGISTRATION_VERSION,
      id: randomUUID(),
      createdAt: now.toISOString(),
      day: dayKeyOf(now),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      services: input.services,
      other: input.other,
      note: input.note,
      status: 'en_attente',
    };
    all.push(record);
    await writeAll(all);
    return record;
  });
}

export async function listRegistrations(day?: string): Promise<Registration[]> {
  const all = await readAll();
  const filtered = day ? all.filter((r) => r.day === day) : all;
  // Plus recent d'abord.
  return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setStatus(id: string, status: RegistrationStatus): Promise<Registration | null> {
  return enqueue(async () => {
    const all = await readAll();
    const found = all.find((r) => r.id === id);
    if (!found) return null;
    found.status = status;
    await writeAll(all);
    return found;
  });
}

/** Statistiques par jour, pour le compteur de la page employee. */
export async function countForDay(day: string): Promise<{ total: number; waiting: number }> {
  const all = await readAll();
  let total = 0;
  let waiting = 0;
  for (const r of all) {
    if (r.day !== day) continue;
    if (r.status === 'annule') continue;
    total += 1;
    if (r.status === 'en_attente') waiting += 1;
  }
  return { total, waiting };
}

export { REGISTRATION_STATUSES };
