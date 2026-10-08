import { useEffect, useMemo, useState } from 'react';

import { listClients, type AdminClient } from '../../lib/api';
import { CLIENT_STATUS_LABELS } from '../../config/client-status';
import { XP_LABEL } from '../../lib/loyalty';
import { formatDateTime } from '../../lib/utils';
import { TextInput } from '../ui/Field';

/** Onglet Clients : liste complète (clientes et prospects). */
export function ClientsAdmin() {
  const [clients, setClients] = useState<AdminClient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible.'));
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!clients) return [];
    if (!needle) return clients;
    return clients.filter(
      (c) =>
        c.firstName.toLowerCase().includes(needle) ||
        c.lastName.toLowerCase().includes(needle) ||
        c.phone.includes(needle.replace(/\D/g, '')),
    );
  }, [clients, query]);

  if (error) {
    return (
      <p role="alert" className="border-danger-soft text-danger rounded-tile border px-4 py-3 text-sm font-medium">
        {error}
      </p>
    );
  }
  if (!clients) return <p className="text-muted text-sm">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted text-sm">
        {clients.filter((c) => c.status === 'client').length} cliente(s) ·{' '}
        {clients.filter((c) => c.status === 'prospect').length} prospect(s)
      </p>
      <TextInput
        placeholder="Rechercher par nom ou téléphone…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {visible.length === 0 ? (
        <p className="text-muted text-sm">Aucun résultat.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((c) => (
            <li
              key={c.id}
              className="border-card-border bg-card flex flex-col gap-1 rounded-tile border px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink font-serif text-lg leading-tight">
                  {c.firstName} {c.lastName}
                </p>
                <span
                  className={`rounded-pill px-2.5 py-1 font-sans text-[0.7rem] font-semibold ${
                    c.status === 'prospect'
                      ? 'bg-primary-light text-primary-ink'
                      : 'bg-success-soft text-success'
                  }`}
                >
                  {CLIENT_STATUS_LABELS[c.status]}
                </span>
              </div>
              <a
                href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                className="text-primary-ink text-sm font-medium"
              >
                {c.phone}
              </a>
              <p className="text-muted text-xs">
                {c.totalXp.toLocaleString('fr-FR')} {XP_LABEL} · {c.flowersTotal} Fleur
                {c.flowersTotal > 1 ? 's' : ''} · source : {c.source ?? 'comptoir / QR'} · inscrite le{' '}
                {formatDateTime(c.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
