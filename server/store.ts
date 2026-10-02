import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Client,
  Registration,
  RegistrationStatus,
  Redemption,
  RedemptionStatus,
  Reward,
  SpaceData,
} from '../src/lib/types.ts';
import {
  REGISTRATION_STATUSES,
  REGISTRATION_VERSION,
} from '../src/lib/types.ts';
import { SERVICES } from '../src/config/services.ts';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? join(here, 'data');
const DATA_FILE = join(DATA_DIR, 'registrations.json');
const CLIENTS_FILE = join(DATA_DIR, 'clients.json');
const LOYALTY_FILE = join(DATA_DIR, 'loyalty.json');
const PRICES_FILE = join(DATA_DIR, 'service-prices.json');

/** Le Benin (UTC+1) sans dependre du fuseau du serveur qui heberge l'institut. */
const TZ_OFFSET_MINUTES = 60;

function dayKeyOf(date: Date): string {
  return new Date(date.getTime() + TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/* ----------------------------------------------------------------------- */
/* Ecriture atomique, partagee par tous les fichiers de donnees             */
/* ----------------------------------------------------------------------- */

let writeChain: Promise<unknown> = Promise.resolve();

async function writeJson(file: string, value: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.tmp`;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => undefined);
  return next;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

/* ----------------------------------------------------------------------- */
/* Prix des prestations — seed, editable par l'admin                        */
/* ----------------------------------------------------------------------- */

/** Prix catalogue attendus (table de la mission), par libelle de service. */
const SEED_PRICES: Record<string, number> = {
  'Coiffure Homme': 2000,
  'Coiffure Homme avec teinte': 3000,
  'Coiffure Enfant': 1000,
  'Coiffure Enfant avec teinte': 2000,
  'Beauté des mains et pieds': 6500,
  'Soin paraffine': 2000,
  'Massage corporel': 15000,
  'Soin du visage': 15000,
  'Soin éclat': 5000,
  'Gommage corporel': 15000,
  'Arrangement ongle simple': 1000,
  'Arrangement ongle avec massage': 3000,
  'Pose vernis mains et pieds': 1000,
  'Pose capsule + vernis simple': 2000,
  'Pose capsule + semi-permanent': 5000,
};

/** Correspondances libelle(catalogue existant) -> prix. */
const LABEL_ALIASES: Record<string, string[]> = {
  'Coiffure Homme': ['Coiffure Homme'],
  'Coiffure Homme avec teinte': ['Coiffure Homme avec teinte'],
  'Coiffure Enfant': ['Coiffure Enfant'],
  'Coiffure Enfant avec teinte': ['Coiffure Enfant avec teinte'],
  'Beauté des mains et pieds': ['Beauté des mains et pieds', 'Manucure prestige'],
  'Soin paraffine': ['Soin paraffine'],
  'Massage corporel': ['Massage corporel', 'Massages relaxants'],
  'Soin du visage': ['Soin du visage', 'Soins du visage'],
  'Soin éclat': ['Soin éclat'],
  'Gommage corporel': ['Gommage corporel', 'Gommages du corps'],
  'Arrangement ongle simple': ['Arrangement ongle simple'],
  'Arrangement ongle avec massage': ['Arrangement ongle avec massage'],
  'Pose vernis mains et pieds': ['Pose vernis mains et pieds'],
  'Pose capsule + vernis simple': ['Pose capsule + vernis simple'],
  'Pose capsule + semi-permanent': ['Pose capsule + semi-permanent', 'Pose vernis semi-permanent'],
};

/** Prix seed par identifiant de service (0 pour « autre » / inconnu). */
function seedPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const [label, price] of Object.entries(SEED_PRICES)) {
    for (const alias of LABEL_ALIASES[label] ?? [label]) {
      const service = SERVICES.find((s) => s.label === alias);
      if (service && prices[service.id] === undefined) prices[service.id] = price;
    }
  }
  return prices;
}

let pricesCache: Record<string, number> | null = null;

export async function listServicePrices(): Promise<Record<string, number>> {
  if (pricesCache) return pricesCache;
  const stored = await readJson<Record<string, number> | null>(PRICES_FILE, null);
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    pricesCache = stored;
  } else {
    pricesCache = seedPrices();
    await writeJson(PRICES_FILE, pricesCache);
  }
  return pricesCache;
}

export function setServicePrice(id: string, priceFcfa: number): Promise<Record<string, number> | null> {
  return enqueue(async () => {
    const prices = await listServicePrices();
    if (!SERVICES.some((s) => s.id === id)) return null;
    prices[id] = priceFcfa;
    await writeJson(PRICES_FILE, prices);
    return prices;
  });
}

/** Somme des prix catalogue pour une liste d'identifiants. */
export async function catalogAmount(serviceIds: string[]): Promise<number> {
  const prices = await listServicePrices();
  return serviceIds.reduce((sum, id) => sum + (prices[id] ?? 0), 0);
}

/* ----------------------------------------------------------------------- */
/* Inscriptions (= visites)                                                */
/* ----------------------------------------------------------------------- */

let registrationsCache: Registration[] | null = null;

async function readRegistrations(): Promise<Registration[]> {
  if (registrationsCache) return registrationsCache;
  const parsed = await readJson<unknown>(DATA_FILE, []);
  const rows = Array.isArray(parsed) ? (parsed as Registration[]) : [];
  registrationsCache = rows.map((r) => ({
    ...r,
    clientId: r.clientId ?? null,
    amountFcfa: r.amountFcfa ?? null,
    xpEarned: r.xpEarned ?? null,
  }));
  return registrationsCache;
}

let clientsCache: Client[] | null = null;

async function readClients(): Promise<Client[]> {
  if (clientsCache) return clientsCache;
  const parsed = await readJson<unknown>(CLIENTS_FILE, []);
  clientsCache = Array.isArray(parsed) ? (parsed as Client[]) : [];
  return clientsCache;
}

interface LoyaltyFile {
  rewards: Reward[];
  redemptions: Redemption[];
}

let loyaltyCache: LoyaltyFile | null = null;

async function readLoyalty(): Promise<LoyaltyFile> {
  if (loyaltyCache) return loyaltyCache;
  const parsed = await readJson<unknown>(LOYALTY_FILE, null);
  loyaltyCache =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as LoyaltyFile)
      : { rewards: [], redemptions: [] };
  return loyaltyCache;
}

/** Chiffres uniquement : clé de rapprochement robuste aux espaces/« + ». */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Rapprochement d'un client existant : numéro lié OU numéro saisi au registre. */
function findClientByPhone(clients: Client[], digits: string): Client | undefined {
  return clients.find(
    (c) => c.claimedPhone === digits || (c.phone !== null && normalizePhone(c.phone) === digits),
  );
}

export interface NewRegistration {
  firstName: string;
  lastName: string;
  phone: string;
  services: string[];
  other: string;
  note: string;
}

export async function createRegistration(
  input: NewRegistration,
): Promise<Registration & { spaceToken: string }> {
  return enqueue(async () => {
    const all = await readRegistrations();
    const clients = await readClients();
    const digits = normalizePhone(input.phone);

    let client = findClientByPhone(clients, digits);
    if (!client) {
      client = {
        v: 1,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: null,
        claimedPhone: digits,
        spaceToken: randomBytes(32).toString('base64url'),
        totalXp: 0,
      };
      clients.push(client);
    } else {
      // Le dernier passage fait foi pour le nom affiché.
      client.firstName = input.firstName;
      client.lastName = input.lastName;
      if (!client.claimedPhone) client.claimedPhone = digits;
    }

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
      clientId: client.id,
      amountFcfa: await catalogAmount(input.services),
      xpEarned: null,
    };
    all.push(record);
    await writeJson(DATA_FILE, all);
    await writeJson(CLIENTS_FILE, clients);
    return { ...record, spaceToken: client.spaceToken };
  });
}

export async function listRegistrations(day?: string): Promise<Registration[]> {
  const all = await readRegistrations();
  const filtered = day ? all.filter((r) => r.day === day) : all;
  return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface StatusChange {
  registration: Registration;
  /** Gouttes de Rosée créditees au passage a Terminé, 0 sinon. */
  xpCredited: number;
}

export async function setStatus(id: string, status: RegistrationStatus): Promise<StatusChange | null> {
  return enqueue(async () => {
    const all = await readRegistrations();
    const clients = await readClients();
    const found = all.find((r) => r.id === id);
    if (!found) return null;

    // Sortie de « termine » : on retire les XP créditées pour éviter un
    // double crédit si la carte repasse ensuite à Terminé.
    if (found.status === 'termine' && status !== 'termine' && found.xpEarned) {
      const client = clients.find((c) => c.id === found.clientId);
      if (client) {
        client.totalXp = Math.max(0, client.totalXp - found.xpEarned);
        await writeJson(CLIENTS_FILE, clients);
      }
      found.xpEarned = null;
    }

    let xpCredited = 0;
    if (status === 'termine' && found.status !== 'termine') {
      const amount = found.amountFcfa ?? (await catalogAmount(found.services));
      found.amountFcfa = amount;
      const client = clients.find((c) => c.id === found.clientId);
      if (client) {
        client.totalXp += amount;
        found.xpEarned = amount;
        xpCredited = amount;
        await writeJson(CLIENTS_FILE, clients);
      } else {
        found.xpEarned = 0;
      }
    }

    found.status = status;
    await writeJson(DATA_FILE, all);
    return { registration: found, xpCredited };
  });
}

export async function setAmount(id: string, amountFcfa: number): Promise<Registration | null> {
  return enqueue(async () => {
    const all = await readRegistrations();
    const found = all.find((r) => r.id === id);
    if (!found) return null;
    if (found.status === 'termine') {
      throw new Error('Le montant d’une visite terminée ne peut plus être modifié.');
    }
    found.amountFcfa = amountFcfa;
    await writeJson(DATA_FILE, all);
    return found;
  });
}

export async function countForDay(day: string): Promise<{ total: number; waiting: number }> {
  const all = await readRegistrations();
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

/* ----------------------------------------------------------------------- */
/* Espace client                                                           */
/* ----------------------------------------------------------------------- */

export async function getClientByToken(token: string): Promise<Client | null> {
  const clients = await readClients();
  return clients.find((c) => c.spaceToken === token) ?? null;
}

export async function getSpaceData(token: string): Promise<SpaceData | null> {
  const clients = await readClients();
  const client = clients.find((c) => c.spaceToken === token);
  if (!client) return null;

  const all = await readRegistrations();
  const visits = all
    .filter((r) => r.clientId === client.id && r.status === 'termine')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      services: r.services,
      amountFcfa: r.amountFcfa ?? 0,
      xpEarned: r.xpEarned ?? 0,
    }));

  const { rewards, redemptions } = await readLoyalty();
  const reserved = redemptions
    .filter((r) => r.clientId === client.id && (r.status === 'pending' || r.status === 'used'))
    .reduce((sum, r) => sum + (rewards.find((w) => w.id === r.rewardId)?.costFlowers ?? 0), 0);
  const flowersTotal = Math.max(0, Math.floor(client.totalXp / 10_000));
  const flowersAvailable = Math.max(0, flowersTotal - reserved);

  return {
    client: {
      firstName: client.firstName,
      lastName: client.lastName,
      totalXp: client.totalXp,
      phoneLinked: client.phone !== null,
    },
    flowersTotal,
    flowersAvailable,
    visits,
    rewards: rewards.filter((r) => r.active),
    redemptions: redemptions
      .filter((r) => r.clientId === client.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({
        id: r.id,
        rewardTitle: rewards.find((w) => w.id === r.rewardId)?.title ?? 'Récompense',
        costFlowers: rewards.find((w) => w.id === r.rewardId)?.costFlowers ?? 0,
        status: r.status,
        createdAt: r.createdAt,
        usedAt: r.usedAt,
      })),
  };
}

export async function redeemReward(token: string, rewardId: string): Promise<SpaceData | { error: string }> {
  return enqueue(async () => {
    const clients = await readClients();
    const client = clients.find((c) => c.spaceToken === token);
    if (!client) return { error: 'Espace introuvable.' };

    const { rewards, redemptions } = await readLoyalty();
    const reward = rewards.find((r) => r.id === rewardId && r.active);
    if (!reward) return { error: 'Récompense indisponible.' };

    const reserved = redemptions
      .filter((r) => r.clientId === client.id && (r.status === 'pending' || r.status === 'used'))
      .reduce((sum, r) => sum + (rewards.find((w) => w.id === r.rewardId)?.costFlowers ?? 0), 0);
    const available = Math.max(0, Math.floor(client.totalXp / 10_000) - reserved);
    if (reward.costFlowers > available) {
      return { error: 'Solde de Fleurs insuffisant.' };
    }

    redemptions.push({
      id: randomUUID(),
      clientId: client.id,
      rewardId: reward.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      usedAt: null,
    });
    await writeJson(LOYALTY_FILE, { rewards, redemptions });
    const fresh = await getSpaceData(token);
    return (fresh ?? { error: 'Espace introuvable.' }) as SpaceData | { error: string };
  });
}

export async function setRedemptionStatus(
  id: string,
  status: RedemptionStatus,
): Promise<Redemption | null> {
  return enqueue(async () => {
    const { rewards, redemptions } = await readLoyalty();
    const found = redemptions.find((r) => r.id === id);
    if (!found) return null;
    found.status = status;
    found.usedAt = status === 'used' ? new Date().toISOString() : null;
    await writeJson(LOYALTY_FILE, { rewards, redemptions });
    return found;
  });
}

export interface RedemptionRow extends Redemption {
  clientName: string;
  rewardTitle: string;
}

export async function listRedemptions(): Promise<RedemptionRow[]> {
  const { rewards, redemptions } = await readLoyalty();
  const clients = await readClients();
  const order: Record<RedemptionStatus, number> = { pending: 0, used: 1, cancelled: 2 };
  return redemptions
    .map((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      return {
        ...r,
        clientName: client ? `${client.firstName} ${client.lastName}` : 'Cliente',
        rewardTitle: rewards.find((w) => w.id === r.rewardId)?.title ?? 'Récompense',
      };
    })
    .sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt));
}

/* ----------------------------------------------------------------------- */
/* Récompenses (CRUD admin)                                                */
/* ----------------------------------------------------------------------- */

export async function listRewards(): Promise<Reward[]> {
  const { rewards } = await readLoyalty();
  return [...rewards].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReward(input: {
  title: string;
  description: string;
  costFlowers: number;
  active: boolean;
}): Promise<Reward> {
  return enqueue(async () => {
    const { rewards, redemptions } = await readLoyalty();
    const reward: Reward = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      costFlowers: input.costFlowers,
      active: input.active,
      createdAt: new Date().toISOString(),
    };
    rewards.push(reward);
    await writeJson(LOYALTY_FILE, { rewards, redemptions });
    return reward;
  });
}

export async function updateReward(
  id: string,
  patch: Partial<Pick<Reward, 'title' | 'description' | 'costFlowers' | 'active'>>,
): Promise<Reward | null> {
  return enqueue(async () => {
    const { rewards, redemptions } = await readLoyalty();
    const found = rewards.find((r) => r.id === id);
    if (!found) return null;
    Object.assign(found, patch);
    await writeJson(LOYALTY_FILE, { rewards, redemptions });
    return found;
  });
}

export async function deleteReward(id: string): Promise<boolean> {
  return enqueue(async () => {
    const { rewards, redemptions } = await readLoyalty();
    const next = rewards.filter((r) => r.id !== id);
    if (next.length === rewards.length) return false;
    await writeJson(LOYALTY_FILE, { rewards: next, redemptions });
    return true;
  });
}

/* ----------------------------------------------------------------------- */
/* Liaison du numéro de téléphone                                          */
/* ----------------------------------------------------------------------- */

interface PhoneLinkCode {
  code: string;
  phone: string;
  expiresAt: number;
}

const phoneLinkCodes = new Map<string, PhoneLinkCode>();

const PHONE_LINK_TTL_MS = 10 * 60 * 1000;

export async function createPhoneLinkCode(token: string, phone: string): Promise<{ code: string } | { error: string }> {
  return enqueue(async () => {
    const clients = await readClients();
    const client = clients.find((c) => c.spaceToken === token);
    if (!client) return { error: 'Espace introuvable.' };
    if (client.phone) return { error: 'Ce compte a déjà un numéro lié.' };

    const digits = normalizePhone(phone);
    if (digits.length < 8) return { error: 'Numéro de téléphone invalide.' };
    const taken = clients.find(
      (c) => c.id !== client.id && c.phone !== null && normalizePhone(c.phone) === digits,
    );
    if (taken) return { error: 'Ce numéro est déjà lié à un autre espace.' };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    phoneLinkCodes.set(token, { code, phone: digits, expiresAt: Date.now() + PHONE_LINK_TTL_MS });
    return { code };
  });
}

export async function confirmPhoneLinkCode(
  token: string,
  code: string,
): Promise<{ ok: true } | { error: string }> {
  return enqueue(async () => {
    const entry = phoneLinkCodes.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      phoneLinkCodes.delete(token);
      return { error: 'Code expiré. Demandez un nouveau code.' };
    }
    if (entry.code !== code.trim()) {
      return { error: 'Code incorrect.' };
    }
    const clients = await readClients();
    const client = clients.find((c) => c.spaceToken === token);
    if (!client) return { error: 'Espace introuvable.' };

    const digits = entry.phone;
    const taken = clients.find(
      (c) => c.id !== client.id && c.phone !== null && normalizePhone(c.phone) === digits,
    );
    if (taken) return { error: 'Ce numéro est déjà lié à un autre espace.' };

    // Fusion : si un autre client existait avec ce numéro comme claimedPhone,
    // on rebascule ses visites sur le compte lié.
    const orphan = clients.find((c) => c.id !== client.id && c.claimedPhone === digits && c.phone === null);
    if (orphan) {
      const all = await readRegistrations();
      for (const r of all) {
        if (r.clientId === orphan.id) r.clientId = client.id;
      }
      client.totalXp += orphan.totalXp;
      clientsCache = clients.filter((c) => c.id !== orphan.id);
      client.phone = digits;
      client.claimedPhone = digits;
      await writeJson(DATA_FILE, all);
      await writeJson(CLIENTS_FILE, clientsCache);
    } else {
      client.phone = digits;
      client.claimedPhone = digits;
      await writeJson(CLIENTS_FILE, clients);
    }
    phoneLinkCodes.delete(token);
    return { ok: true };
  });
}

/** Migration douce : rattache l'historique aux clients, sans crédit rétroactif. */
export async function ensureStoreReady(): Promise<void> {
  return enqueue(migrateLegacy).then(() => undefined);
}

async function migrateLegacy(): Promise<void> {
  const all = await readRegistrations();
  const clients = await readClients();
  let changed = false;
  for (const r of all) {
    if (r.clientId) continue;
    const digits = normalizePhone(r.phone);
    let client = findClientByPhone(clients, digits);
    if (!client) {
      client = {
        v: 1,
        id: randomUUID(),
        createdAt: r.createdAt,
        firstName: r.firstName,
        lastName: r.lastName,
        phone: null,
        claimedPhone: digits,
        spaceToken: randomBytes(32).toString('base64url'),
        totalXp: 0,
      };
      clients.push(client);
    }
    r.clientId = client.id;
    changed = true;
  }
  if (changed) {
    await writeJson(DATA_FILE, all);
    await writeJson(CLIENTS_FILE, clients);
  }
}

