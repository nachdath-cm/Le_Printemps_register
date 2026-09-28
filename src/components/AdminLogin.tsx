import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { login, tokenStorage } from '../lib/api';
import { PIN_LENGTH } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';
import { Logo } from '../components/Logo';

/** Touche « retour » du pave numerique — pictogramme standard des claviers. */
function BackspaceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9L2.5 12z" />
      <path d="M12 9.5l4.5 5M16.5 9.5l-4.5 5" />
    </svg>
  );
}

export interface AdminLoginProps {
  onSuccess: () => void;
}

/** Clavier numerique : l'employee tape son PIN sur la tablette. */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(value: string) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(value);
      tokenStorage().set(token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code incorrect.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function press(key: (typeof KEYS)[number]) {
    if (loading) return;
    if (error) setError(null);
    if (key === 'clear') return setPin('');
    if (key === 'back') return setPin((p) => p.slice(0, -1));
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    // Le code fait quatre chiffres : on valide des que c'est complet.
    if (next.length === PIN_LENGTH) void submit(next);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(pin);
  }

  return (
    <div className="bg-cream flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="animate-fade-up flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={64} />
          <h1 className="text-ink font-serif text-2xl">Espace employé</h1>
          <p className="text-muted text-sm">Saisissez votre code pour ouvrir le registre.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-surface border-primary-light flex w-full flex-col items-center gap-5 rounded-card border p-6 shadow-card"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="text-primary-ink flex items-center gap-2">
              <KeyRound className="size-4" aria-hidden="true" />
              <span className="text-muted text-xs font-medium tracking-[0.18em] uppercase">
                Code d’accès
              </span>
            </div>

            <div className="flex gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`size-3.5 rounded-full transition-colors ${
                    i < pin.length ? 'bg-primary-strong' : 'bg-card-border'
                  }`}
                />
              ))}
            </div>

            <span className="sr-only" aria-live="polite">
              {error ?? `${pin.length} chiffres saisis`}
            </span>
          </div>

          <Field label="Code" error={error ?? undefined} className="sr-only">
            {(p) => (
              <TextInput
                {...p}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
                className="sr-only"
                tabIndex={-1}
                autoFocus
              />
            )}
          </Field>

          <div className="grid w-full grid-cols-3 gap-2.5">
            {KEYS.map((key) => {
              if (key === 'clear') {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press('clear')}
                    className="text-muted hover:bg-primary-light hover:text-primary-ink cursor-pointer rounded-tile py-3.5 font-sans text-sm font-medium transition-colors"
                  >
                    Effacer
                  </button>
                );
              }
              if (key === 'back') {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press('back')}
                    aria-label="Effacer le dernier chiffre"
                    className="text-muted hover:bg-primary-light hover:text-primary-ink flex cursor-pointer items-center justify-center rounded-tile py-3.5 transition-colors"
                  >
                    <BackspaceIcon className="size-5" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  disabled={loading}
                  className="border-card-border text-ink hover:border-primary hover:bg-primary-light hover:text-primary-ink cursor-pointer rounded-tile border py-3.5 font-sans text-lg font-medium transition-colors disabled:opacity-50"
                >
                  {key}
                </button>
              );
            })}
          </div>

          <Button type="submit" fullWidth loading={loading} className="sr-only">
            Valider le code
          </Button>
        </form>
      </div>
    </div>
  );
}
