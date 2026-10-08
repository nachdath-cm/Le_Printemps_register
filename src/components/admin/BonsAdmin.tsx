import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  cancelVoucherCode,
  cancelVoucherOrderAdmin,
  confirmVoucherOrder,
  createClientAccount,
  directSale,
  getVoucherSettings,
  listPublicServices,
  listVoucherOrdersAdmin,
  listVouchersAdmin,
  searchClients,
  setVoucherValidityMonths,
  type AdminVoucher,
  type AdminVoucherOrder,
  type PublicService,
} from '../../lib/api';
import { SERVICE_CATEGORIES } from '../../config/services';
import { formatFcfa } from '../../lib/loyalty';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../ui/Button';
import { FilterPill } from '../ui/Card';
import { TextInput } from '../ui/Field';

/** Onglet Bons : commandes, vente directe, liste des bons, réglages. */
export function BonsAdmin() {
  const [orders, setOrders] = useState<AdminVoucherOrder[] | null>(null);
  const [vouchers, setVouchers] = useState<AdminVoucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdCodes, setCreatedCodes] = useState<string[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [o, v] = await Promise.all([listVoucherOrdersAdmin(), listVouchersAdmin()]);
      setOrders(o);
      setVouchers(v);
      setPendingCount(o.filter((x) => x.status === 'pending').length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!orders || !vouchers) return <p className="text-muted text-sm">Chargement…</p>;

  const pending = orders
    .filter((o) => o.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="border-danger-soft text-danger rounded-tile border px-4 py-3 text-sm font-medium">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="border-success-soft bg-success-soft text-success rounded-tile border px-4 py-3 text-sm font-semibold">
          {notice}
        </p>
      )}

      {createdCodes && (
        <div className="border-success-soft bg-success-soft flex flex-col gap-2 rounded-card border p-4">
          <p className="text-success font-serif text-lg">Paiement confirmé — bons créés</p>
          <ul className="flex flex-wrap gap-2">
            {createdCodes.map((code) => (
              <li key={code} className="rounded-pill bg-white px-3 py-1 font-mono text-sm">
                {code}
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(createdCodes.join('\n'));
            }}
          >
            Copier les codes
          </Button>
        </div>
      )}

      <section className="border-card-border bg-card flex flex-col gap-4 rounded-card border p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-ink font-serif text-xl">
            Commandes en attente de paiement{' '}
            <span className="text-primary-ink text-base">({pendingCount})</span>
          </h2>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Actualiser
          </Button>
        </div>
        {pending.length === 0 ? (
          <p className="text-muted text-sm">Aucune commande en attente.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onDone={async (codes) => {
                  if (codes) setCreatedCodes(codes);
                  await load();
                }}
                setError={setError}
              />
            ))}
          </ul>
        )}
      </section>

      <VoucherListSection vouchers={vouchers} onChanged={load} setError={setError} />
      <DirectSaleSection onDone={load} setError={setError} setNotice={setNotice} />
      <ValiditySection />
    </div>
  );
}

function OrderRow({
  order,
  onDone,
  setError,
}: {
  order: AdminVoucherOrder;
  onDone: (codes: string[] | null) => Promise<void>;
  setError: (message: string | null) => void;
}) {
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(order.items.map((i) => [i.serviceId, String(i.unitPriceFcfa)])),
  );
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const payload = order.items.map((i) => ({
        serviceId: i.serviceId,
        unitPriceFcfa: Number(prices[i.serviceId]?.replace(/[^\d]/g, '') ?? i.unitPriceFcfa),
      }));
      const result = await confirmVoucherOrder(order.id, payload);
      await onDone(result.vouchers.map((v) => v.code));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Confirmation impossible.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Annuler cette commande sans créer de bons ?')) return;
    setBusy(true);
    try {
      await cancelVoucherOrderAdmin(order.id);
      await onDone(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Annulation impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border-card-border bg-card flex flex-col gap-2 rounded-card border p-4">
      <p className="text-ink font-serif text-lg leading-tight">{order.clientName}</p>
      <a href={`tel:${order.clientPhone.replace(/[^\d+]/g, '')}`} className="text-primary-ink text-sm font-medium">
        {order.clientPhone}
      </a>
      <ul className="flex flex-col gap-2">
        {order.items.map((item) => {
          const edited = Number(String(prices[item.serviceId] ?? '').replace(/[^\d]/g, '')) !== item.unitPriceFcfa;
          return (
            <li key={item.id} className="flex flex-wrap items-center gap-2">
              <span className="text-ink text-sm font-medium">
                {item.serviceLabel} × {item.quantity}
              </span>
              <label className="text-muted ml-auto text-xs">
                Prix payé{' '}
                <input
                  inputMode="numeric"
                  aria-label={`Prix payé pour ${item.serviceLabel}`}
                  value={prices[item.serviceId] ?? ''}
                  onChange={(e) =>
                    setPrices((prev) => ({ ...prev, [item.serviceId]: e.target.value }))
                  }
                  className="border-card-border bg-surface text-ink w-24 rounded-pill border px-3 py-1.5 text-right text-sm"
                />{' '}
                F
              </label>
              {edited && (
                <span className="bg-primary-light text-primary-ink rounded-pill px-2.5 py-0.5 text-[0.7rem] font-semibold">
                  Prix modifié
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-muted text-xs">
        {formatDateTime(order.createdAt)} · {formatFcfa(order.totalFcfa)} catalogue
      </p>
      <div className="flex gap-2 pt-1">
        <Button size="sm" disabled={busy} onClick={() => void confirm()}>
          Espèces reçues
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void cancel()} className="text-danger hover:bg-danger-soft">
          Annuler
        </Button>
      </div>
    </li>
  );
}

function VoucherListSection({
  vouchers,
  onChanged,
  setError,
}: {
  vouchers: AdminVoucher[];
  onChanged: () => Promise<void>;
  setError: (message: string | null) => void;
}) {
  const [filter, setFilter] = useState<'active' | 'reserved' | 'used' | 'cancelled' | 'expired' | 'tous'>('tous');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (filter !== 'tous' && v.effectiveStatus !== filter) return false;
      if (!needle) return true;
      return (
        v.code.toLowerCase().includes(needle) ||
        v.ownerName.toLowerCase().includes(needle) ||
        v.ownerPhone.includes(needle.replace(/\D/g, ''))
      );
    });
  }, [vouchers, filter, query]);

  const sold = vouchers.filter((v) => v.status !== 'cancelled');
  const inCirculation = vouchers.filter((v) => v.effectiveStatus === 'active');

  const cancel = async (voucherId: string) => {
    if (!window.confirm('Annuler ce bon ? Les Gouttes de Rosée correspondantes seront retirées.')) return;
    setBusyId(voucherId);
    try {
      await cancelVoucherCode(voucherId);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Annulation impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = ['Code', 'Prestation', 'Acheteuse', 'Téléphone', 'Payé FCFA', 'Statut', 'Expiration', 'Créé le'];
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const labels: Record<AdminVoucher['effectiveStatus'], string> = {
      active: 'Valide',
      reserved: 'Réservé',
      used: 'Utilisé',
      cancelled: 'Annulé',
      expired: 'Expiré',
    };
    const lines = [
      header.map(cell).join(';'),
      ...visible.map((v) =>
        [
          v.code,
          v.serviceLabel,
          v.ownerName,
          v.ownerPhone,
          v.pricePaidFcfa,
          labels[v.effectiveStatus],
          v.expiresAt ? v.expiresAt.slice(0, 10) : '',
          v.createdAt.slice(0, 10),
        ]
          .map(cell)
          .join(';'),
      ),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bons.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ink font-serif text-xl">Bons</h2>

      <div className="border-card-border bg-card flex flex-col gap-2 rounded-card border p-5">
        <p className="text-ink text-sm">
          <strong className="text-primary-ink font-serif text-lg">{sold.length}</strong> bon
          {sold.length > 1 ? 's' : ''} vendu{sold.length > 1 ? 's' : ''} ·{' '}
          <strong className="text-primary-ink">
            {formatFcfa(sold.reduce((s, v) => s + v.pricePaidFcfa, 0))}
          </strong>
        </p>
        <p className="text-ink text-sm">
          <strong className="text-primary-ink font-serif text-lg">{inCirculation.length}</strong> bon
          {inCirculation.length > 1 ? 's' : ''} en circulation ·{' '}
          <strong className="text-primary-ink">
            {formatFcfa(inCirculation.reduce((s, v) => s + v.pricePaidFcfa, 0))}
          </strong>{' '}
          de prestations à honorer
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtre statut des bons">
        {(
          [
            ['tous', 'Tous'],
            ['active', 'Actifs'],
            ['reserved', 'Réservés'],
            ['used', 'Utilisés'],
            ['expired', 'Expirés'],
            ['cancelled', 'Annulés'],
          ] as const
        ).map(([value, text]) => (
          <FilterPill key={value} active={filter === value} onClick={() => setFilter(value)}>
            {text}
          </FilterPill>
        ))}
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          CSV
        </Button>
      </div>

      <TextInput placeholder="Rechercher par code, nom ou téléphone…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {visible.length === 0 ? (
        <p className="text-muted text-sm">Aucun bon pour ce filtre.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((v) => (
            <li key={v.id} className="border-card-border bg-card flex flex-col gap-1 rounded-tile border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-ink font-mono text-sm tracking-wide">{v.code}</p>
                <span className="rounded-pill bg-primary-light px-3 py-1 text-[0.7rem] font-semibold text-primary-ink">
                  {({ active: 'Valide', reserved: 'Réservé', used: 'Utilisé', cancelled: 'Annulé', expired: 'Expiré' } as const)[v.effectiveStatus]}
                </span>
              </div>
              <p className="text-ink text-sm font-medium">
                {v.serviceLabel} · {v.ownerName} · {v.ownerPhone}
              </p>
              <p className="text-muted text-xs">
                {formatFcfa(v.pricePaidFcfa)} · {v.expiresAt ? `expire le ${v.expiresAt.slice(0, 10)}` : 'sans expiration'}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void navigator.clipboard.writeText(v.code)}
                >
                  Copier le code
                </Button>
                {v.status === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === v.id}
                    onClick={() => void cancel(v.id)}
                    className="text-danger hover:bg-danger-soft"
                  >
                    Annuler le bon
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DirectSaleSection({
  onDone,
  setError,
  setNotice,
}: {
  onDone: () => Promise<void>;
  setError: (message: string | null) => void;
  setNotice: (message: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [client, setClient] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [createFirst, setCreateFirst] = useState('');
  const [createLast, setCreateLast] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [lines, setLines] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [services, setServices] = useState<PublicService[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listPublicServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      searchClients(query).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const sellableLines = Object.entries(lines).filter(([, q]) => q > 0);

  const quickCreate = async () => {
    setBusy(true);
    try {
      const created = await createClientAccount({
        firstName: createFirst.trim(),
        lastName: createLast.trim(),
        phone: createPhone.trim(),
      });
      setClient({ id: created.id, name: `${createFirst} ${createLast}`, phone: createPhone });
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  };

  const sell = async () => {
    if (!client || sellableLines.length === 0) return;
    setBusy(true);
    try {
      const result = await directSale({
        clientId: client.id,
        lines: sellableLines.map(([serviceId, quantity]) => ({ serviceId, quantity })),
        prices: sellableLines.map(([serviceId]) => {
          const catalog = services.find((s) => s.id === serviceId)?.priceFcfa ?? 0;
          return {
            serviceId,
            unitPriceFcfa: Number(prices[serviceId]?.replace(/[^\d]/g, '') ?? catalog),
          };
        }),
      });
      setNotice(`Vente confirmée : ${result.vouchers.map((v) => v.code).join(', ')}`);
      setLines({});
      setPrices({});
      setClient(null);
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Vente impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Vendre un bon
      </Button>
    );
  }

  return (
    <section className="border-primary-light bg-surface flex flex-col gap-4 rounded-card border p-6 shadow-card">
      <h2 className="text-ink font-serif text-xl">Vendre un bon</h2>

      {!client ? (
        <>
          <TextInput placeholder="Rechercher une cliente (nom ou téléphone)…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="flex flex-col gap-1">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setClient(r)}
                  className="text-primary-ink w-full text-left text-sm font-medium underline decoration-primary-glow underline-offset-4"
                >
                  {r.name} — {r.phone}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-muted text-xs">Ou création rapide :</p>
          <div className="flex flex-wrap gap-2">
            <TextInput placeholder="Prénom" value={createFirst} onChange={(e) => setCreateFirst(e.target.value)} />
            <TextInput placeholder="Nom" value={createLast} onChange={(e) => setCreateLast(e.target.value)} />
            <TextInput placeholder="Téléphone" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} />
            <Button size="sm" variant="secondary" onClick={() => void quickCreate()} disabled={busy || !createFirst || !createLast || !createPhone}>
              Créer
            </Button>
          </div>
        </>
      ) : (
        <p className="text-ink text-sm font-semibold">
          Cliente : {client.name} — {client.phone}{' '}
          <button type="button" onClick={() => setClient(null)} className="text-muted underline">
            changer
          </button>
        </p>
      )}

      <div className="flex flex-col gap-3">
        {SERVICE_CATEGORIES.map((category) => (
          <div key={category.id} className="flex flex-col gap-1.5">
            <h3 className="text-ink font-serif text-sm font-semibold">{category.label}</h3>
            {services
              .filter((s) => s.categoryId === category.id && s.priceFcfa > 0)
              .map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="text-ink flex-1">
                    {s.label} <span className="text-muted">({formatFcfa(s.priceFcfa)}{s.pieces && s.pieces > 1 ? ` / pack de ${s.pieces}` : ''})</span>
                  </span>
                  <input
                    inputMode="numeric"
                    aria-label={`Quantité ${s.label}`}
                    placeholder="Prix payé"
                    value={prices[s.id] ?? ''}
                    onChange={(e) => setPrices((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    className="border-card-border bg-surface w-24 rounded-pill border px-3 py-1 text-right text-xs"
                  />
                  <input
                    inputMode="numeric"
                    aria-label={`Quantité ${s.label}`}
                    placeholder="Qté"
                    value={lines[s.id] ? String(lines[s.id]) : ''}
                    onChange={(e) =>
                      setLines((prev) => ({
                        ...prev,
                        [s.id]: Math.min(10, Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0)),
                      }))
                    }
                    className="border-card-border bg-surface w-16 rounded-pill border px-3 py-1 text-center text-xs"
                  />
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button disabled={busy || !client || sellableLines.length === 0} onClick={() => void sell()}>
          Vendre et créditer
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Fermer
        </Button>
      </div>
    </section>
  );
}

function ValiditySection() {
  const [months, setMonths] = useState<string>('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getVoucherSettings()
      .then((s) => setMonths(String(s.voucherValidityMonths)))
      .catch(() => setMonths('6'));
  }, []);

  const save = async () => {
    const value = Number(months.replace(/[^\d]/g, ''));
    await setVoucherValidityMonths(value);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="border-card-border bg-card flex flex-col gap-3 rounded-card border p-5">
      <h2 className="text-ink font-serif text-xl">Validité des bons</h2>
      <p className="text-muted text-sm">
        Durée en mois à partir de l’achat (0 = sans expiration). Défaut : 6.
      </p>
      <div className="flex items-center gap-2">
        <TextInput
          inputMode="numeric"
          aria-label="Validité en mois"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="max-w-32"
        />
        <Button size="sm" variant="secondary" onClick={() => void save()}>
          {saved ? 'Enregistré' : 'Enregistrer'}
        </Button>
      </div>
    </section>
  );
}
