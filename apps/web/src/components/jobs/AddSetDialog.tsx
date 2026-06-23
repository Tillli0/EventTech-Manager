import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { SetCard } from "@/components/inventory/ManageSetsDialog";
import { useDeviceSets } from "@/hooks/useDeviceSets";
import { useAddDeviceSetToJob } from "@/hooks/useDeviceSets";

/**
 * Set zu einem Job hinzufügen. Sets sind reine Anlage-Abkürzungen: nach dem
 * Hinzufügen sind die enthaltenen Geräte ganz normale Einzelposten auf der
 * Packliste, ohne weiteren Gruppenbezug. Mengen pro Set-Bestandteil lassen
 * sich hier vor dem Hinzufügen noch anpassen.
 */
export function AddSetDialog({
  open,
  onClose,
  jobId,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
}) {
  const { data: sets, isLoading, error } = useDeviceSets();
  const addSetToJob = useAddDeviceSetToJob();

  const [selectedSetId, setSelectedSetId] = useState("");
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());

  const selectedSet = sets?.find((s) => s.id === selectedSetId);

  useEffect(() => {
    if (selectedSet) {
      setQuantities(new Map(selectedSet.items?.map((i) => [i.device_id, i.quantity]) ?? []));
    } else {
      setQuantities(new Map());
    }
  }, [selectedSet]);

  function handleClose() {
    setSelectedSetId("");
    setQuantities(new Map());
    onClose();
  }

  async function handleAdd() {
    if (!selectedSet || !selectedSet.items || selectedSet.items.length === 0) return;
    await addSetToJob.mutateAsync({
      jobId,
      items: selectedSet.items.map((i) => ({
        deviceId: i.device_id,
        quantity: quantities.get(i.device_id) ?? i.quantity,
      })),
    });
    handleClose();
  }

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
                {selectedSet.description && (
                  <p className="mb-2 text-xs text-ink-muted">{selectedSet.description}</p>
                )}
                {(selectedSet.items ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-1">
                    <p className="min-w-0 flex-1 truncate text-sm text-ink">{item.device?.name}</p>
                    <Input
                      type="number"
                      min={1}
                      value={quantities.get(item.device_id) ?? item.quantity}
                      onChange={(e) =>
                        setQuantities((prev) => {
                          const next = new Map(prev);
                          next.set(item.device_id, Math.max(1, parseInt(e.target.value, 10) || 1));
                          return next;
                        })
                      }
                      className="w-20 shrink-0"
                    />
                  </div>
                ))}
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
          <Button
            onClick={handleAdd}
            disabled={!selectedSet || !selectedSet.items?.length || addSetToJob.isPending}
          >
            {addSetToJob.isPending ? "Wird hinzugefügt …" : "Set hinzufügen"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
