import { ArrowRight, Heart } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';

import { INSTITUTE } from '../config/institute';
import { ApiError, createRegistration } from '../lib/api';
import {
  EMPTY_FORM,
  toPayload,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationFormValues,
} from '../lib/validation';
import { Logo } from './Logo';
import { ServicePicker } from './ServicePicker';
import { Button } from './ui/Button';
import { Field, TextArea, TextInput } from './ui/Field';
import { Modal } from './ui/Modal';

const TITLE_ID = 'client-register-title';

/** Ordre de parcours : le focus suit l'ordre visuel du formulaire. */
const FIELD_ORDER = ['firstName', 'lastName', 'phone', 'services', 'other', 'note'] as const;

export interface ClientRegisterModalProps {
  /** La modale est pilotee par le parent : ouverte a l'arrivee sur /client. */
  open: boolean;
  onClose: () => void;
}

/**
 * Formulaire client — « Bienvue au Printemps ».
 *
 * Deux etats : le formulaire, puis un message de remerciement anime.
 * La modale reste ouverte sur l'ecran de remerciement, puis se ferme
 * d'elle-meme au bout de quelques secondes.
 */
export function ClientRegisterModal({ open, onClose }: ClientRegisterModalProps) {
  const [values, setValues] = useState<RegistrationFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  /**
   * Ferme la modale et repart d'un formulaire vierge : l'employée peut ainsi
   * enchaîner les clients, et une saisie avortée ne réapparaît pas.
   */
  const finish = useCallback(() => {
    setValues(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setSubmitting(false);
    setDone(false);
    onClose();
  }, [onClose]);

  // Ferme seule quand l'appel a reussi : une erreur ne doit pas perdre la saisie.
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(finish, 9000);
    return () => window.clearTimeout(timer);
  }, [done, finish]);

  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  const set = <K extends keyof RegistrationFormValues>(key: K, value: RegistrationFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const close = () => {
    // Pendant l'envoi, fermer ferait perdre la saisie en cours.
    if (submitting) return;
    finish();
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    const found = validateRegistration(values);
    setErrors(found);

    // Les attributs aria-invalid n'existent qu'apres le rendu suivant : on
    // demande donc le focus pour l'instant following, une fois React a commit.
    const [firstError] = FIELD_ORDER.filter((name) => found[name]);
    if (firstError) {
      setFocusField(firstError);
      return;
    }

    setSubmitting(true);
    try {
      await createRegistration(toPayload(values));
      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Une erreur inattendue s'est produite. Réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Amene le focus sur le premier champ en erreur, apres le rendu.
  useEffect(() => {
    if (!focusField) return;

    if (focusField === 'services') {
      // Aucun champ texte : on cible la premiere pastille du formulaire.
      document.querySelector<HTMLElement>('[role="checkbox"]')?.focus();
    } else {
      const input = document.querySelector<HTMLElement>(
        `[data-field="${focusField}"] :is(input, textarea)`,
      );
      input?.focus();
      input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    setFocusField(null);
  }, [focusField]);

  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy={TITLE_ID}
      dismissible={!submitting && !done}
      className="sm:max-w-xl"
    >
      {done ? (
        <SuccessPanel panelRef={successRef} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col">
          <header className="border-primary-light flex flex-col items-center gap-3 border-b px-6 pt-8 pb-6 text-center">
            <Logo size={56} />
            <h1 id={TITLE_ID} className="text-ink font-serif text-2xl leading-tight sm:text-[1.75rem]">
              Bienvenue au <span className="text-primary-ink">Printemps</span>
            </h1>
            <p className="text-muted max-w-sm text-sm">
              Indiquez-nous vos prénom, nom et vos prestations. Notre équipe vous accueille à{' '}
              {INSTITUTE.location}.
            </p>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" error={errors.firstName} fieldName="firstName">
                {(p) => (
                  <TextInput
                    {...p}
                    value={values.firstName}
                    autoComplete="given-name"
                    enterKeyHint="next"
                    placeholder="Aïcha"
                    invalid={p.invalid}
                    disabled={submitting}
                    onChange={(e) => set('firstName', e.target.value)}
                  />
                )}
              </Field>

              <Field label="Nom" error={errors.lastName} fieldName="lastName">
                {(p) => (
                  <TextInput
                    {...p}
                    value={values.lastName}
                    autoComplete="family-name"
                    enterKeyHint="next"
                    placeholder="Kponou"
                    invalid={p.invalid}
                    disabled={submitting}
                    onChange={(e) => set('lastName', e.target.value)}
                  />
                )}
              </Field>
            </div>

            <Field
              label="Téléphone"
              error={errors.phone}
              hint="Pour vous rappeler si besoin."
              fieldName="phone"
            >
              {(p) => (
                <TextInput
                  {...p}
                  type="tel"
                  inputMode="tel"
                  value={values.phone}
                  autoComplete="tel"
                  enterKeyHint="done"
                  placeholder="01 23 45 67 89"
                  invalid={p.invalid}
                  disabled={submitting}
                  onChange={(e) => set('phone', e.target.value)}
                />
              )}
            </Field>

            <div className="border-primary-light border-t pt-6" data-field="services">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-ink font-serif text-lg font-semibold">Vos prestations</h2>
                <span className="text-muted text-xs">Plusieurs choix possibles</span>
              </div>

              <ServicePicker
                selected={values.services}
                onChange={(services) => set('services', services)}
                otherValue={values.other}
                onOtherChange={(other) => set('other', other)}
                otherError={errors.other}
                disabled={submitting}
              />

              {errors.services && (
                <p role="alert" className="text-danger mt-3 text-xs font-medium">
                  {errors.services}
                </p>
              )}
            </div>

            <Field label="Une précision ? (facultatif)" fieldName="note">
              {(p) => (
                <TextArea
                  {...p}
                  value={values.note}
                  maxLength={300}
                  rows={3}
                  placeholder="Allergie, moment souhaité, indication particulière…"
                  disabled={submitting}
                  onChange={(e) => set('note', e.target.value)}
                />
              )}
            </Field>

            {formError && (
              <p
                role="alert"
                className="border-danger-soft text-danger rounded-2xl border px-4 py-3 text-sm font-medium"
              >
                {formError}
              </p>
            )}
          </div>

          <footer className="border-primary-light bg-cream/60 flex flex-col gap-3 border-t px-6 py-5">
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              icon={<ArrowRight className="size-4" aria-hidden="true" />}
            >
              Valider
            </Button>
            <p className="text-muted text-center text-xs">
              Vos informations restent au registre de l’institut.
            </p>
          </footer>
        </form>
      )}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Ecran de remerciement                                                       */
/* -------------------------------------------------------------------------- */

function SuccessPanel({ panelRef }: { panelRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="flex flex-col items-center gap-5 px-6 py-12 text-center outline-none"
    >
      <span className="bg-success-soft text-success animate-check flex size-20 items-center justify-center rounded-full">
        <svg viewBox="0 0 24 24" fill="none" className="size-10" aria-hidden="true">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <div className="flex flex-col gap-2">
        <h2 className="text-ink font-serif text-2xl leading-tight sm:text-[1.75rem]">
          Merci <span className="text-primary-ink">!</span>
        </h2>
        <p className="text-muted max-w-sm text-sm">
          Votre inscription a bien été enregistrée. L’équipe du Printemps vous accueille à{' '}
          {INSTITUTE.location} et vous rappelle au{' '}
          <a
            href={`tel:${INSTITUTE.phone.replace(/\s/g, '')}`}
            className="text-primary-ink font-semibold underline decoration-primary-glow underline-offset-4"
          >
            {INSTITUTE.phoneDisplay}
          </a>
          .
        </p>
      </div>

      <p className="text-muted animate-fade-up flex items-center gap-2 text-sm">
        <Heart className="text-primary-ink size-4" aria-hidden="true" />
        Cette page se ferme toute seule dans quelques instants.
      </p>
    </div>
  );
}
