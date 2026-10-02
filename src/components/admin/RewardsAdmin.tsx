import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { createReward, deleteReward, listRewards, updateReward } from '../../lib/api';
import type { Reward } from '../../lib/types';
import { Button } from '../ui/Button';
import { Field, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';

/** Onglet Récompenses : CRUD sur le catalogue de récompenses. */
export function RewardsAdmin() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setRewards(await listRewards());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(reward: Reward) {
    try {
      await updateReward(reward.id, { active: !reward.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  }

  async function remove(reward: Reward) {
    if (!window.confirm(`Supprimer « ${reward.title} » ?`)) return;
    try {
      await deleteReward(reward.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  }

  if (!rewards) return <p className="text-muted text-sm">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="border-danger-soft text-danger rounded-tile border px-4 py-3 text-sm font-medium">
          {error}
        </p>
      )}
      <div className="self-start">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
          Nouvelle récompense
        </Button>
      </div>

      {rewards.length === 0 ? (
        <p className="text-muted text-sm">Aucune récompense pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rewards.map((reward) => (
            <li
              key={reward.id}
              className="border-card-border bg-card flex flex-col gap-2 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-ink font-serif text-lg leading-tight">{reward.title}</p>
                {reward.description && <p className="text-muted text-sm">{reward.description}</p>}
                <p className="text-primary-ink mt-1 text-xs font-semibold">
                  {reward.costFlowers} Fleur{reward.costFlowers > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleActive(reward)}
                  className={`rounded-pill px-3 py-1 font-sans text-[0.7rem] font-semibold ${
                    reward.active ? 'bg-success-soft text-success' : 'bg-card-border text-muted'
                  }`}
                >
                  {reward.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  type="button"
                  aria-label="Modifier"
                  onClick={() => setEditing(reward)}
                  className="text-muted hover:bg-primary-light hover:text-primary-ink cursor-pointer rounded-full p-2"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Supprimer"
                  onClick={() => void remove(reward)}
                  className="text-muted hover:bg-danger-soft hover:text-danger cursor-pointer rounded-full p-2"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RewardModal
        open={creating || editing !== null}
        reward={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={load}
      />
    </div>
  );
}

function RewardModal({
  open,
  reward,
  onClose,
  onSaved,
}: {
  open: boolean;
  reward: Reward | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('1');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (reward) {
      setTitle(reward.title);
      setDescription(reward.description);
      setCost(String(reward.costFlowers));
      setActive(reward.active);
    } else {
      setTitle('');
      setDescription('');
      setCost('1');
      setActive(true);
    }
    setError(null);
  }, [reward, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        costFlowers: Number(cost),
        active,
      };
      if (reward) await updateReward(reward.id, payload);
      else await createReward(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="reward-modal-title">
      <form onSubmit={submit} className="flex flex-col gap-4 p-6">
        <h2 id="reward-modal-title" className="text-ink font-serif text-xl">
          {reward ? 'Modifier la récompense' : 'Nouvelle récompense'}
        </h2>
        <Field label="Titre">
          {(p) => (
            <TextInput {...p} value={title} required maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          )}
        </Field>
        <Field label="Description">
          {(p) => (
            <TextInput {...p} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
          )}
        </Field>
        <Field label="Coût (Fleurs de Printemps)">
          {(p) => (
            <TextInput
              {...p}
              type="number"
              min={1}
              value={cost}
              invalid={Boolean(error)}
              onChange={(e) => setCost(e.target.value)}
            />
          )}
        </Field>
        <label className="text-ink flex items-center gap-2 font-sans text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Visible dans l’espace client
        </label>
        {error && (
          <p role="alert" className="text-danger text-xs font-medium">{error}</p>
        )}
        <Button type="submit" loading={busy}>
          {reward ? 'Enregistrer' : 'Créer'}
        </Button>
      </form>
    </Modal>
  );
}
