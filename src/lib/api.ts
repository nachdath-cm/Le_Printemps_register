import type {
  CreateRegistrationInput,
  Registration,
  RegistrationStatus,
  RedemptionStatus,
  Reward,
  SpaceData,
  ServicePrice,
} from './types';

/**
 * Client de l'API du registre.
 * Toute erreur reseau est transformee en `ApiError` afin que l'interface
 * n'ait qu'un seul cas a gerer.
 */

const BASE = '/api';
const TOKEN_KEY = 'lp.admin.token';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        // Les routes protegees portent le jeton de session admin.
        ...(auth ? authHeaders() : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body && typeof body.error === 'string' && body.error) return body.error;
  } catch {
    /* reponse non JSON */
  }
  return `Erreur ${response.status}.`;
}

/* -------------------------------------------------------------------------- */
/* Inscriptions                                                                */
/* -------------------------------------------------------------------------- */

export function createRegistration(
  input: CreateRegistrationInput,
): Promise<Registration> {
  return request<Registration>('/registrations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function setRegistrationAmount(id: string, amountFcfa: number): Promise<Registration> {
  return request<Registration>(
    `/registrations/${encodeURIComponent(id)}/amount`,
    { method: 'PATCH', body: JSON.stringify({ amountFcfa }) },
    true,
  );
}

export function setRegistrationStatus(
  id: string,
  status: RegistrationStatus,
): Promise<Registration & { xpCredited: number }> {
  return request<Registration & { xpCredited: number }>(
    `/registrations/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    true,
  );
}

/* ----------------------------------------------------------------------- */
/* Catalogue des prestations et de leurs prix                              */
/* ----------------------------------------------------------------------- */

export interface PublicService {
  id: string;
  label: string;
  categoryId: string;
  priceFcfa: number;
}

export function listPublicServices(): Promise<PublicService[]> {
  return request<PublicService[]>('/services');
}

export function setServicePrice(id: string, priceFcfa: number): Promise<ServicePrice> {
  return request<ServicePrice>(
    `/services/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify({ priceFcfa }) },
    true,
  );
}

/* ----------------------------------------------------------------------- */
/* Récompenses et échanges                                                 */
/* ----------------------------------------------------------------------- */

export function listRewards(): Promise<Reward[]> {
  return request<Reward[]>('/rewards', {}, true);
}

export function createReward(input: {
  title: string;
  description: string;
  costFlowers: number;
  active: boolean;
}): Promise<Reward> {
  return request<Reward>(
    '/rewards',
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

export function updateReward(
  id: string,
  patch: Partial<Pick<Reward, 'title' | 'description' | 'costFlowers' | 'active'>>,
): Promise<Reward> {
  return request<Reward>(
    `/rewards/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
    true,
  );
}

export function deleteReward(id: string): Promise<void> {
  return request<void>(`/rewards/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
}

export interface RedemptionRow {
  id: string;
  clientName: string;
  rewardTitle: string;
  status: RedemptionStatus;
  createdAt: string;
  usedAt: string | null;
}

export function listRedemptions(): Promise<RedemptionRow[]> {
  return request<RedemptionRow[]>('/redemptions', {}, true);
}

export function setRedemptionStatus(id: string, status: RedemptionStatus): Promise<RedemptionRow> {
  return request<RedemptionRow>(
    `/redemptions/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    true,
  );
}

export function listRegistrations(params: { day?: string } = {}): Promise<Registration[]> {
  const query = params.day ? `?day=${encodeURIComponent(params.day)}` : '';
  return request<Registration[]>(`/registrations${query}`, {}, true);
}

/* -------------------------------------------------------------------------- */
/* Session admin (PIN)                                                         */
/* -------------------------------------------------------------------------- */

export function login(pin: string): Promise<{ token: string }> {
  return request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export function tokenStorage(): {
  get: () => string | null;
  set: (token: string) => void;
  clear: () => void;
} {
  return {
    get: () => {
      try {
        return sessionStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    },
    set: (token) => {
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* mode prive : la session ne survivra pas, ce qui est acceptable */
      }
    },
    clear: () => {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

export function authHeaders(): Record<string, string> {
  const token = tokenStorage().get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** URL du CSV, avec le jeton en query (le <a download> ne porte pas d'en-tetes). */
export function exportUrl(day?: string): string {
  const params = new URLSearchParams();
  const token = tokenStorage().get();
  if (token) params.set('token', token);
  if (day) params.set('day', day);
  const query = params.toString();
  return `${BASE}/registrations.csv${query ? `?${query}` : ''}`;
}

/* ----------------------------------------------------------------------- */
/* Session client + espace personnel                                       */
/* ----------------------------------------------------------------------- */

export function clientFirstVisit(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ ok: true }> {
  return request<{ ok: true }>('/auth/client/first-visit', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function requestClientCode(phone: string): Promise<{ code: string; whatsappUrl: string }> {
  return request<{ code: string; whatsappUrl: string }>('/auth/client/request-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyClientCode(phone: string, code: string): Promise<{ ok: true }> {
  return request<{ ok: true }>('/auth/client/verify-code', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

export function clientLogout(): Promise<{ ok: true }> {
  return request<{ ok: true }>('/auth/client/logout', { method: 'POST' });
}

export function getMe(): Promise<SpaceData> {
  return request<SpaceData>('/me');
}

export function redeemFromSpace(rewardId: string): Promise<SpaceData> {
  return request<SpaceData>('/me/redeem', {
    method: 'POST',
    body: JSON.stringify({ rewardId }),
  });
}

export function createMyVisit(services: string[]): Promise<Registration> {
  return request<Registration>('/me/visits', {
    method: 'POST',
    body: JSON.stringify({ services }),
  });
}

/* ----------------------------------------------------------------------- */
/* Prospects                                                               */
/* ----------------------------------------------------------------------- */

import type { ProspectLinkRow, ProspectRow } from './types';
export type { ProspectLinkRow, ProspectRow };

export function submitProspectLink(
  token: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    interestServiceId?: string | null;
    consent?: boolean;
    website?: string;
  },
): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/public/prospect-link/${encodeURIComponent(token)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listProspectLinks(): Promise<ProspectLinkRow[]> {
  return request<ProspectLinkRow[]>('/prospect-links', {}, true);
}

export function createProspectLink(label: string): Promise<ProspectLinkRow> {
  return request<ProspectLinkRow>('/prospect-links', {
    method: 'POST',
    body: JSON.stringify({ label }),
  }, true);
}

export function setProspectLinkActive(id: string, active: boolean): Promise<ProspectLinkRow> {
  return request<ProspectLinkRow>(`/prospect-links/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  }, true);
}

export function listProspects(): Promise<ProspectRow[]> {
  return request<ProspectRow[]>('/prospects', {}, true);
}

export function convertProspect(id: string, services: string[] = []): Promise<{ ok: true; visitCreated: boolean }> {
  return request<{ ok: true; visitCreated: boolean }>(`/prospects/${encodeURIComponent(id)}/convert`, {
    method: 'POST',
    body: JSON.stringify({ services }),
  }, true);
}

export interface AdminClient {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  totalXp: number;
  status: 'prospect' | 'client';
  source: string | null;
  interestServiceId: string | null;
  convertedAt: string | null;
  flowersTotal: number;
}

export function listClients(): Promise<AdminClient[]> {
  return request<AdminClient[]>('/clients', {}, true);
}

/* ----------------------------------------------------------------------- */
/* Bons : espace cliente + admin                                           */
/* ----------------------------------------------------------------------- */

export interface AdminVoucherOrder {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  createdBy: 'client' | 'admin';
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  totalFcfa: number;
  items: Array<{
    id: string;
    serviceId: string;
    serviceLabel: string;
    quantity: number;
    unitPriceFcfa: number;
    finalUnitPriceFcfa: number | null;
  }>;
}

export interface AdminVoucher {
  id: string;
  code: string;
  serviceId: string;
  serviceLabel: string;
  ownerClientId: string;
  ownerName: string;
  ownerPhone: string;
  pricePaidFcfa: number;
  status: 'active' | 'reserved' | 'used' | 'cancelled';
  effectiveStatus: 'active' | 'reserved' | 'used' | 'cancelled' | 'expired';
  expiresAt: string | null;
  usedAt: string | null;
  xpCredited: number;
  createdAt: string;
}

export function createVoucherOrder(lines: Array<{ serviceId: string; quantity: number }>): Promise<{ id: string }> {
  return request<{ id: string }>('/me/voucher-orders', {
    method: 'POST',
    body: JSON.stringify({ lines }),
  });
}

export function cancelMyVoucherOrder(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/me/voucher-orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  });
}

export function listVoucherOrdersAdmin(): Promise<AdminVoucherOrder[]> {
  return request<AdminVoucherOrder[]>('/voucher-orders', {}, true);
}

export function confirmVoucherOrder(
  id: string,
  prices: Array<{ serviceId: string; unitPriceFcfa: number }>,
): Promise<{ vouchers: Array<{ code: string }>; xpCredited: number }> {
  return request(`/voucher-orders/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ prices }),
  }, true);
}

export function cancelVoucherOrderAdmin(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/voucher-orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  }, true);
}

export function directSale(input: {
  clientId: string;
  lines: Array<{ serviceId: string; quantity: number }>;
  prices: Array<{ serviceId: string; unitPriceFcfa: number }>;
}): Promise<{ vouchers: Array<{ code: string }>; xpCredited: number }> {
  return request('/voucher-orders/direct', {
    method: 'POST',
    body: JSON.stringify(input),
  }, true);
}

export function listVouchersAdmin(): Promise<AdminVoucher[]> {
  return request<AdminVoucher[]>('/vouchers', {}, true);
}

export function cancelVoucherCode(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/vouchers/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  }, true);
}

export function getVoucherSettings(): Promise<{ voucherValidityMonths: number }> {
  return request<{ voucherValidityMonths: number }>('/voucher-settings', {}, true);
}

export function setVoucherValidityMonths(months: number): Promise<{ voucherValidityMonths: number }> {
  return request<{ voucherValidityMonths: number }>('/voucher-settings', {
    method: 'PATCH',
    body: JSON.stringify({ months }),
  }, true);
}

export function searchClients(q: string): Promise<Array<{ id: string; name: string; phone: string }>> {
  return request(`/clients/search?q=${encodeURIComponent(q)}`, {}, true);
}

export function createClientAccount(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ id: string }> {
  return request<{ id: string }>('/clients', {
    method: 'POST',
    body: JSON.stringify(input),
  }, true);
}

export function applyVoucherToVisitAdmin(registrationId: string, code: string): Promise<unknown> {
  return request(`/registrations/${encodeURIComponent(registrationId)}/vouchers`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  }, true);
}

export function detachVoucherFromVisitAdmin(registrationId: string, voucherId: string): Promise<unknown> {
  return request(`/registrations/${encodeURIComponent(registrationId)}/vouchers/detach`, {
    method: 'POST',
    body: JSON.stringify({ voucherId }),
  }, true);
}

export function createMyVisitWithVouchers(services: string[], voucherIds: string[]): Promise<Registration> {
  return request<Registration>('/me/visits', {
    method: 'POST',
    body: JSON.stringify({ services, voucherIds }),
  });
}

export function deleteProspect(id: string): Promise<void> {
  return request<void>(`/prospects/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
}
