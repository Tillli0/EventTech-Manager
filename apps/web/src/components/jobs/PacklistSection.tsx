import { useRef, useState } from "react";
import { ScanLine, Trash2, PackageCheck, PackageX, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useAddPacklistItem,
  useRemovePacklistItem,
  useMarkPacklistItemPickedUp,
  useMarkPacklistItemReturned,
} from "@/hooks/useJobs";
import { useUsbScannerInput } from "@/components/barcode/BarcodeScanner";
import type { Job, PacklistItem } from "@/types/database";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export function PacklistSection({ job }: { job: Job }) {
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addItem = useAddPacklistItem();
  const removeItem = useRemovePacklistItem();
  const markPickedUp = useMarkPacklistItemPickedUp();
  const markReturned = useMarkPacklistItemReturned();

  const items = job.packlist_items ?? [];

  async function handleScan(code: string) {
    setScanError(null);
    const trimmed = code.trim();
    if (!trimmed) return;

    const { data: barcode, error } = await supabase
      .from("barcodes")
      .select("device_id, device:devices(name, status)")
      .eq("code", trimmed)
      .maybeSingle();

    if (error || !barcode) {
      setScanError(`Kein Gerät mit Barcode „${trimmed}" gefunden.`);
      return;
    }

    const deviceName = (barcode.device as unknown as { name: string } | null)?.name ?? "Gerät";

    const alreadyInList = items.some((item) => item.device_id === barcode.device_id);
    if (alreadyInList) {
      setScanError(`„${deviceName}" ist bereits auf der Packliste.`);
      return;
    }

    await addItem.mutateAsync({ jobId: job.id, deviceId: barcode.device_id });
    setScanFeedback(`„${deviceName}" hinzugefügt.`);
    setTimeout(() => setScanFeedback(null), 2500);
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
      <form onSubmit={handleManualSubmit} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            ref={inputRef}
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Barcode scannen oder eintippen …"
            className="pl-9 font-mono"
            autoFocus
          />
        </div>
        <Button type="submit" variant="secondary">
          Hinzufügen
        </Button>
      </form>

      {scanError && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-status-defekt">
          <AlertTriangle size={14} />
          {scanError}
        </p>
      )}
      {scanFeedback && <p className="mb-3 text-sm text-status-verfuegbar">{scanFeedback}</p>}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          Noch keine Geräte auf der Packliste. Barcode scannen, um Geräte hinzuzufügen.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <PacklistRow
              key={item.id}
              item={item}
              canPick={canPick}
              onRemove={() => removeItem.mutate({ id: item.id, jobId: job.id })}
              onPickUp={() => markPickedUp.mutate({ id: item.id, jobId: job.id })}
              onReturn={(isDamaged, damageNotes) =>
                markReturned.mutate({ id: item.id, jobId: job.id, isDamaged, damageNotes })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PacklistRow({
  item,
  canPick,
  onRemove,
  onPickUp,
  onReturn,
}: {
  item: PacklistItem;
  canPick: boolean;
  onRemove: () => void;
  onPickUp: () => void;
  onReturn: (isDamaged: boolean, damageNotes?: string) => void;
}) {
  const [showDamageInput, setShowDamageInput] = useState(false);
  const [damageNotes, setDamageNotes] = useState("");

  const isPickedUp = !!item.picked_up_at;
  const isReturned = !!item.returned_at;

  return (
    <div className={cn("rounded-lg border border-border bg-bg-surface px-4 py-3", isReturned && "opacity-60")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{item.device?.name}</p>
          <p className="font-mono text-xs text-ink-faint">{item.device?.barcodes?.[0]?.code}</p>
          {isPickedUp && (
            <p className="mt-0.5 text-xs text-ink-muted">
              Ausgegeben: {formatDateTime(item.picked_up_at)}
              {isReturned && ` · Zurück: ${formatDateTime(item.returned_at)}`}
            </p>
          )}
          {item.is_damaged_on_return && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-status-defekt">
              <AlertTriangle size={12} />
              Defekt bei Rückgabe{item.damage_notes ? `: ${item.damage_notes}` : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isPickedUp && canPick && (
            <Button size="sm" variant="secondary" onClick={onPickUp}>
              <PackageCheck size={14} />
              Ausgeben
            </Button>
          )}
          {isPickedUp && !isReturned && !showDamageInput && (
            <>
              <Button size="sm" variant="secondary" onClick={() => onReturn(false)}>
                <PackageX size={14} />
                Rückgabe OK
              </Button>
              <Button size="sm" variant="danger" onClick={() => setShowDamageInput(true)}>
                Defekt
              </Button>
            </>
          )}
          {!isPickedUp && (
            <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Entfernen">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {showDamageInput && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Input
            value={damageNotes}
            onChange={(e) => setDamageNotes(e.target.value)}
            placeholder="Schadensbeschreibung …"
            className="flex-1"
          />
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              onReturn(true, damageNotes);
              setShowDamageInput(false);
            }}
          >
            Als defekt zurücknehmen
          </Button>
        </div>
      )}
    </div>
  );
}
