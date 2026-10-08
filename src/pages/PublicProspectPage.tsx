import { MessageCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import { INSTITUTE } from '../config/institute';
import { SERVICE_CATEGORIES, servicesByCategory } from '../config/services';
import { ApiError, listPublicServices, submitProspectLink } from '../lib/api';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';

/** Page publique /p/:token — devenir prospect. */
export function PublicProspectPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    fetch(`/api/public/prospect-link/${encodeURIComponent(token)}`)
      .then((r) => setState(r.ok ? 'ok' : 'invalid'))
      .catch(() => setState('invalid'));
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="bg-cream flex min-h-dvh items-center justify-center text-muted text-sm">
        Chargement…
      </div>
    );
  }

  if (state === 'invalid' || !token) {
    return (
      <div className="bg-cream flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={64} />
        <p className="eyebrow">{INSTITUTE.name}</p>
        <h1 className="text-ink font-serif text-2xl">Lien indisponible</h1>
        <p className="text-muted max-w-sm text-sm">
          Ce lien n’est plus valide. Rapprochez-vous de l’équipe du Printemps pour que nous vous
          envoyions le bon lien.
        </p>
      </div>
    );
  }

  return <ProspectForm token={token} />;
}

function ProspectForm({ token }: { token: string }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [interestServiceId, setInterestServiceId] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [prices, setPrices] = useState<Set<string> | null>(null);

  useEffect(() => {
    // On ne propose que les prestations au catalogue.
    listPublicServices()
      .then((list) => setPrices(new Set(list.map((s) => s.id))))
      .catch(() => setPrices(new Set()));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) {
      setError('Vous devez accepter d’être recontactée(e) pour continuer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitProspectLink(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        interestServiceId: interestServiceId || null,
        consent: true,
        website,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="bg-cream flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={64} />
        <p className="eyebrow">{INSTITUTE.name}</p>
        <h1 className="text-ink font-serif text-2xl">Merci !</h1>
        <p className="text-muted max-w-sm text-sm">
          Nous avons bien reçu vos informations. L’équipe du Printemps vous recontacte très vite.
        </p>
        <a
          href={`https://wa.me/${INSTITUTE.whatsapp}?text=${encodeURIComponent('Bonjour, je viens de remplir le formulaire du Printemps.')}`}
          target="_blank"
          rel="noreferrer"
          className="text-whatsapp-hover inline-flex items-center gap-2 font-sans text-sm font-semibold"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Nous écrire sur WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="bg-cream flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <form
        onSubmit={submit}
        className="bg-surface border-primary-light flex w-full max-w-sm flex-col gap-5 rounded-card border p-6 shadow-card"
      >
        <header className="flex flex-col items-center gap-3 text-center">
          <Logo size={64} />
          <p className="eyebrow">{INSTITUTE.name}</p>
          <h1 className="text-ink font-serif text-2xl">Votre première visite</h1>
          <p className="text-muted text-sm">
            Laissez-nous vos coordonnées pour vous recontactez.
          </p>
        </header>

        <Field label="Prénom">
          {(p) => (
            <TextInput {...p} value={firstName} required autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} />
          )}
        </Field>
        <Field label="Nom">
          {(p) => (
            <TextInput {...p} value={lastName} required autoComplete="family-name" onChange={(e) => setLastName(e.target.value)} />
          )}
        </Field>
        <Field label="Téléphone">
          {(p) => (
            <TextInput {...p} type="tel" inputMode="tel" value={phone} required autoComplete="tel" placeholder="01 23 45 67 89" onChange={(e) => setPhone(e.target.value)} />
          )}
        </Field>

        <Field label="Prestation qui vous intéresse (facultatif)">
          {(p) => (
            <select
              {...p}
              value={interestServiceId}
              onChange={(e) => setInterestServiceId(e.target.value)}
              className="border-card-border bg-surface text-ink w-full rounded-2xl border px-4 py-3.5 font-sans text-base focus:outline-none focus-visible:border-primary-ink focus-visible:ring-2 focus-visible:ring-primary-glow"
            >
              <option value="">—</option>
              {SERVICE_CATEGORIES.map((category) => (
                <optgroup key={category.id} label={category.label}>
                  {servicesByCategory(category.id)
                    .filter((s) => !prices || prices.has(s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}
        </Field>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 accent-[#bd5822]"
          />
          <span className="text-ink">
            J’accepte d’être recontacté(e) par Le Printemps. Vos coordonnées ne servent qu’au suivi
            par l’institut.
          </span>
        </label>

        {/* Honeypot : invisible pour les humains. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute h-0 w-0 opacity-0"
        />

        {error && (
          <p role="alert" className="text-danger text-xs font-medium">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={busy}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}
