import { useEffect, useState } from "react";
import { Boxes, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { SetCard } from "@/components/inventory/ManageSetsDialog";
import { useDeviceSets, useAddDeviceSetToJob } from "@/hooks/useDeviceSets";
import { useDevicesAvailabilityMap, sumBookedQuantity } from "@/hooks/useJobs";

/**
 * Set zu einem Job hinzufügen. Sets sind reine Anlage-Abkürzungen: nach dem
 * Hinzufügen sind die enthaltenen Geräte ganz normale Einzelposten auf der
 * Packliste. Mengen lassen sich vor dem Hinzufügen anpassen — aber nie über den
 * im Zeitraum verfügbaren Bestand hinaus (Lager minus andere aktive Jobs).
 */
export function AddSetDialog({
  open,
  onClose,
  jobId,
  jobStartDate,
  jobEndDate,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobStartDate: string;
  jobEndDate: string;
}) {
  const { data: sets, isLoading, error } = useDeviceSets();
  const addSetToJob = useAddDeviceSetToJob();
  const { data: conflictMap } = useDevicesAvailabilityMap(jobStartDate, jobEndDate, jobId);

  const [selectedSetId, setSelectedSetId] = useState("");
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());

  const selectedSet = sets?.find((s) => s.id === selectedSetId);

  /** Im Zeitraum verfügbarer Bestand eines Geräts (Lager minus andere aktive Jobs). */
  function availableFor(deviceId: string, stock: number): number {
    return Math.max(0, stock - sumBookedQuantity(conflictMap?.get(deviceId)));
  }

  useEffect(() => {
    if (selectedSet) {
      // Vorbelegung mit der Set-Menge, aber gedeckelt auf den verfügbaren Bestand.
      setQuantities(
        new Map(
          selectedSet.items?.map((i) => {
            const avail = availableFor(i.device_id, i.device?.stock_quantity ?? 1);
            return [i.device_id, Math.min(i.quantity, Math.max(0, avail))];
          }) ?? [],
        ),
      );
    } else {
      setQuantities(new Map());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSet, conflictMap]);

  function handleClose() {
    setSelectedSetId("");
    setQuantities(new Map());
    onClose();
  }

  async function handleAdd() {
    if (!selectedSet?.items?.length) return;
    const items = selectedSet.items
      .map((i) => {
        const avail = availableFor(i.device_id, i.device?.stock_quantity ?? 1);
        const wanted = quantities.get(i.device_id) ?? i.quantity;
        return { deviceId: i.device_id, quantity: Math.min(wanted, avail) };
      })
      .filter((x) => x.quantity >= 1);
    if (items.length === 0) return;
    await addSetToJob.mutateAsync({ jobId, items });
    handleClose();
  }

  // Lässt sich überhaupt etwas hinzufügen? (mind. ein Gerät verfügbar)
  const anyAddable = (selectedSet?.items ?? []).some(
    (i) => availableFor(i.device_id, i.device?.stock_quantity ?? 1) >= 1,
  );

  return (
    <Dialog open={open} onClose={handleClose} title="Set zur Packliste hinzufügen" maxWidth="max-w-lg">
      <div className="space-y-4">
        {isLoading && <LoadingState label="Sets werden geladen …" />}
        {error && <ErrorState message={error.message} />}

        {!isLoading && (!sets || sets.length === 0) && (
          <EmptyState
            icon={Boxes}
            title="Noch keine Sets angelegt"
            description="Lege im Inventar zuerst ein Set an (z.B. „Standard-DJ-Setup“), um es hier mit einem Klick zu einem Job hinzuzufügen."
          />
        )}

        {!isLoading && sets && sets.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sets.map((set) => (
                <SetCard
                  key={set.id}
                  set={set}
                  selected={set.id === selectedSetId}
                  onClick={() => setSelectedSetId(set.id === selectedSetId ? "" : set.id)}
                />
              ))}
            </div>

            {selectedSet && (
              <div className="space-y-1.5 rounded-lg border border-border p-3">
                <p className="mb-1 text-sm font-medium text-ink">{selectedSet.name}</p>
                {selectedSet.description && <p className="mb-2 text-xs text-ink-muted">{selectedSet.description}</p>}
                {(selectedSet.items ?? []).map((item) => {
                  const stock = item.device?.stock_quantity ?? 1;
                  const avail = availableFor(item.device_id, stock);
                  const soldOut = avail <= 0;
                  const value = Math.min(quantities.get(item.device_id) ?? item.quantity, Math.max(0, avail));
                  return (
                    <div key={item.id} className="py-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`min-w-0 flex-1 truncate text-sm ${soldOut ? "text-ink-faint" : "text-ink"}`}>
                          {item.device?.name}
                        </p>
                        {soldOut ? (
                          <span className="shrink-0 text-xs font-medium text-status-defekt">nicht verfügbar</span>
                        ) : (
                          <Input
                            type="number"
                            min={1}
                            max={avail}
                            value={value}
                            onChange={(e) =>
                              setQuantities((prev) => {
                                const next = new Map(prev);
                                next.set(item.device_id, Math.min(avail, Math.max(1, parseInt(e.target.value, 10) || 1)));
                                return next;
                              })
                            }
                            title={`max. ${avail} im Zeitraum verfügbar`}
                            className="w-20 shrink-0"
                          />
                        )}
                      </div>
                      {(soldOut || avail < item.quantity) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-status-wartung">
                          <AlertTriangle size={11} className="shrink-0" />
                          {soldOut
                            ? `Im Zeitraum nicht verfügbar (Lager ${stock}, anderweitig verplant).`
                            : `Nur ${avail}× im Zeitraum verfügbar (Set wünscht ${item.quantity}×).`}
                        </p>
                      )}
                    </div>
                  );
                })}
                {(!selectedSet.items || selectedSet.items.length === 0) && (
                  <p className="text-sm text-ink-faint">Dieses Set enthält noch keine Geräte.</p>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="secondary" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button onClick={handleAdd} disabled={!selectedSet || !anyAddable || addSetToJob.isPending}>
            {addSetToJob.isPending ? "Wird hinzugefügt …" : "Set hinzufügen"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
