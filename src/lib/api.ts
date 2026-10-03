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
