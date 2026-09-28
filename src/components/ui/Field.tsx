import { AlertCircle } from 'lucide-react';
import { useId } from 'react';

import { cn } from '../../lib/utils';

export interface FieldRenderProps {
  id: string;
  /** Cle directement etirable sur l'element (`aria-describedby`). */
  'aria-describedby': string | undefined;
  /** Pilote l'etat visuel rouge du champ. */
  invalid: boolean;
}

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Repere pour jumped directement au premier champ en erreur. */
  fieldName?: string;
  children: (props: FieldRenderProps) => React.ReactNode;
}

/**
 * Champ de formulaire generique : label, aide, message d'erreur et
 * association aria-describedby / aria-invalid.
 */
export function Field({ label, error, hint, className, fieldName, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)} data-field={fieldName}>
      <label htmlFor={id} className="text-ink font-sans text-sm font-semibold">
        {label}
      </label>

      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-muted text-xs">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-danger flex items-center gap-1.5 text-xs font-medium"
          role="alert"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const INPUT_BASE = cn(
  'w-full rounded-2xl border bg-surface px-4 py-3.5 text-ink font-sans text-base',
  'placeholder:text-muted transition-colors duration-200',
  'focus:outline-none focus-visible:border-primary-ink focus-visible:ring-2 focus-visible:ring-primary-glow',
  // 16px minimum : en dessous, iOS Safari zoome automatiquement au focus.
  'disabled:cursor-not-allowed disabled:bg-cream',
);

/** Champ texte : prenom, nom, telephone, precision « Autre », note. */
export function TextInput({
  invalid = false,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  invalid?: boolean;
}) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        INPUT_BASE,
        invalid ? 'border-danger' : 'border-card-border',
        className,
      )}
      {...rest}
    />
  );
}

/** Zone de texte : note de l'employee, besoin detaille. */
export function TextArea({
  invalid = false,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        INPUT_BASE,
        'min-h-24 resize-y',
        invalid ? 'border-danger' : 'border-card-border',
        className,
      )}
      {...rest}
    />
  );
}
