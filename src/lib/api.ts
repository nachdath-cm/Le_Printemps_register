import type { CreateRegistrationInput, Registration, RegistrationStatus } from './types';

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

export function createRegistration(input: CreateRegistrationInput): Promise<Registration> {
  return request<Registration>('/registrations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listRegistrations(params: { day?: string } = {}): Promise<Registration[]> {
  const query = params.day ? `?day=${encodeURIComponent(params.day)}` : '';
  return request<Registration[]>(`/registrations${query}`, {}, true);
}

export function setRegistrationStatus(
  id: string,
  status: RegistrationStatus,
): Promise<Registration> {
  return request<Registration>(
    `/registrations/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    true,
  );
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
