import { Check, Pencil } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { listPublicServices, setServicePrice, type PublicService } from '../../lib/api';
import { SERVICE_CATEGORIES } from '../../config/services';

/** Onglet Prestations : prix FCFA editable par prestation. */
export function ServicesAdmin() {
  const [services, setServices] = useState<PublicService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setServices(await listPublicServices());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(id: string, priceFcfa: number) {
    try {
      const updated = await setServicePrice(id, priceFcfa);
      setServices((prev) =>
        prev ? prev.map((s) => (s.id === id ? { ...s, priceFcfa: updated.priceFcfa } : s)) : prev,
      );
      setSavedId(id);
      window.setTimeout(() => setSavedId(null), 2000);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  }

  if (!services) return <p className="text-muted text-sm">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="border-danger-soft text-danger rounded-tile border px-4 py-3 text-sm font-medium">
          {error}
        </p>
      )}
      {SERVICE_CATEGORIES.map((category) => (
        <section key={category.id} className="flex flex-col gap-2">
          <h2 className="text-ink font-serif text-lg">{category.label}</h2>
          <ul className="border-card-border divide-card-border divide-y rounded-card border bg-card">
            {services
              .filter((s) => s.categoryId === category.id)
              .map((service) => (
                <PriceRow
                  key={service.id}
                  service={service}
                  saved={savedId === service.id}
                  onSave={(price) => void save(service.id, price)}
                />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PriceRow({
  service,
  saved,
  onSave,
}: {
  service: PublicService;
  saved: boolean;
  onSave: (price: number) => void;
}) {
  const [value, setValue] = useState(String(service.priceFcfa));

  useEffect(() => setValue(String(service.priceFcfa)), [service.priceFcfa]);

  const commit = () => {
    const parsed = Number(value.replace(/[^\d]/g, ''));
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== service.priceFcfa) {
      onSave(parsed);
    } else {
      setValue(String(service.priceFcfa));
    }
  };

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-ink font-sans text-sm">{service.label}</span>
      <span className="flex items-center gap-2">
        <input
          aria-label={`Prix de ${service.label}`}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="border-card-border bg-surface text-ink focus-visible:border-primary-ink w-28 rounded-pill border px-4 py-1.5 text-right font-sans text-sm focus:outline-none"
        />
        <span className="text-muted text-xs">FCFA</span>
        {saved ? (
          <Check className="text-success size-4" aria-label="Enregistré" />
        ) : (
          <Pencil className="text-muted size-4" aria-hidden="true" />
        )}
      </span>
    </li>
  );
}
