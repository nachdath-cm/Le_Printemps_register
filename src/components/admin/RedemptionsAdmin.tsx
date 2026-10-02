import { useCallback, useEffect, useState } from 'react';

import { listRedemptions, setRedemptionStatus, type RedemptionRow } from '../../lib/api';
import { REDEMPTION_STATUS_LABEL } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../ui/Button';

/** Onglet Échanges : échanges en attente d'abord, actions Utilisé / Annuler. */
export function RedemptionsAdmin() {
  const [rows, setRows] = useState<RedemptionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listRedemptions());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, status: 'used' | 'cancelled') {
    setBusyId(id);
    try {
      await setRedemptionStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  }

  if (!rows) return <p className="text-muted text-sm">Chargement…</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="border-danger-soft text-danger rounded-tile border px-4 py-3 text-sm font-medium">
          {error}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-muted text-sm">Aucun échange pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="border-card-border bg-card flex flex-col gap-2 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-ink font-sans text-sm font-semibold">{row.clientName}</p>
                <p className="text-ink font-serif text-lg leading-tight">{row.rewardTitle}</p>
                <p className="text-muted text-xs">{formatDateTime(row.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-pill px-2.5 py-1 font-sans text-[0.7rem] font-semibold ${
                    row.status === 'pending'
                      ? 'bg-primary-light text-primary-ink'
                      : row.status === 'used'
                        ? 'bg-success-soft text-success'
                        : 'bg-danger-soft text-danger'
                  }`}
                >
                  {REDEMPTION_STATUS_LABEL[row.status]}
                </span>
                {row.status === 'pending' && (
                  <>
                    <Button size="sm" disabled={busyId === row.id} onClick={() => void act(row.id, 'used')}>
                      Utilisé
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === row.id}
                      className="text-danger hover:bg-danger-soft"
                      onClick={() => void act(row.id, 'cancelled')}
                    >
                      Annuler
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
