import { Check, Sparkles } from 'lucide-react';

import {
  OTHER_SERVICE_ID,
  SERVICE_CATEGORIES,
  servicesByCategory,
} from '../config/services';
import { cn } from '../lib/utils';
import { listPublicServices } from '../lib/api';
import { useEffect, useState } from 'react';

export interface ServicePickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
  otherError?: string;
  idPrefix?: string;
  disabled?: boolean;
}

/**
 * Multi-selection de prestations.
 *
 * Volontairement des <button role="checkbox"> et non un <select multiple> :
 * un select natif est inexploitable au doigt sur telephone, et l'interface
 * exige des pastilles cliquables groupees par categorie.
 */
export function ServicePicker({
  selected,
  onChange,
  otherValue,
  onOtherChange,
  otherError,
  idPrefix = 'svc',
  disabled = false,
}: ServicePickerProps) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    listPublicServices()
      .then((list) => setPrices(Object.fromEntries(list.map((s) => [s.id, s.priceFcfa]))))
      .catch(() => setPrices({}));
  }, []);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  };

  return (
    <div className="flex flex-col gap-7">
      {SERVICE_CATEGORIES.map((category) => {
        const services = servicesByCategory(category.id);
        if (services.length === 0) return null;

        return (
          <fieldset key={category.id} disabled={disabled}>
            <legend className="mb-1 flex items-center gap-2">
              <span className="text-ink font-serif text-lg font-semibold">{category.label}</span>
            </legend>
            <p className="text-muted mb-3 text-xs">{category.hint}</p>

            <div className="flex flex-wrap gap-2.5">
              {services.map((service) => (
                <Pastille
                  key={service.id}
                  id={`${idPrefix}-${service.id}`}
                  label={service.label}
                  price={prices[service.id] ?? null}
                  checked={selected.includes(service.id)}
                  onToggle={() => toggle(service.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          </fieldset>
        );
      })}

      {/* --- Option « Autre » ------------------------------------------- */}
      <fieldset disabled={disabled}>
        <legend className="text-ink mb-1 font-serif text-lg font-semibold">Autre</legend>
        <p className="text-muted mb-3 text-xs">Une autre demande ? Décrivez-la en quelques mots.</p>

        <Pastille
          id={`${idPrefix}-${OTHER_SERVICE_ID}`}
          label="Autre"
          icon={<Sparkles className="size-3.5" aria-hidden="true" />}
          checked={selected.includes(OTHER_SERVICE_ID)}
          onToggle={() => toggle(OTHER_SERVICE_ID)}
          disabled={disabled}
        />

        {selected.includes(OTHER_SERVICE_ID) && (
          <div className="animate-fade-up mt-3 flex flex-col gap-1.5" data-field="other">
            <label
              htmlFor={`${idPrefix}-other`}
              className="text-muted text-xs font-medium"
            >
              Précisez votre besoin
            </label>
            <input
              id={`${idPrefix}-other`}
              type="text"
              value={otherValue}
              disabled={disabled}
              maxLength={300}
              autoComplete="off"
              placeholder="Ex. : soin spécial, modelage, hammam…"
              aria-invalid={Boolean(otherError) || undefined}
              aria-describedby={otherError ? `${idPrefix}-other-error` : undefined}
              onChange={(event) => onOtherChange(event.target.value)}
              className={cn(
                'w-full rounded-2xl border bg-surface px-4 py-3 text-ink font-sans text-base',
                'placeholder:text-muted focus:outline-none',
                'focus-visible:border-primary-ink focus-visible:ring-2 focus-visible:ring-primary-glow',
                otherError ? 'border-danger' : 'border-card-border',
              )}
            />
            {otherError && (
              <p id={`${idPrefix}-other-error`} role="alert" className="text-danger text-xs font-medium">
                {otherError}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}

interface PastilleProps {
  id: string;
  label: string;
  price?: number | null;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function Pastille({ id, label, price, checked, onToggle, disabled, icon }: PastilleProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-pill border px-4 py-2.5',
        'font-sans text-sm font-medium transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-55',
        checked
          ? 'border-primary-strong bg-primary-strong text-white shadow-brand'
          : 'border-card-border bg-surface text-muted hover:border-primary hover:text-primary-ink hover:bg-primary-light',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-4 items-center justify-center rounded-full border transition-colors',
          checked ? 'border-white bg-white' : 'border-muted/45 bg-transparent',
        )}
      >
        {checked && (
          <Check className="text-primary-strong size-3" strokeWidth={3.5} aria-hidden="true" />
        )}
      </span>
      {icon}
      {label}
      {price != null && price > 0 && (
        <span className={cn('text-[0.7rem] font-semibold', checked ? 'text-white/85' : 'text-muted')}>
          {price.toLocaleString('fr-FR')} F
        </span>
      )}
    </button>
  );
}
