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
  SpaceVoucher,
  SpaceVoucherOrder,
  Voucher,
  VoucherOrder,
  VoucherOrderItem,
} from '../src/lib/types.ts';
import {
  REGISTRATION_STATUSES,
  REGISTRATION_VERSION,
} from '../src/lib/types.ts';
import { SERVICES, piecesForService, serviceLabel } from '../src/config/services.ts';

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
  // C'est le prix du carnet (pack de pièces), par prestation.
  'Coiffure Femme': 10000,
  'Coiffure Homme': 10000,
  'Coiffure Enfant': 5000,
  'Manucure prestige': 15000,
  'Soins du visage': 20000,
  'Soins du visage éclat': 12000,
  'Massages relaxants': 20000,
  'Gommages du corps': 20000,
  'Pédicure spa': 15000,
  'Pose vernis semi-permanent': 2000,
};

/** Correspondances libelle(catalogue existant) -> prix. */
const LABEL_ALIASES: Record<string, string[]> = {
  'Coiffure Femme': ['Coiffure Femme'],
  'Coiffure Homme': ['Coiffure Homme'],
  'Coiffure Enfant': ['Coiffure Enfant'],
  'Manucure prestige': ['Manucure prestige', 'Beauté des mains et pieds'],
  'Soins du visage': ['Soins du visage', 'Soin du visage'],
  'Soins du visage éclat': ['Soins du visage éclat', 'Soin éclat'],
  'Massages relaxants': ['Massages relaxants', 'Massage corporel'],
  'Gommages du corps': ['Gommages du corps', 'Gommage corporel'],
  'Pédicure spa': ['Pédicure spa'],
  'Pose vernis semi-permanent': ['Pose vernis semi-permanent', 'Pose capsule + semi-permanent'],
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
    voucherIds: Array.isArray(r.voucherIds) ? r.voucherIds : [],
  }));
  return registrationsCache;
}

let clientsCache: Client[] | null = null;

async function readClients(): Promise<Client[]> {
  if (clientsCache) return clientsCache;
  const parsed = await readJson<unknown>(CLIENTS_FILE, []);
  const rows = Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
  // Normalise l'historique : phone requis, space_token supprime.
  clientsCache = rows.map((row) => {
    const claimed = typeof row.claimedPhone === 'string' ? row.claimedPhone : '';
    const phone =
      typeof row.phone === 'string' && row.phone ? normalizePhone(row.phone) : claimed;
    return {
      v: 1 as const,
      id: String(row.id),
      createdAt: String(row.createdAt),
      firstName: String(row.firstName ?? ''),
      lastName: String(row.lastName ?? ''),
      phone,
      claimedPhone: claimed || normalizePhone(phone),
      totalXp: typeof row.totalXp === 'number' ? row.totalXp : 0,
      status: row.status === 'prospect' ? ('prospect' as const) : ('client' as const),
      source: typeof row.source === 'string' ? row.source : null,
      interestServiceId:
        typeof row.interestServiceId === 'string' ? row.interestServiceId : null,
      consentContactAt: typeof row.consentContactAt === 'string' ? row.consentContactAt : null,
      convertedAt: typeof row.convertedAt === 'string' ? row.convertedAt : null,
    };
  });
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
  return clients.find((c) => c.claimedPhone === digits || normalizePhone(c.phone) === digits);
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
): Promise<Registration> {
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
        phone: digits,
        claimedPhone: digits,
        totalXp: 0,
        status: 'client' as const,
        source: null,
        interestServiceId: null,
        consentContactAt: null,
        convertedAt: null,
      };
      clients.push(client);
    } else {
      // Le dernier passage fait foi pour le nom affiché.
      client.firstName = input.firstName;
      client.lastName = input.lastName;
      if (!client.claimedPhone) client.claimedPhone = digits;
      if (!client.phone) client.phone = digits;
      // Un prospect qui vient recevoir une prestation devient cliente.
      if (client.status === 'prospect') {
        client.status = 'client';
        client.convertedAt = new Date().toISOString();
      }
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
      voucherIds: [],
    };
    all.push(record);
    await writeJson(DATA_FILE, all);
    await writeJson(CLIENTS_FILE, clients);
    return record;
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

export async function getClientById(id: string): Promise<Client | null> {
  const clients = await readClients();
  return clients.find((c) => c.id === id) ?? null;
}

export async function getMeData(clientId: string): Promise<SpaceData | null> {
  const clients = await readClients();
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;

  const all = await readRegistrations();
  const pending = all
    .filter((r) => r.clientId === client.id && r.status === 'en_attente')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const pendingVisit = pending
    ? {
        id: pending.id,
        createdAt: pending.createdAt,
        services: pending.services,
        amountFcfa: pending.amountFcfa ?? 0,
        voucherCodes: (pending.voucherIds ?? [])
          .map((vid) => vouchersCache?.find((v) => v.id === vid)?.code)
          .filter((c): c is string => Boolean(c)),
      }
    : null;
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
    },
    flowersTotal,
    flowersAvailable,
    pendingVisit,
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
    vouchers: await listOwnerVouchers(client.id),
    voucherOrders: await listOwnerOrders(client.id),
  };
}

/** Libellé français du statut d'un bon, avec « Expiré » calculé. */
function spaceVoucherStatus(v: Voucher): SpaceVoucher['status'] {
  if (v.status === 'reserved') return 'Réservé';
  if (v.status === 'used') return 'Utilisé';
  if (v.status === 'cancelled') return 'Annulé';
  if (v.expiresAt && Date.parse(v.expiresAt) <= Date.now()) return 'Expiré';
  return 'Valide';
}

async function listOwnerVouchers(clientId: string): Promise<SpaceVoucher[]> {
  const vouchers = await readVouchers();
  return vouchers
    .filter((v) => v.ownerClientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((v) => ({
      id: v.id,
      code: v.code,
      serviceId: v.serviceId,
      pricePaidFcfa: v.pricePaidFcfa,
      status: spaceVoucherStatus(v),
      expiresAt: v.expiresAt,
      createdAt: v.createdAt,
    }));
}

async function listOwnerOrders(clientId: string): Promise<SpaceVoucherOrder[]> {
  const orders = await readOrders();
  const items = await readOrderItems();
  return orders
    .filter((o) => o.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => {
      const lines = items.filter((i) => i.orderId === o.id);
      const total = lines.reduce(
        (sum, i) => sum + (i.finalUnitPriceFcfa ?? i.unitPriceFcfa) * i.quantity,
        0,
      );
      return {
        id: o.id,
        status: effectiveOrderStatus(o),
        createdAt: o.createdAt,
        totalFcfa: total,
        lines: lines
          .map((i) => `${serviceLabel(i.serviceId)} × ${i.quantity}`)
          .join(' · '),
      };
    });
}

/** Statut de commande exposé : « expired » calculé après 72 h. */
function effectiveOrderStatus(o: VoucherOrder): VoucherOrder['status'] {
  if (o.status === 'pending' && Date.now() - Date.parse(o.createdAt) > 72 * 3600 * 1000) {
    return 'expired';
  }
  return o.status;
}

/** Le statut effectif, avec persistance paresseuse de l'expiration. */
export function orderEffectiveStatus(o: VoucherOrder): VoucherOrder['status'] {
  return effectiveOrderStatus(o);
}

export async function redeemReward(clientId: string, rewardId: string): Promise<SpaceData | { error: string }> {
  return enqueue(async () => {
    const clients = await readClients();
    const client = clients.find((c) => c.id === clientId);
    if (!client) return { error: 'Client introuvable.' };

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
    const fresh = await getMeData(client.id);
    return (fresh ?? { error: 'Client introuvable.' }) as SpaceData | { error: string };
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
/* Connexion client : code a usage unique (OTP)                            */
/* ----------------------------------------------------------------------- */

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
  createdAt: number;
}

const otpByPhone = new Map<string, OtpEntry>();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const NEUTRAL_ERROR = 'Code incorrect ou expiré. Un nouveau code invalide l\'ancien — vérifiez le dernier message WhatsApp reçu.';

/** Cree (ou remplace) un code a usage unique pour ce numero. */
export function createOtp(phone: string): { code: string } {
  const digits = normalizePhone(phone);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpByPhone.set(digits, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    consumed: false,
    createdAt: Date.now(),
  });
  return { code };
}

/** Verifie le code sans rien reveler sur l'existence du numero. */
export function verifyOtp(phone: string, code: string): { ok: true; client: Client } | { error: string } {
  const digits = normalizePhone(phone);
  const entry = otpByPhone.get(digits);
  if (!entry) {
    console.log(`[otp] aucun code pour ${digits.slice(-4)} (message manquant ou compteur absent)`);
    return { error: NEUTRAL_ERROR };
  }
  if (entry.consumed) {
    console.log(`[otp] code deja consomme pour …${digits.slice(-4)}`);
    return { error: NEUTRAL_ERROR };
  }
  if (entry.expiresAt < Date.now()) {
    console.log(`[otp] code expire pour …${digits.slice(-4)}`);
    return { error: NEUTRAL_ERROR };
  }
  entry.attempts += 1;
  if (entry.attempts > OTP_MAX_ATTEMPTS) {
    entry.consumed = true;
    return { error: NEUTRAL_ERROR };
  }
  if (entry.code !== code.trim()) {
    console.log(`[otp] code saisi different du dernier emis pour …${digits.slice(-4)}`);
    return { error: NEUTRAL_ERROR };
  }
  entry.consumed = true;
  const client = clientsCache?.find((c) => normalizePhone(c.phone) === digits);
  if (!client) return { error: NEUTRAL_ERROR };
  return { ok: true, client };
}

// Purge periodique des codes expires.
const otpTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpByPhone) {
    if (entry.expiresAt < now && now - entry.createdAt > 60 * 60 * 1000) {
      otpByPhone.delete(key);
    }
  }
}, 10 * 60 * 1000);
otpTimer.unref?.();

/* ----------------------------------------------------------------------- */
/* Bons par prestation                                                     */
/* ----------------------------------------------------------------------- */

const ORDERS_FILE = join(DATA_DIR, 'voucher-orders.json');
const ORDER_ITEMS_FILE = join(DATA_DIR, 'voucher-order-items.json');
const VOUCHERS_FILE = join(DATA_DIR, 'vouchers.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

let ordersCache: VoucherOrder[] | null = null;
let orderItemsCache: VoucherOrderItem[] | null = null;
let vouchersCache: Voucher[] | null = null;
let settingsCache: { voucherValidityMonths: number } | null = null;

async function readOrders(): Promise<VoucherOrder[]> {
  if (ordersCache) return ordersCache;
  const parsed = await readJson<unknown>(ORDERS_FILE, []);
  ordersCache = Array.isArray(parsed) ? (parsed as VoucherOrder[]) : [];
  return ordersCache;
}

async function readOrderItems(): Promise<VoucherOrderItem[]> {
  if (orderItemsCache) return orderItemsCache;
  const parsed = await readJson<unknown>(ORDER_ITEMS_FILE, []);
  orderItemsCache = Array.isArray(parsed) ? (parsed as VoucherOrderItem[]) : [];
  return orderItemsCache;
}

async function readVouchers(): Promise<Voucher[]> {
  if (vouchersCache) return vouchersCache;
  const parsed = await readJson<unknown>(VOUCHERS_FILE, []);
  vouchersCache = Array.isArray(parsed) ? (parsed as Voucher[]) : [];
  return vouchersCache;
}

export async function getVoucherSettings(): Promise<{ voucherValidityMonths: number }> {
  if (settingsCache) return settingsCache;
  const parsed = await readJson<unknown>(SETTINGS_FILE, null);
  const months =
    parsed && typeof parsed === 'object' && typeof (parsed as { voucherValidityMonths?: unknown }).voucherValidityMonths === 'number'
      ? (parsed as { voucherValidityMonths: number }).voucherValidityMonths
      : 6;
  settingsCache = { voucherValidityMonths: months };
  return settingsCache;
}

export async function setVoucherValidityMonths(months: number): Promise<{ voucherValidityMonths: number }> {
  return enqueue(async () => {
    settingsCache = { voucherValidityMonths: Math.max(0, Math.floor(months)) };
    await writeJson(SETTINGS_FILE, settingsCache);
    return settingsCache;
  });
}

const VOUCHER_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomVoucherCode(): string {
  const bytes = randomBytes(10);
  let raw = '';
  for (let i = 0; i < 10; i += 1) {
    raw += VOUCHER_CODE_ALPHABET[bytes[i]! % VOUCHER_CODE_ALPHABET.length];
  }
  return `PRT-${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export interface OrderLineInput {
  serviceId: string;
  quantity: number;
}

export interface OrderView extends VoucherOrder {
  clientName: string;
  clientPhone: string;
  items: Array<VoucherOrderItem & { serviceLabel: string }>;
  status: VoucherOrder['status'];
  totalFcfa: number;
}

function toOrderView(o: VoucherOrder, clients: Client[], items: VoucherOrderItem[]): OrderView {
  const client = clients.find((c) => c.id === o.clientId);
  const lines = items.filter((i) => i.orderId === o.id);
  return {
    ...o,
    status: effectiveOrderStatus(o),
    clientName: client ? `${client.firstName} ${client.lastName}` : 'Cliente',
    clientPhone: client?.phone ?? '',
    items: lines.map((i) => ({ ...i, serviceLabel: serviceLabel(i.serviceId) })),
    totalFcfa: lines.reduce((sum, i) => sum + (i.finalUnitPriceFcfa ?? i.unitPriceFcfa) * i.quantity, 0),
  };
}

export async function listVoucherOrders(): Promise<OrderView[]> {
  const [orders, items, clients] = await Promise.all([readOrders(), readOrderItems(), readClients()]);
  return orders
    .map((o) => toOrderView(o, clients, items))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Crée une commande 'pending' (prix catalogue figés, calculés côté serveur). */
export async function createVoucherOrder(
  clientId: string,
  lines: OrderLineInput[],
  createdBy: 'client' | 'admin',
): Promise<VoucherOrder | { error: string } | null> {
  return enqueue(async () => {
    const clients = await readClients();
    const client = clients.find((c) => c.id === clientId);
    if (!client) return null;
    const orders = await readOrders();
    if (
      createdBy === 'client' &&
      orders.some((o) => o.clientId === clientId && effectiveOrderStatus(o) === 'pending')
    ) {
      return { error: 'Vous avez déjà une commande en attente de paiement.' };
    }
    const prices = await listServicePrices();
    const valid: OrderLineInput[] = [];
    for (const line of lines) {
      const price = prices[line.serviceId] ?? 0;
      if (!SERVICES.some((s) => s.id === line.serviceId) || price <= 0) {
        return { error: 'Prestation non vendable en bon.' };
      }
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10) {
        return { error: 'Quantité invalide (1 à 10).' };
      }
      valid.push(line);
    }
    const order: VoucherOrder = {
      id: randomUUID(),
      clientId,
      status: 'pending',
      createdBy,
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      cancelledAt: null,
    };
    const items = await readOrderItems();
    orders.push(order);
    for (const line of valid) {
      items.push({
        id: randomUUID(),
        orderId: order.id,
        serviceId: line.serviceId,
        quantity: line.quantity,
        unitPriceFcfa: prices[line.serviceId]!,
        finalUnitPriceFcfa: null,
      });
    }
    await writeJson(ORDERS_FILE, orders);
    await writeJson(ORDER_ITEMS_FILE, items);
    return order;
  });
}

/** Annulation par la cliente ou l'employée : aucun effet sur les points. */
export async function cancelVoucherOrder(
  orderId: string,
  clientId?: string,
): Promise<{ ok: true } | { error: string }> {
  return enqueue(async () => {
    const orders = await readOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { error: 'Commande introuvable.' };
    if (clientId && order.clientId !== clientId) return { error: 'Commande introuvable.' };
    if (effectiveOrderStatus(order) !== 'pending') {
      return { error: 'Cette commande ne peut plus être annulée.' };
    }
    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    await writeJson(ORDERS_FILE, orders);
    return { ok: true };
  });
}

/** Une même transaction : commande confirmée + bons créés + XP crédités. */
export async function confirmVoucherOrder(
  orderId: string,
  finalPrices: Array<{ serviceId: string; unitPriceFcfa: number }>,
  byClientId?: string,
): Promise<{ vouchers: Voucher[]; xpCredited: number } | { error: string }> {
  return enqueue(async () => {
    const orders = await readOrders();
    const items = await readOrderItems();
    const vouchers = await readVouchers();
    const clients = await readClients();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { error: 'Commande introuvable.' };
    if (byClientId && order.clientId !== byClientId) return { error: 'Commande introuvable.' };
    // Protection double clic : seul 'pending' effectif peut être confirmé.
    if (effectiveOrderStatus(order) !== 'pending') {
      return { error: 'Cette commande a déjà été traitée.' };
    }
    const orderLines = items.filter((i) => i.orderId === orderId);
    const finalByService = new Map(finalPrices.map((f) => [f.serviceId, f.unitPriceFcfa]));
    for (const [serviceId, price] of finalByService) {
      if (!orderLines.some((i) => i.serviceId === serviceId)) {
        return { error: 'Prestation inconnue dans cette commande.' };
      }
      if (!Number.isInteger(price) || price < 0 || price > 100_000_000) {
        return { error: 'Prix payé invalide.' };
      }
    }
    const settings = await getVoucherSettings();
    const createdVouchers: Voucher[] = [];
    let xpTotal = 0;
    const now = new Date();
    for (const line of orderLines) {
      const final = finalByService.get(line.serviceId) ?? line.unitPriceFcfa;
      line.finalUnitPriceFcfa = final;
      xpTotal += final * line.quantity;
      let expiresAt: string | null = null;
      if (settings.voucherValidityMonths > 0) {
        const exp = new Date(now);
        exp.setMonth(exp.getMonth() + settings.voucherValidityMonths);
        expiresAt = exp.toISOString();
      }
    const piecesEach = piecesForService(line.serviceId);
    const totalPieces = line.quantity * piecesEach;
    const totalPaid = final * line.quantity;
    for (let n = 0; n < totalPieces; n += 1) {
      // Répartit le total payé entre les pièces (les restes vont aux premières).
      const share = Math.floor(totalPaid / totalPieces) + (n < totalPaid % totalPieces ? 1 : 0);
      let code = randomVoucherCode();
      for (let attempt = 0; attempt < 5 && vouchers.some((v) => v.code === code); attempt += 1) {
        code = randomVoucherCode();
      }
      if (vouchers.some((v) => v.code === code)) {
        return { error: 'Génération de code impossible, réessayez.' };
      }
      const voucher: Voucher = {
        id: randomUUID(),
        code,
        serviceId: line.serviceId,
        orderId: order.id,
        ownerClientId: order.clientId,
        pricePaidFcfa: share,
        status: 'active',
        expiresAt,
        reservedVisitId: null,
        usedAt: null,
        xpCredited: share,
          createdAt: now.toISOString(),
        };
        vouchers.push(voucher);
        createdVouchers.push(voucher);
      }
    }
    order.status = 'confirmed';
    order.confirmedAt = now.toISOString();
    const owner = clients.find((c) => c.id === order.clientId);
    if (owner) {
      owner.totalXp += xpTotal;
      await writeJson(CLIENTS_FILE, clients);
    }
    await writeJson(ORDERS_FILE, orders);
    await writeJson(ORDER_ITEMS_FILE, items);
    await writeJson(VOUCHERS_FILE, vouchers);
    return { vouchers: createdVouchers, xpCredited: xpTotal };
  });
}

/** Vente directe par l'employée : commande 'confirmed' immédiatement. */
export async function createDirectVoucherOrder(
  clientId: string,
  lines: OrderLineInput[],
  finalPrices: Array<{ serviceId: string; unitPriceFcfa: number }>,
): Promise<{ vouchers: Voucher[]; xpCredited: number; orderId: string } | { error: string }> {
  const created = await createVoucherOrder(clientId, lines, 'admin');
  if (!created || 'error' in created) {
    return created && 'error' in created ? { error: created.error } : { error: 'Création impossible.' };
  }
  // L'XP n'est créditée qu'à la "confirmation" : même chemin que la commande cliente.
  const result = await confirmVoucherOrder(created.id, finalPrices);
  if ('error' in result) return result;
  return { ...result, orderId: created.id };
}

/** Un bon utilisable : actif, non expiré. */
export function voucherUsable(v: Voucher): boolean {
  if (v.status !== 'active') return false;
  if (v.expiresAt && Date.parse(v.expiresAt) <= Date.now()) return false;
  return true;
}

/** Rattache un bon à une visite en attente et ajuste le montant. */
export async function applyVoucherToRegistration(
  registrationId: string,
  code: string,
  byClientId?: string,
): Promise<{ registration: Registration; voucher: Voucher } | { error: string }> {
  return enqueue(async () => {
    const all = await readRegistrations();
    const vouchers = await readVouchers();
    const registration = all.find((r) => r.id === registrationId);
    if (!registration || registration.status !== 'en_attente') {
      return { error: 'Visite introuvable ou déjà traitée.' };
    }
    if (byClientId && registration.clientId !== byClientId) {
      return { error: 'Visite introuvable.' };
    }
    const voucher = vouchers.find((v) => v.code === code.trim().toUpperCase());
    if (!voucher) return { error: 'Code de bon introuvable.' };
    if (!voucherUsable(voucher)) {
      return { error: voucher.status === 'cancelled' ? 'Ce bon a été annulé.' : 'Ce bon n’est plus utilisable.' };
    }
    if (!registration.services.includes(voucher.serviceId)) {
      return { error: `Ce bon ne couvre pas une prestation de cette visite (${serviceLabel(voucher.serviceId)}).` };
    }
    if (voucher.reservedVisitId) {
      return { error: 'Ce bon est déjà réservé pour une autre visite.' };
    }
    const price = voucher.pricePaidFcfa;
    voucher.status = 'reserved';
    voucher.reservedVisitId = registration.id;
    registration.voucherIds = [...registration.voucherIds, voucher.id];
    registration.amountFcfa = Math.max(0, (registration.amountFcfa ?? 0) - price);
    await writeJson(VOUCHERS_FILE, vouchers);
    await writeJson(DATA_FILE, all);
    return { registration, voucher };
  });
}

/** Détache un bon d'une visite en attente : retour à 'active' et montant restauré. */
export async function detachVoucherFromRegistration(
  registrationId: string,
  voucherId: string,
  byClientId?: string,
): Promise<Registration | { error: string } | null> {
  return enqueue(async () => {
    const all = await readRegistrations();
    const vouchers = await readVouchers();
    const registration = all.find((r) => r.id === registrationId);
    if (!registration) return null;
    if (byClientId && registration.clientId !== byClientId) return { error: 'Visite introuvable.' };
    if (registration.status !== 'en_attente') {
      return { error: 'Le bon ne peut être détaché que tant que la visite est en attente.' };
    }
    const voucher = vouchers.find((v) => v.id === voucherId);
    if (!voucher || !registration.voucherIds.includes(voucherId)) {
      return { error: 'Bon non appliqué à cette visite.' };
    }
    const price = voucher.pricePaidFcfa;
    voucher.status = 'active';
    voucher.reservedVisitId = null;
    registration.voucherIds = registration.voucherIds.filter((id) => id !== voucherId);
    registration.amountFcfa = (registration.amountFcfa ?? 0) + price;
    await writeJson(VOUCHERS_FILE, vouchers);
    await writeJson(DATA_FILE, all);
    return registration;
  });
}

/** Fait suivre aux bons le statut d'une visite. */
async function syncVouchersWithStatus(registration: Registration, newStatus: RegistrationStatus): Promise<void> {
  if (!registration.voucherIds.length) return;
  const vouchers = await readVouchers();
  let changed = false;
  for (const vid of registration.voucherIds) {
    const v = vouchers.find((x) => x.id === vid);
    if (!v || v.status === 'cancelled') continue;
    if (newStatus === 'termine') {
      v.status = 'used';
      v.usedAt = new Date().toISOString();
      changed = true;
    } else if (newStatus === 'annule') {
      v.status = 'active';
      v.reservedVisitId = null;
      v.usedAt = null;
      changed = true;
    } else if (newStatus === 'en_attente') {
      v.status = 'reserved';
      v.reservedVisitId = registration.id;
      v.usedAt = null;
      changed = true;
    }
  }
  if (changed) await writeJson(VOUCHERS_FILE, vouchers);
}

/** Annulation d'un bon par l'admin : 'active' seulement, XP retirés si possible. */
export async function cancelVoucher(
  voucherId: string,
): Promise<{ ok: true } | { error: string }> {
  return enqueue(async () => {
    const vouchers = await readVouchers();
    const clients = await readClients();
    const voucher = vouchers.find((v) => v.id === voucherId);
    if (!voucher) return { error: 'Bon introuvable.' };
    if (voucher.status !== 'active') {
      return { error: 'Seul un bon actif peut être annulé.' };
    }
    const owner = clients.find((c) => c.id === voucher.ownerClientId);
    if (owner) {
      const { rewards, redemptions } = await readLoyalty();
      const reservedCost = redemptions
        .filter((r) => r.clientId === owner.id && (r.status === 'pending' || r.status === 'used'))
        .reduce((sum, r) => sum + (rewards.find((w) => w.id === r.rewardId)?.costFlowers ?? 0), 0);
      const availableAfter = Math.floor((owner.totalXp - voucher.xpCredited) / 10_000) - reservedCost;
      if (availableAfter < 0) {
        return {
          error: 'Annulation impossible : ce retrait rendrait les Fleurs réservées de cette cliente négatives (échange en cours ou récompense déjà utilisée).',
        };
      }
      owner.totalXp = Math.max(0, owner.totalXp - voucher.xpCredited);
      await writeJson(CLIENTS_FILE, clients);
    }
    voucher.status = 'cancelled';
    await writeJson(VOUCHERS_FILE, vouchers);
    return { ok: true };
  });
}

export interface VoucherRow extends Voucher {
  ownerName: string;
  ownerPhone: string;
  serviceLabel: string;
  effectiveStatus: 'active' | 'reserved' | 'used' | 'cancelled' | 'expired';
}

export async function listVouchers(): Promise<VoucherRow[]> {
  const [vouchers, clients] = await Promise.all([readVouchers(), readClients()]);
  return vouchers
    .map((v) => {
      const owner = clients.find((c) => c.id === v.ownerClientId);
      const expired = v.status === 'active' && v.expiresAt !== null && Date.parse(v.expiresAt) <= Date.now();
      return {
        ...v,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Cliente',
        ownerPhone: owner?.phone ?? '',
        serviceLabel: serviceLabel(v.serviceId),
        effectiveStatus: expired ? ('expired' as const) : v.status,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Recherche de clientes pour la vente directe. */
export async function searchClients(query: string): Promise<Array<{ id: string; name: string; phone: string }>> {
  const clients = await readClients();
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return clients
    .filter(
      (c) =>
        c.firstName.toLowerCase().includes(needle) ||
        c.lastName.toLowerCase().includes(needle) ||
        c.phone.includes(query.replace(/\D/g, '')),
    )
    .slice(0, 20)
    .map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, phone: c.phone }));
}

/** Création rapide d'une cliente (vente directe), ou rapprochement par téléphone. */
export async function quickCreateClient(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<Client> {
  return enqueue(async () => {
    const clients = await readClients();
    const digits = normalizePhone(input.phone);
    const existing = findClientByPhone(clients, digits);
    if (existing) return existing;
    const client: Client = {
      v: 1,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: digits,
      claimedPhone: digits,
      totalXp: 0,
      status: 'client',
      source: null,
      interestServiceId: null,
      consentContactAt: null,
      convertedAt: null,
    };
    clients.push(client);
    await writeJson(CLIENTS_FILE, clients);
    return client;
  });
}

/* ----------------------------------------------------------------------- */
/* Visite creee par le client connecte                                     */
/* ----------------------------------------------------------------------- */

export async function createVisitForClient(
  clientId: string,
  services: string[],
  voucherIds: string[] = [],
): Promise<Registration | { error: string } | null> {
  return enqueue(async () => {
    const clients = await readClients();
    const client = clients.find((c) => c.id === clientId);
    if (!client) return null;
    if (client.status === 'prospect') {
      client.status = 'client';
      client.convertedAt = new Date().toISOString();
      await writeJson(CLIENTS_FILE, clients);
    }

    const all = await readRegistrations();
    const pending = all.find((r) => r.clientId === client.id && r.status === 'en_attente');
    if (pending) {
      return { error: 'Vous avez déjà une visite en attente. Un seul passage à la fois.' };
    }

    // Valide les bons avant de créer la visite.
    const vouchers = await readVouchers();
    let discount = 0;
    for (const vid of voucherIds) {
      const v = vouchers.find((x) => x.id === vid);
      if (!v || v.ownerClientId !== client.id || !voucherUsable(v) || !services.includes(v.serviceId)) {
        return { error: 'Un des bons sélectionnés n’est plus utilisable.' };
      }
      discount += v.pricePaidFcfa;
    }

    const now = new Date();
    const record: Registration = {
      v: REGISTRATION_VERSION,
      id: randomUUID(),
      createdAt: now.toISOString(),
      day: dayKeyOf(now),
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      services,
      other: '',
      note: '',
      status: 'en_attente',
      clientId: client.id,
      amountFcfa: Math.max(0, (await catalogAmount(services)) - discount),
      xpEarned: null,
      voucherIds: [],
    };
    all.push(record);
    for (const vid of voucherIds) {
      const v = vouchers.find((x) => x.id === vid)!;
      v.status = 'reserved';
      v.reservedVisitId = record.id;
      record.voucherIds.push(v.id);
    }
    await writeJson(DATA_FILE, all);
    await writeJson(VOUCHERS_FILE, vouchers);
    return record;
  });
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
    await syncVouchersWithStatus(found, status);
    await writeJson(DATA_FILE, all);
    return { registration: found, xpCredited };
  });
}

/** Premier passage : cree le client si besoin et ouvre sa session. */
export async function firstVisit(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<Client | { exists: true } | null> {
  return enqueue(async () => {
    const clients = await readClients();
    const digits = normalizePhone(input.phone);
    if (digits.length < 8) return null;
    const existing = findClientByPhone(clients, digits);
    if (existing) {
      // Un prospect qui s'inscrit devient cliente directement.
      if (existing.status === 'prospect') {
        existing.status = 'client';
        existing.convertedAt = new Date().toISOString();
        await writeJson(CLIENTS_FILE, clients);
        return existing;
      }
      // Un compte existe deja pour ce numero : il faut passer par le code.
      return { exists: true };
    }
    const client: Client = {
      v: 1,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: digits,
      claimedPhone: digits,
      totalXp: 0,
      status: 'client' as const,
      source: null,
      interestServiceId: null,
      consentContactAt: null,
      convertedAt: null,
    };
    clients.push(client);
    await writeJson(CLIENTS_FILE, clients);
    return client;
  });
}

/* ----------------------------------------------------------------------- */
/* Prospects                                                               */
/* ----------------------------------------------------------------------- */

const LINKS_FILE = join(DATA_DIR, 'prospect-links.json');
let linksCache: import('../src/lib/types.ts').ProspectLink[] | null = null;

async function readLinks(): Promise<import('../src/lib/types.ts').ProspectLink[]> {
  if (linksCache) return linksCache;
  const parsed = await readJson<unknown>(LINKS_FILE, []);
  linksCache = Array.isArray(parsed) ? (parsed as import('../src/lib/types.ts').ProspectLink[]) : [];
  return linksCache;
}

export async function createProspectLink(label: string): Promise<import('../src/lib/types.ts').ProspectLink> {
  return enqueue(async () => {
    const links = await readLinks();
    const trimmed = label.trim();
    const link = {
      id: randomUUID(),
      token: randomBytes(18).toString('base64url'),
      label: trimmed || `Lien ${links.length + 1}`,
      active: true,
      createdAt: new Date().toISOString(),
    };
    links.push(link);
    await writeJson(LINKS_FILE, links);
    return link;
  });
}

export async function listProspectLinks(): Promise<import('../src/lib/types.ts').ProspectLinkRow[]> {
  const links = await readLinks();
  const clients = await readClients();
  return links
    .map((link) => ({
      ...link,
      prospectCount: clients.filter((c) => c.status !== undefined && c.source === link.label).length,
      convertedCount: clients.filter((c) => c.source === link.label && c.convertedAt).length,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setProspectLinkActive(id: string, active: boolean): Promise<import('../src/lib/types.ts').ProspectLink | null> {
  return enqueue(async () => {
    const links = await readLinks();
    const found = links.find((l) => l.id === id);
    if (!found) return null;
    found.active = active;
    await writeJson(LINKS_FILE, links);
    return found;
  });
}

export async function findLinkByToken(token: string): Promise<import('../src/lib/types.ts').ProspectLink | null> {
  const links = await readLinks();
  return links.find((l) => l.token === token) ?? null;
}

/**
 * Soumission du formulaire public. Retourne toujours succès visible :
 * jamais de révélation sur l'existence d'un numéro.
 */
export async function submitProspect(input: {
  linkLabel: string;
  firstName: string;
  lastName: string;
  phone: string;
  interestServiceId: string | null;
}): Promise<{ ok: true }> {
  return enqueue(async () => {
    const clients = await readClients();
    const digits = normalizePhone(input.phone);
    const existing = findClientByPhone(clients, digits);
    if (existing) {
      // Ne pas signaler que le numéro existe ; rafraîchir l'intérêt si prospect.
      if (existing.status === 'prospect' && input.interestServiceId) {
        existing.interestServiceId = input.interestServiceId;
        existing.firstName = input.firstName || existing.firstName;
        existing.lastName = input.lastName || existing.lastName;
        await writeJson(CLIENTS_FILE, clients);
      }
      return { ok: true };
    }
    clients.push({
      v: 1,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: digits,
      claimedPhone: digits,
      totalXp: 0,
      status: 'prospect',
      source: input.linkLabel,
      interestServiceId: input.interestServiceId,
      consentContactAt: new Date().toISOString(),
      convertedAt: null,
    });
    await writeJson(CLIENTS_FILE, clients);
    return { ok: true };
  });
}

export async function listProspects(): Promise<import('../src/lib/types.ts').ProspectRow[]> {
  const clients = await readClients();
  return clients
    .filter((c) => c.status === 'prospect' || c.source !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      interestServiceId: c.interestServiceId,
      source: c.source,
      createdAt: c.createdAt,
      status: c.status,
      convertedAt: c.convertedAt,
    }));
}

export async function convertProspect(
  id: string,
  services: string[] = [],
): Promise<Client | null> {
  return enqueue(async () => {
    const clients = await readClients();
    const found = clients.find((c) => c.id === id);
    if (!found) return null;
    if (found.status === 'prospect') {
      found.status = 'client';
      found.convertedAt = new Date().toISOString();
      await writeJson(CLIENTS_FILE, clients);
      // Conversion = prestation reçue : on l'enregistre dans le registre,
      // en attente, pour que l'employée puisse la facturer/passer Terminé.
      if (services.length > 0) {
        const all = await readRegistrations();
        const now = new Date();
        all.push({
          v: REGISTRATION_VERSION,
          id: randomUUID(),
          createdAt: now.toISOString(),
          day: dayKeyOf(now),
          firstName: found.firstName,
          lastName: found.lastName,
          phone: found.phone,
          services,
          other: '',
          note: '',
          status: 'en_attente',
          clientId: found.id,
          amountFcfa: await catalogAmount(services),
          xpEarned: null,
          voucherIds: [],
        });
        await writeJson(DATA_FILE, all);
      }
    }
    return found;
  });
}

/** Liste de tous les clients (prospects inclus) pour l'onglet admin. */
export async function listClients(): Promise<Array<Client & { flowersTotal: number }>> {
  const clients = await readClients();
  return clients
    .map((c) => ({ ...c, flowersTotal: Math.max(0, Math.floor(c.totalXp / 10_000)) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Suppression réservée aux prospects sans la moindre visite. */
export async function deleteProspect(id: string): Promise<{ ok: true } | { error: string }> {
  return enqueue(async () => {
    const clients = await readClients();
    const found = clients.find((c) => c.id === id);
    if (!found || found.status !== 'prospect') return { error: 'Prospect introuvable.' };
    const all = await readRegistrations();
    if (all.some((r) => r.clientId === id)) {
      return { error: 'Ce prospect a déjà une visite : suppression impossible.' };
    }
    await writeJson(CLIENTS_FILE, clients.filter((c) => c.id !== id));
    clientsCache = clients.filter((c) => c.id !== id);
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
        phone: digits,
        claimedPhone: digits,
        totalXp: 0,
        status: 'client' as const,
        source: null,
        interestServiceId: null,
        consentContactAt: null,
        convertedAt: null,
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

