import { MessageCircle, Sparkles, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { INSTITUTE } from '../config/institute';
import {
  ApiError,
  clientFirstVisit,
  requestClientCode,
  verifyClientCode,
} from '../lib/api';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';

type View = 'choix' | 'premiere-fois' | 'connexion';

/**
 * Porte d'entrée client : première visite ou reconnexion par code WhatsApp.
 * Accessible depuis le QR de la borne et en lien direct.
 */
export function AccueilClientPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('choix');

  return (
    <div className="bg-cream flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <Logo size={64} />
          <p className="eyebrow">{INSTITUTE.name}</p>
          <h1 className="text-ink font-serif text-2xl">Bienvenue</h1>
          <p className="text-muted text-sm">
            Votre espace personnel : visites, Gouttes de Rosée et Fleurs de Printemps.
          </p>
        </header>

        {view === 'choix' && (
          <div className="flex w-full flex-col gap-3">
            <Button size="lg" onClick={() => setView('premiere-fois')} icon={<Sparkles className="size-4" aria-hidden="true" />}>
              Je viens pour la première fois
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setView('connexion')} icon={<UserRound className="size-4" aria-hidden="true" />}>
              Se connecter à mon espace
            </Button>
          </div>
        )}

        {view === 'premiere-fois' && <FirstVisit onDone={() => navigate('/espace', { replace: true })} onBack={() => setView('choix')} />}
        {view === 'connexion' && <Login onDone={() => navigate('/espace', { replace: true })} onBack={() => setView('choix')} />}
      </div>
    </div>
  );
}

function FirstVisit({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await clientFirstVisit({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface border-primary-light flex w-full flex-col gap-4 rounded-card border p-6 shadow-card">
      <Field label="Prénom">
        {(p) => <TextInput {...p} value={firstName} required autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} />}
      </Field>
      <Field label="Nom">
        {(p) => <TextInput {...p} value={lastName} required autoComplete="family-name" onChange={(e) => setLastName(e.target.value)} />}
      </Field>
      <Field label="Téléphone">
        {(p) => <TextInput {...p} type="tel" inputMode="tel" value={phone} required autoComplete="tel" placeholder="01 23 45 67 89" onChange={(e) => setPhone(e.target.value)} />}
      </Field>
      {error && <p role="alert" className="text-danger text-xs font-medium">{error}</p>}
      <Button type="submit" fullWidth loading={busy}>Créer mon espace</Button>
      <Button type="button" variant="ghost" onClick={onBack}>Retour</Button>
    </form>
  );
}

function Login({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await requestClientCode(phone.trim());
      setWhatsappUrl(result.whatsappUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyClientCode(phone.trim(), code.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide.');
    } finally {
      setBusy(false);
    }
  };

  if (!whatsappUrl) {
    return (
      <form onSubmit={sendCode} className="bg-surface border-primary-light flex w-full flex-col gap-4 rounded-card border p-6 shadow-card">
        <Field label="Votre numéro de téléphone">
          {(p) => <TextInput {...p} type="tel" inputMode="tel" value={phone} required autoComplete="tel" placeholder="01 23 45 67 89" onChange={(e) => setPhone(e.target.value)} />}
        </Field>
        {error && <p role="alert" className="text-danger text-xs font-medium">{error}</p>}
        <Button type="submit" fullWidth loading={busy}>Recevoir mon code</Button>
        <Button type="button" variant="ghost" onClick={onBack}>Retour</Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="bg-surface border-primary-light flex w-full flex-col gap-4 rounded-card border p-6 shadow-card">
      <p className="text-muted text-sm">
        1. Ouvrez WhatsApp pour récupérer votre code, puis saisissez-le ici :
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="text-whatsapp-hover inline-flex items-center gap-2 font-sans text-sm font-semibold"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        Ouvrir WhatsApp
      </a>
      <Field label="Code à 6 chiffres">
        {(p) => <TextInput {...p} inputMode="numeric" value={code} maxLength={6} required placeholder="123456" onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />}
      </Field>
      {error && <p role="alert" className="text-danger text-xs font-medium">{error}</p>}
      <Button type="submit" fullWidth loading={busy} disabled={code.length !== 6}>Se connecter</Button>
      <Button type="button" variant="ghost" onClick={onBack}>Retour</Button>
    </form>
  );
}
