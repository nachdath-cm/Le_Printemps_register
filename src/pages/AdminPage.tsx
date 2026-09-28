import { Download, Inbox, Phone, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminHeader } from '../components/AdminHeader';
import { AdminLogin } from '../components/AdminLogin';
import { Button } from '../components/ui/Button';
import { FilterPill } from '../components/ui/Card';
import { OTHER_SERVICE_ID, serviceLabel } from '../config/services';
import {
  ApiError,
  exportUrl,
  listRegistrations,
  setRegistrationStatus,
  tokenStorage,
} from '../lib/api';
import { STATUS_LABEL, type Registration, type RegistrationStatus } from '../lib/types';
import { formatDateTime, formatDayLabel, localDayKey } from '../lib/utils';

const FILTERS: { value: RegistrationStatus | 'tous'; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'termine', label: 'Terminés' },
  { value: 'annule', label: 'Annulés' },
];

const STATUS_STYLE: Record<RegistrationStatus, string> = {
  en_attente: 'bg-primary-light text-primary-ink',
  termine: 'bg-success-soft text-success',
  annule: 'bg-danger-soft text-danger',
};

export function AdminPage() {
  const [authed, setAuthed] = useState(Boolean(tokenStorage().get()));
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RegistrationStatus | 'tous'>('tous');
  const [query, setQuery] = useState('');
  const [day, setDay] = useState(localDayKey());
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (targetDay: string) => {
    try {
      const data = await listRegistrations({ day: targetDay });
      setRows(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        tokenStorage().clear();
        setAuthed(false);
        return;
      }
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (authed) void load(day);
  }, [authed, day, load]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== 'tous' && row.status !== filter) return false;
      if (!needle) return true;
      return (
        row.firstName.toLowerCase().includes(needle) ||
        row.lastName.toLowerCase().includes(needle) ||
        row.phone.toLowerCase().includes(needle) ||
        row.services.some((s) => serviceLabel(s).toLowerCase().includes(needle))
      );
    });
  }, [rows, filter, query]);

  const counts = useMemo(() => {
    const base = { tous: 0, en_attente: 0, termine: 0, annule: 0 };
    for (const row of rows ?? []) {
      base.tous += 1;
      base[row.status] += 1;
    }
    return base;
  }, [rows]);

  async function changeStatus(id: string, status: RegistrationStatus) {
    setBusyId(id);
    try {
      const updated = await setRegistrationStatus(id, status);
      setRows((prev) => (prev ? prev.map((r) => (r.id === id ? updated : r)) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  }

  function signOut() {
    tokenStorage().clear();
    setAuthed(false);
    setRows(null);
  }

  if (!authed) {
    return (
      <AdminLogin
        onSuccess={() => {
          setAuthed(true);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="bg-cream flex min-h-dvh flex-col">
      <AdminHeader onSignOut={signOut} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-1">
          <p className="eyebrow">Registre des prestations</p>
          <h1 className="text-ink font-serif text-3xl capitalize sm:text-4xl">
            {formatDayLabel(day)}
          </h1>
        </header>

        {/* --- Commandes ---------------------------------------------------- */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="bg-primary-light/50 flex gap-1.5 self-start overflow-x-auto rounded-pill p-1.5"
              role="group"
              aria-label="Filtrer par statut"
            >
              {FILTERS.map((item) => (
                <FilterPill
                  key={item.value}
                  active={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  <span className={filter === item.value ? 'text-white' : 'text-muted'}>
                    {counts[item.value]}
                  </span>
                </FilterPill>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="day" className="sr-only">
                Journée
              </label>
              <input
                id="day"
                type="date"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className="border-card-border bg-surface text-ink rounded-pill border px-4 py-2.5 font-sans text-sm"
              />
              <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={() => void load(day)}>
                Actualiser
              </Button>
              <a
                href={exportUrl(day)}
                className="border-primary text-primary-ink hover:bg-primary-light inline-flex items-center gap-2 rounded-pill border px-5 py-2 font-sans text-sm font-medium transition-colors"
              >
                <Download className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Exporter</span>
                CSV
              </a>
            </div>
          </div>

          <div className="relative">
            <Search
              className="text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="search" className="sr-only">
              Rechercher un client
            </label>
            <input
              id="search"
              type="search"
              value={query}
              placeholder="Rechercher un nom, un téléphone, une prestation…"
              onChange={(event) => setQuery(event.target.value)}
              className="border-card-border bg-surface text-ink placeholder:text-muted focus-visible:border-primary-ink focus-visible:ring-primary-glow w-full rounded-pill border py-3 pr-4 pl-11 font-sans text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="border-danger-soft text-danger rounded-tile border px-4 py-3 text-sm font-medium"
          >
            {error}
          </p>
        )}

        {/* --- Liste -------------------------------------------------------- */}
        {rows === null ? (
          <SkeletonList />
        ) : visible.length === 0 ? (
          <EmptyState filtered={rows.length > 0} />
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((row) => (
              <RegistrationRow
                key={row.id}
                row={row}
                busy={busyId === row.id}
                onChange={(status) => void changeStatus(row.id, status)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RegistrationRow({
  row,
  busy,
  onChange,
}: {
  row: Registration;
  busy: boolean;
  onChange: (status: RegistrationStatus) => void;
}) {
  return (
    <li className="border-card-border bg-card flex flex-col gap-3 rounded-card border p-4 transition-opacity sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-ink font-serif text-lg leading-tight">
            {row.firstName} {row.lastName}
          </h2>
          <span
            className={`rounded-pill px-2.5 py-1 font-sans text-[0.7rem] font-semibold ${STATUS_STYLE[row.status]}`}
          >
            {STATUS_LABEL[row.status]}
          </span>
        </div>

        <a
          href={`tel:${row.phone.replace(/[^\d+]/g, '')}`}
          className="text-primary-ink inline-flex items-center gap-1.5 font-sans text-sm font-medium"
        >
          <Phone className="size-3.5" aria-hidden="true" />
          {row.phone}
        </a>

        <ul className="flex flex-wrap gap-1.5">
          {row.services.map((id) => (
            <li
              key={id}
              className="border-primary-light bg-surface text-primary-ink rounded-pill border px-2.5 py-1 font-sans text-xs font-medium"
            >
              {serviceLabel(id)}
            </li>
          ))}
        </ul>

        {row.services.includes(OTHER_SERVICE_ID) && row.other && (
          <p className="text-muted text-sm italic">« {row.other} »</p>
        )}
        {row.note && <p className="text-muted text-sm">Note : {row.note}</p>}

        <p className="text-muted text-xs">{formatDateTime(row.createdAt)}</p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {row.status !== 'termine' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onChange('termine')}
          >
            Terminé
          </Button>
        )}
        {row.status !== 'en_attente' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onChange('en_attente')}
          >
            Réactiver
          </Button>
        )}
        {row.status !== 'annule' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onChange('annule')}
            className="text-danger hover:bg-danger-soft"
          >
            Annuler
          </Button>
        )}
      </div>
    </li>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="border-card-border bg-card flex flex-col items-center gap-3 rounded-card border px-6 py-16 text-center">
      <span className="bg-primary-light text-primary-ink flex size-14 items-center justify-center rounded-full">
        {filtered ? (
          <Search className="size-6" aria-hidden="true" />
        ) : (
          <Inbox className="size-6" aria-hidden="true" />
        )}
      </span>
      <h2 className="text-ink font-serif text-xl">
        {filtered ? 'Aucun résultat' : 'Aucune inscription'}
      </h2>
      <p className="text-muted max-w-sm text-sm">
        {filtered
          ? 'Aucune inscription ne correspond à votre recherche ou au filtre choisi.'
          : 'Les inscriptions des clients apparaîtront ici dès qu’ils scanneront le QR code.'}
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="border-card-border bg-card animate-pulse rounded-card border p-5">
          <div className="bg-card-border mb-3 h-5 w-44 rounded-full" />
          <div className="bg-card-border mb-2 h-3.5 w-32 rounded-full" />
          <div className="bg-card-border h-3.5 w-56 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
