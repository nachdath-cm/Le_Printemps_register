import { Copy, Download, MessageCircle, Power, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ApiError,
  convertProspect,
  createProspectLink,
  deleteProspect,
  listProspectLinks,
  listProspects,
  setProspectLinkActive,
  type ProspectLinkRow,
  type ProspectRow,
} from '../../lib/api';
import { CLIENT_STATUS_LABELS } from '../../config/client-status';
import { serviceLabel } from '../../config/services';
import { Button } from '../ui/Button';
import { FilterPill } from '../ui/Card';
import { TextInput } from '../ui/Field';
import { formatDateTime } from '../../lib/utils';

/** Onglet Prospects : liens, liste, relance, conversion. */
export function ProspectsAdmin() {
  const [links, setLinks] = useState<ProspectLinkRow[] | null>(null);
  const [prospects, setProspects] = useState<ProspectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'prospect' | 'client' | 'tous'>('prospect');
  const [source, setSource] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    try {
      const [l, p] = await Promise.all([listProspectLinks(), listProspects()]);
      setLinks(l);
      setProspects(p);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setBusy(true);
    try {
      await createProspectLink('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  }

  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          (prospects ?? [])
            .map((p) => p.source)
            .filter((s): s is string => Boolean(s)),
        ),
      ),
    [prospects],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (prospects ?? []).filter((p) => {
      if (view === 'prospect' && p.status !== 'prospect') return false;
      if (view === 'client' && p.status !== 'client') return false;
      if (source && p.source !== source) return false;
      if (from && p.createdAt.slice(0, 10) < from) return false;
      if (to && p.createdAt.slice(0, 10) > to) return false;
      if (!needle) return true;
      return (
        p.firstName.toLowerCase().includes(needle) ||
        p.lastName.toLowerCase().includes(needle) ||
        p.phone.toLowerCase().includes(needle)
      );
    });
  }, [prospects, view, source, query, from, to]);

  const bySource = useMemo(() => {
    const map = new Map<string, { prospects: number; converted: number }>();
    for (const p of prospects ?? []) {
      const key = p.source ?? '—';
      const entry = map.get(key) ?? { prospects: 0, converted: 0 };
      entry.prospects += 1;
      if (p.convertedAt) entry.converted += 1;
      map.set(key, entry);
    }
    return Array.from(map, ([sourceLabel, counts]) => ({ sourceLabel, ...counts }));
  }, [prospects]);

  if (!links || !prospects) return <p className="text-muted text-sm">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="border-danger-soft text-danger rounded-tile border px-4 py-3 text-sm font-medium"
        >
          {error}
        </p>
      )}

      <section className="border-card-border bg-card flex flex-col gap-4 rounded-card border p-5">
        <h2 className="text-ink font-serif text-xl">Générer un lien</h2>
        <div>
          <Button onClick={() => void generate()} loading={busy}>
            Générer un lien
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onToggle={() => {
                setProspectLinkActive(link.id, !link.active)
                  .then(() => load())
                  .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
              }}
            />
          ))}
          {links.length === 0 && (
            <p className="text-muted text-sm">Aucun lien pour le moment.</p>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ink font-serif text-xl">Prospects et converties</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-primary-light/50 flex gap-1.5 rounded-pill p-1.5" role="group" aria-label="Filtre statut">
            {(
              [
                ['prospect', 'Prospects'],
                ['client', 'Converties'],
                ['tous', 'Tous'],
              ] as const
            ).map(([value, text]) => (
              <FilterPill key={value} active={view === value} onClick={() => setView(value)}>
                {text}
              </FilterPill>
            ))}
          </div>
          <select
            aria-label="Filtrer par source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border-card-border bg-surface text-ink rounded-pill border px-3 py-2 text-sm"
          >
            <option value="">Toutes sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Du"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border-card-border bg-surface text-ink rounded-pill border px-3 py-2 text-sm"
          />
          <input
            type="date"
            aria-label="Au"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border-card-border bg-surface text-ink rounded-pill border px-3 py-2 text-sm"
          />
        </div>
        <TextInput
          placeholder="Rechercher par nom ou téléphone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {visible.length === 0 ? (
          <p className="text-muted text-sm">Aucun prospect pour ce filtre.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((p) => (
              <ProspectLine key={p.id} prospect={p} onChanged={load} setError={setError} />
            ))}
          </ul>
        )}
      </section>

      <section className="border-card-border bg-card flex flex-col gap-3 rounded-card border p-5">
        <h2 className="text-ink font-serif text-xl">Par source</h2>
        {bySource.length === 0 ? (
          <p className="text-muted text-sm">Pas encore de données.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bySource.map((row) => (
              <li
                key={row.sourceLabel}
                className="border-card-border flex flex-wrap items-baseline justify-between gap-2 rounded-tile border px-4 py-3 text-sm"
              >
                <span className="text-ink font-semibold">{row.sourceLabel}</span>
                <span className="text-muted">
                  {row.prospects} prospect{row.prospects > 1 ? 's' : ''} · {row.converted} convertie
                  {row.converted > 1 ? 's' : ''} ·{' '}
                  {row.prospects > 0 ? Math.round((row.converted / row.prospects) * 100) : 0} %
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LinkRow({
  link,
  onToggle,
}: {
  link: ProspectLinkRow;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/p/${link.token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Bonjour ! Voici le lien pour découvrir Le Printemps : ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const urlBlob = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(urlBlob);
      const a = document.createElement('a');
      a.download = `qr-${link.label.replace(/\s+/g, '-')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = urlBlob;
  };

  return (
    <li className="border-card-border flex flex-col gap-3 rounded-tile border p-4 sm:flex-row sm:items-center">
      <div ref={qrRef} className="border-primary-light rounded-tile shrink-0 border bg-white p-2">
        <QRCodeSVG value={url} size={96} level="M" fgColor="#2d1f1d" bgColor="#ffffff" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-ink font-serif text-lg leading-tight">{link.label}</p>
        <p className="text-muted truncate text-xs">{url}</p>
        <p className="text-muted text-xs">
          {link.prospectCount} prospect{link.prospectCount > 1 ? 's' : ''} · {link.active ? 'actif' : 'désactivé'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copy()} icon={<Copy className="size-4" />}>
          {copied ? 'Copié' : 'Copier'}
        </Button>
        <Button size="sm" variant="secondary" onClick={shareWhatsApp} icon={<MessageCircle className="size-4" />}>
          WhatsApp
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadQr} icon={<Download className="size-4" />}>
          QR PNG
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggle} icon={<Power className="size-4" />}>
          {link.active ? 'Désactiver' : 'Activer'}
        </Button>
      </div>
    </li>
  );
}

function ProspectLine({
  prospect,
  onChanged,
  setError,
}: {
  prospect: ProspectRow;
  onChanged: () => void;
  setError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  const convert = async () => {
    setBusy(true);
    try {
      await convertProspect(prospect.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Conversion impossible.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer ${prospect.firstName} ${prospect.lastName} ?`)) return;
    setBusy(true);
    try {
      await deleteProspect(prospect.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border-card-border bg-card flex flex-col gap-2 rounded-card border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink font-serif text-lg leading-tight">
          {prospect.firstName} {prospect.lastName}
        </p>
        <span
          className={`rounded-pill px-2.5 py-1 font-sans text-[0.7rem] font-semibold ${
            prospect.status === 'prospect' ? 'bg-primary-light text-primary-ink' : 'bg-success-soft text-success'
          }`}
        >
          {CLIENT_STATUS_LABELS[prospect.status]}
        </span>
      </div>
      <a
        href={`tel:${prospect.phone.replace(/[^\d+]/g, '')}`}
        className="text-primary-ink font-sans text-sm font-medium"
      >
        {prospect.phone}
      </a>
      <p className="text-muted text-sm">
        {prospect.interestServiceId ? serviceLabel(prospect.interestServiceId) : 'Prestation non précisée'} ·{' '}
        {prospect.source ?? 'Source inconnue'} · {formatDateTime(prospect.createdAt)}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={`https://wa.me/229${prospect.phone.replace(/\D/g, '').replace(/^229/, '')}?text=${encodeURIComponent(
            `Bonjour ${prospect.firstName}, c'est Le Printemps. Nous vous recontactons au sujet de votre prochaine visite.`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="border-primary text-primary-ink inline-flex items-center gap-2 rounded-pill border px-5 py-2 text-sm font-medium"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Relancer sur WhatsApp
        </a>
        {prospect.status === 'prospect' && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void convert()}>
            Passer en cliente
          </Button>
        )}
        {prospect.status === 'prospect' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void remove()}
            className="text-danger hover:bg-danger-soft"
            icon={<Trash2 className="size-4" />}
          >
            Supprimer
          </Button>
        )}
      </div>
    </li>
  );
}
