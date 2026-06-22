import { useRef, useState } from "react";
import { ScanLine, Trash2, PackageCheck, PackageX, AlertTriangle, ListPlus, Boxes } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import {
  useScanPacklistItem,
  useUpdatePacklistItemQuantity,
  useRemovePacklistItem,
  useMarkPacklistItemPickedUp,
  useReturnPacklistItem,
} from "@/hooks/useJobs";
import { useUsbScannerInput } from "@/components/barcode/BarcodeScanner";
import { DeviceAvailabilityWarning } from "@/components/jobs/DeviceAvailabilityWarning";
import { AddDevicesDialog } from "@/components/jobs/AddDevicesDialog";
import { AddSetDialog } from "@/components/jobs/AddSetDialog";
import type { Job, PacklistItem } from "@/types/database";
import { quantityStillOut, quantityNotYetPickedUp } from "@/types/database";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export function PacklistSection({ job }: { job: Job }) {
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ message: string; hasConflict: boolean } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSetDialog, setShowSetDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const scanPacklistItem = useScanPacklistItem();
  const updateQuantity = useUpdatePacklistItemQuantity();
  const removeItem = useRemovePacklistItem();
  const markPickedUp = useMarkPacklistItemPickedUp();
  const returnItem = useReturnPacklistItem();

  const items = job.packlist_items ?? [];

  async function handleScan(code: string) {
    setScanError(null);
    const trimmed = code.trim();
    if (!trimmed) return;

    const { data: barcode, error } = await supabase
      .from("barcodes")
      .select("device_id, device:devices(name, status, stock_quantity)")
      .eq("code", trimmed)
      .maybeSingle();

    if (error || !barcode) {
      setScanError(`Kein Gerät mit Barcode „${trimmed}" gefunden.`);
      return;
    }

    const deviceMeta = barcode.device as unknown as { name: string; stock_quantity: number } | null;
    const deviceName = deviceMeta?.name ?? "Gerät";

    const existingItem = items.find((item) => item.device_id === barcode.device_id);

    // Bereits ausgegebene Posten nicht per Scan weiter hochzählen — dafür gibt es
    // die explizite Ausgabe-Aktion, sonst würde "Ausgeben" rückwirkend verändert.
    if (existingItem && existingItem.quantity_picked_up > 0) {
      setScanError(`„${deviceName}" ist bereits (teilweise) ausgegeben — Menge bitte direkt am Posten anpassen.`);
      return;
    }

    const { item } = await scanPacklistItem.mutateAsync({
      jobId: job.id,
      deviceId: barcode.device_id,
      existingItem: existingItem ? { id: existingItem.id, quantity: existingItem.quantity } : null,
    });

    const { data: conflicts } = await supabase
      .from("packlist_items")
      .select("job_id, quantity, jobs!inner(id, title, status, start_date, end_date)")
      .eq("device_id", barcode.device_id)
      .neq("job_id", job.id)
      .in("jobs.status", ["anfrage", "bestaetigt", "laeuft"])
      .lt("jobs.start_date", job.end_date)
      .gt("jobs.end_date", job.start_date);

    const stockQuantity = deviceMeta?.stock_quantity ?? 1;
    const otherQuantity = (conflicts ?? []).reduce((sum, c) => sum + c.quantity, 0);
    const hasConflict = otherQuantity + item.quantity > stockQuantity;

    if (hasConflict) {
      setScanFeedback({
        message: `„${deviceName}" — jetzt ${item.quantity}× auf der Liste. Achtung, Bestand reicht im Zeitraum nicht für alle Jobs (siehe unten).`,
        hasConflict: true,
      });
    } else {
      setScanFeedback({
        message: stockQuantity > 1 ? `„${deviceName}" — jetzt ${item.quantity}× auf der Liste.` : `„${deviceName}" hinzugefügt.`,
        hasConflict: false,
      });
    }
    setTimeout(() => setScanFeedback(null), 4000);
  }

  useUsbScannerInput((code) => handleScan(code), true);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleScan(scanInput);
    setScanInput("");
    inputRef.current?.focus();
  }

  const canPick = job.status === "anfrage" || job.status === "bestaetigt" || job.status === "laeuft";

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <form onSubmit={handleManualSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              ref={inputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Barcode scannen oder eintippen … (mehrfach scannen erhöht die Menge)"
              className="pl-9 font-mono"
              autoFocus
            />
          </div>
          <Button type="submit" variant="secondary">
            Hinzufügen
          </Button>
        </form>
        <Button type="button" variant="secondary" onClick={() => setShowAddDialog(true)}>
          <ListPlus size={16} />
          Aus Inventar
        </Button>
        <Button type="button" variant="secondary" onClick={() => setShowSetDialog(true)}>
          <Boxes size={16} />
          Set hinzufügen
        </Button>
      </div>

      {scanError && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-status-defekt">
          <AlertTriangle size={14} />
          {scanError}
        </p>
      )}
      {scanFeedback && (
        <p
          className={cn(
            "mb-3 flex items-center gap-1.5 text-sm",
            scanFeedback.hasConflict ? "text-status-wartung" : "text-status-verfuegbar",
          )}
        >
          {scanFeedback.hasConflict && <AlertTriangle size={14} />}
          {scanFeedback.message}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          Noch keine Geräte auf der Packliste. Barcode scannen oder über „Aus Inventar"/„Set hinzufügen" auswählen.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <PacklistRow
              key={item.id}
              item={item}
              canPick={canPick}
              jobId={job.id}
              jobStartDate={job.start_date}
              jobEndDate={job.end_date}
              onRemove={() => removeItem.mutate({ id: item.id, jobId: job.id })}
              onUpdateQuantity={(quantity) => updateQuantity.mutate({ id: item.id, jobId: job.id, quantity })}
              onPickUp={(additionalQuantity) =>
                markPickedUp.mutate({ id: item.id, jobId: job.id, additionalQuantity })
              }
              onReturn={(returnedOk, damaged, missing, damageNotes) =>
                returnItem.mutate({ id: item.id, jobId: job.id, returnedOk, damaged, missing, damageNotes })
              }
            />
          ))}
        </div>
      )}

      <AddDevicesDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        jobId={job.id}
        jobStartDate={job.start_date}
        jobEndDate={job.end_date}
        excludeDeviceIds={items.filter((item) => item.quantity_picked_up === 0).map((item) => item.device_id)}
      />

      <AddSetDialog open={showSetDialog} onClose={() => setShowSetDialog(false)} jobId={job.id} />
    </div>
  );
}

function PacklistRow({
  item,
  canPick,
  jobId,
  jobStartDate,
  jobEndDate,
  onRemove,
  onUpdateQuantity,
  onPickUp,
  onReturn,
}: {
  item: PacklistItem;
  canPick: boolean;
  jobId: string;
  jobStartDate: string;
  jobEndDate: string;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
  onPickUp: (additionalQuantity?: number) => void;
  onReturn: (returnedOk: number, damaged: number, missing: number, damageNotes?: string) => void;
}) {
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showPickupInput, setShowPickupInput] = useState(false);
  const [pickupAmount, setPickupAmount] = useState("");
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));

  const isQuantityDevice = item.device ? item.device.stock_quantity > 1 : item.quantity > 1;
  const notYetPickedUp = quantityNotYetPickedUp(item);
  const stillOut = quantityStillOut(item);
  const isFullyPickedUp = notYetPickedUp === 0;
  const isFullyResolved = stillOut === 0 && isFullyPickedUp;
  const canRemove = item.quantity_picked_up === 0;

  function commitQuantity() {
    const parsed = parseInt(quantityInput, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== item.quantity && parsed >= item.quantity_picked_up) {
      onUpdateQuantity(parsed);
    } else {
      setQuantityInput(String(item.quantity));
    }
    setEditingQuantity(false);
  }

  return (
    <div className={cn("rounded-lg border border-border bg-bg-surface px-4 py-3", isFullyResolved && "opacity-60")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-ink">{item.device?.name}</p>
            {canRemove ? (
              editingQuantity ? (
                <input
                  type="number"
                  min={1}
                  autoFocus
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  onBlur={commitQuantity}
                  onKeyDown={(e) => e.key === "Enter" && commitQuantity()}
                  className="h-6 w-16 rounded border border-accent bg-bg-raised px-1.5 text-xs font-mono text-ink focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setQuantityInput(String(item.quantity));
                    setEditingQuantity(true);
                  }}
                  className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-mono font-medium text-accent hover:opacity-80"
                  title="Menge ändern"
                >
                  {item.quantity}×
                </button>
              )
            ) : (
              item.quantity > 1 && (
                <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-mono font-medium text-accent">
                  {item.quantity}×
                </span>
              )
            )}
          </div>
          <p className="font-mono text-xs text-ink-faint">{item.device?.barcodes?.[0]?.code}</p>

          {item.quantity_picked_up > 0 && (
            <p className="mt-0.5 text-xs text-ink-muted">
              Ausgegeben: {item.quantity_picked_up}× ({formatDateTime(item.picked_up_at)})
              {item.quantity_returned_ok > 0 && ` · zurück OK: ${item.quantity_returned_ok}×`}
              {item.quantity_damaged > 0 && ` · defekt: ${item.quantity_damaged}×`}
              {item.quantity_missing > 0 && ` · fehlend: ${item.quantity_missing}×`}
              {stillOut > 0 && ` · noch beim Kunden: ${stillOut}×`}
            </p>
          )}
          {item.damage_notes && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-status-defekt">
              <AlertTriangle size={12} />
              {item.damage_notes}
            </p>
          )}
          {!isFullyResolved && (
            <DeviceAvailabilityWarning
              deviceId={item.device_id}
              startDate={jobStartDate}
              endDate={jobEndDate}
              excludeJobId={jobId}
              stockQuantity={item.device?.stock_quantity ?? 1}
              myQuantity={item.quantity}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isFullyPickedUp && canPick && !showPickupInput && (
            <Button size="sm" variant="secondary" onClick={() => (isQuantityDevice ? setShowPickupInput(true) : onPickUp())}>
              <PackageCheck size={14} />
              {isQuantityDevice ? `Ausgeben (${notYetPickedUp} offen)` : "Ausgeben"}
            </Button>
          )}
          {item.quantity_picked_up > 0 && stillOut > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setShowReturnDialog(true)}>
              <PackageX size={14} />
              Rückgabe erfassen
            </Button>
          )}
          {canRemove && (
            <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Entfernen">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {showPickupInput && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Input
            type="number"
            min={1}
            max={notYetPickedUp}
            value={pickupAmount}
            onChange={(e) => setPickupAmount(e.target.value)}
            placeholder={`max. ${notYetPickedUp}`}
            className="w-28"
            autoFocus
          />
          <Button
            size="sm"
            onClick={() => {
              const amount = Math.min(notYetPickedUp, Math.max(1, parseInt(pickupAmount, 10) || notYetPickedUp));
              onPickUp(amount);
              setShowPickupInput(false);
              setPickupAmount("");
            }}
          >
            Ausgeben
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPickupInput(false)}>
            Abbrechen
          </Button>
        </div>
      )}

      {showReturnDialog && (
        <ReturnDialog
          open={showReturnDialog}
          onClose={() => setShowReturnDialog(false)}
          deviceName={item.device?.name ?? "Gerät"}
          maxQuantity={stillOut}
          onSubmit={(returnedOk, damaged, missing, damageNotes) => {
            onReturn(returnedOk, damaged, missing, damageNotes);
            setShowReturnDialog(false);
          }}
        />
      )}
    </div>
  );
}

function ReturnDialog({
  open,
  onClose,
  deviceName,
  maxQuantity,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  deviceName: string;
  maxQuantity: number;
  onSubmit: (returnedOk: number, damaged: number, missing: number, damageNotes?: string) => void;
}) {
  const [returnedOk, setReturnedOk] = useState(String(maxQuantity));
  const [damaged, setDamaged] = useState("0");
  const [missing, setMissing] = useState("0");
  const [damageNotes, setDamageNotes] = useState("");

  const ok = parseInt(returnedOk, 10) || 0;
  const dmg = parseInt(damaged, 10) || 0;
  const miss = parseInt(missing, 10) || 0;
  const total = ok + dmg + miss;
  const isValid = total > 0 && total <= maxQuantity && ok >= 0 && dmg >= 0 && miss >= 0;

  return (
    <Dialog open={open} onClose={onClose} title={`Rückgabe erfassen — ${deviceName}`} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Noch beim Kunden: <span className="font-medium text-ink">{maxQuantity}×</span>. Teilrückgaben sind
          möglich — was jetzt nicht erfasst wird, bleibt offen für später.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Intakt zurück</label>
            <Input type="number" min={0} value={returnedOk} onChange={(e) => setReturnedOk(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Defekt</label>
            <Input type="number" min={0} value={damaged} onChange={(e) => setDamaged(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Fehlend</label>
            <Input type="number" min={0} value={missing} onChange={(e) => setMissing(e.target.value)} />
          </div>
        </div>

        {dmg > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Schadensbeschreibung</label>
            <Input
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder={`z.B. "${dmg} Stecker abgebrochen"`}
            />
          </div>
        )}

        {total > maxQuantity && (
          <p className="flex items-center gap-1.5 text-xs text-status-defekt">
            <AlertTriangle size={13} />
            Summe ({total}) ist größer als die noch ausstehende Menge ({maxQuantity}).
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant={dmg > 0 || miss > 0 ? "danger" : "primary"}
            disabled={!isValid}
            onClick={() => onSubmit(ok, dmg, miss, damageNotes)}
          >
            Rückgabe speichern
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
