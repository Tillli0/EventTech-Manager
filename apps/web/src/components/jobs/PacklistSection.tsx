import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ScanLine, PackageCheck, PackageX, AlertTriangle, Undo2, MapPin, Check, Camera, ListPlus, PackageOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { CameraBarcodeScanner, useUsbScannerInput } from "@/components/barcode/BarcodeScanner";
import {
  useMarkPacklistItemPickedUp,
  useReturnPacklistItem,
  useUndoPickup,
} from "@/hooks/useJobs";
import { useLocations } from "@/hooks/useLocations";
import type { Job, PacklistItem } from "@/types/database";
import { quantityStillOut, quantityNotYetPickedUp } from "@/types/database";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

type Stage = "packen" | "rueckgabe";

const STAGES: { key: Stage; label: string }[] = [
  { key: "packen", label: "Packen" },
  { key: "rueckgabe", label: "Rückgabe" },
];

export function PacklistSection({ job, canEdit = true }: { job: Job; canEdit?: boolean }) {
  const items = job.packlist_items ?? [];
  const [stage, setStage] = useState<Stage>("packen");

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const pickedQty = items.reduce((s, i) => s + i.quantity_picked_up, 0);
  const outQty = items.reduce((s, i) => s + quantityStillOut(i), 0);

  // Leere Packliste: klarer Call-to-Action zur Vollbild-Auswahl.
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <PackageOpen size={26} className="text-ink-faint" />
        <p className="text-sm text-ink-muted">Noch keine Geräte auf der Packliste.</p>
        {canEdit && (
          <Link
            to={`/jobs/${job.id}/packliste`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <ListPlus size={16} />
            Geräte auswählen
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Kopf: Stufen-Umschalter + Vollbild-Auswahl */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-bg-raised p-1">
          {STAGES.map((s) => {
            const active = stage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStage(s.key)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-accent text-white shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {canEdit && (
          <Link
            to={`/jobs/${job.id}/packliste`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-bg-raised px-3 text-sm font-medium text-ink transition-colors hover:bg-bg-surface"
          >
            <ListPlus size={15} />
            Geräte auswählen
          </Link>
        )}
      </div>

      {stage === "packen" ? (
        <PackenStage job={job} items={items} canEdit={canEdit} totalQty={totalQty} pickedQty={pickedQty} />
      ) : (
        <RueckgabeStage job={job} items={items} canEdit={canEdit} outQty={outQty} />
      )}
    </div>
  );
}

// ── Scanner-Box (gemeinsam für Packen/Rückgabe) ──────────────────────────────

function ScannerBox({
  onScan,
  enabled,
  placeholder,
}: {
  onScan: (code: string) => void;
  enabled: boolean;
  placeholder: string;
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // USB-Scanner (Keyboard-Wedge) global, solange diese Stufe aktiv ist.
  useUsbScannerInput((code) => onScan(code), enabled);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) onScan(value.trim());
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <form onSubmit={submit} className="relative flex-1">
          <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="pl-9 font-mono"
          />
        </form>
        <Button type="button" variant="secondary" onClick={() => setShowCamera((v) => !v)}>
          <Camera size={16} />
          {showCamera ? "Kamera aus" : "Kamera"}
        </Button>
      </div>
      {showCamera && (
        <CameraBarcodeScanner
          onResult={(code) => {
            onScan(code);
          }}
        />
      )}
    </div>
  );
}

/** Barcode → Packlist-Posten dieses Jobs auflösen. */
async function findItemByBarcode(code: string, items: PacklistItem[]): Promise<PacklistItem | null> {
  const { data } = await supabase.from("barcodes").select("device_id").eq("code", code.trim()).maybeSingle();
  if (!data) return null;
  return items.find((i) => i.device_id === data.device_id) ?? null;
}

// ── Stufe 2: Packen ──────────────────────────────────────────────────────────

function PackenStage({
  job,
  items,
  canEdit,
  totalQty,
  pickedQty,
}: {
  job: Job;
  items: PacklistItem[];
  canEdit: boolean;
  totalQty: number;
  pickedQty: number;
}) {
  const markPickedUp = useMarkPacklistItemPickedUp();
  const undoPickup = useUndoPickup();
  const [scanMsg, setScanMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function flash(text: string, ok: boolean) {
    setScanMsg({ text, ok });
    setTimeout(() => setScanMsg(null), 3500);
  }

  async function handleScan(code: string) {
    const item = await findItemByBarcode(code, items);
    if (!item) {
      flash(`Kein Posten mit Barcode „${code}" auf dieser Packliste.`, false);
      return;
    }
    if (quantityNotYetPickedUp(item) <= 0) {
      flash(`„${item.device?.name}" ist bereits vollständig ausgegeben.`, false);
      return;
    }
    await markPickedUp.mutateAsync({ id: item.id, jobId: job.id, additionalQuantity: 1 });
    flash(`„${item.device?.name}" ausgegeben.`, true);
  }

  if (items.length === 0) {
    return <EmptyHint text="Erst in der Planung Geräte hinzufügen." />;
  }

  return (
    <div className="space-y-4">
      {canEdit && <ScannerBox onScan={handleScan} enabled placeholder="Zum Ausgeben scannen oder Barcode eintippen …" />}
      {scanMsg && (
        <p className={cn("flex items-center gap-1.5 text-sm", scanMsg.ok ? "text-status-verfuegbar" : "text-status-defekt")}>
          {scanMsg.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          {scanMsg.text}
        </p>
      )}

      <ProgressBar value={pickedQty} max={totalQty} label={`${pickedQty}/${totalQty} ausgegeben`} />

      <div className="space-y-2">
        {items.map((item) => (
          <PackenRow
            key={item.id}
            item={item}
            canEdit={canEdit}
            onPickUp={(amount) => markPickedUp.mutate({ id: item.id, jobId: job.id, additionalQuantity: amount })}
            onUndo={() => undoPickup.mutate({ id: item.id, jobId: job.id })}
          />
        ))}
      </div>
    </div>
  );
}

function PackenRow({
  item,
  canEdit,
  onPickUp,
  onUndo,
}: {
  item: PacklistItem;
  canEdit: boolean;
  onPickUp: (amount: number) => void;
  onUndo: () => void;
}) {
  const notYet = quantityNotYetPickedUp(item);
  const done = notYet === 0;
  const isQuantity = item.quantity > 1;
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState("");

  return (
    <div className={cn("rounded-lg border border-border bg-bg-surface px-4 py-3", done && "bg-status-verfuegbar-bg/40")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canEdit || done}
              onClick={() => onPickUp(notYet)}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                done ? "border-status-verfuegbar bg-status-verfuegbar text-white" : "border-ink-faint hover:border-accent",
              )}
              aria-label="Ausgeben"
              title={done ? "Ausgegeben" : "Komplett ausgeben"}
            >
              {done && <Check size={12} />}
            </button>
            <p className={cn("truncate font-medium text-ink", done && "text-ink-muted")}>{item.device?.name}</p>
            {item.quantity > 1 && <span className="shrink-0 font-mono text-xs text-accent">{item.quantity}×</span>}
          </div>
          <p className="mt-0.5 pl-7 text-xs text-ink-muted">
            {item.quantity_picked_up > 0
              ? `${item.quantity_picked_up}/${item.quantity} ausgegeben${item.picked_up_at ? ` · ${formatDateTime(item.picked_up_at)}` : ""}`
              : "noch nicht ausgegeben"}
          </p>
        </div>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            {!done &&
              (isQuantity ? (
                <Button size="sm" variant="secondary" onClick={() => setPartial((v) => !v)}>
                  <PackageCheck size={14} />
                  Ausgeben ({notYet})
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => onPickUp(notYet)}>
                  <PackageCheck size={14} />
                  Ausgeben
                </Button>
              ))}
            {item.quantity_picked_up > 0 && (
              <Button size="icon" variant="ghost" onClick={onUndo} aria-label="Ausgabe rückgängig" title="Ausgabe rückgängig">
                <Undo2 size={14} />
              </Button>
            )}
          </div>
        )}
      </div>

      {partial && !done && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Input
            type="number"
            min={1}
            max={notYet}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`max. ${notYet}`}
            className="w-28"
            autoFocus
          />
          <Button
            size="sm"
            onClick={() => {
              const n = Math.min(notYet, Math.max(1, parseInt(amount, 10) || notYet));
              onPickUp(n);
              setPartial(false);
              setAmount("");
            }}
          >
            Ausgeben
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPartial(false)}>
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Stufe 3: Rückgabe ────────────────────────────────────────────────────────

function RueckgabeStage({
  job,
  items,
  canEdit,
  outQty,
}: {
  job: Job;
  items: PacklistItem[];
  canEdit: boolean;
  outQty: number;
}) {
  const { data: locations } = useLocations();
  const returnItem = useReturnPacklistItem();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [returnFor, setReturnFor] = useState<PacklistItem | null>(null);
  const [scanMsg, setScanMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const outItems = items.filter((i) => quantityStillOut(i) > 0);

  function flash(text: string, ok: boolean) {
    setScanMsg({ text, ok });
    setTimeout(() => setScanMsg(null), 3500);
  }

  async function handleScan(code: string) {
    const item = await findItemByBarcode(code, items);
    if (!item) {
      flash(`Kein Posten mit Barcode „${code}" auf dieser Packliste.`, false);
      return;
    }
    if (quantityStillOut(item) <= 0) {
      flash(`„${item.device?.name}" ist bereits vollständig zurück.`, false);
      return;
    }
    await returnItem.mutateAsync({
      id: item.id,
      jobId: job.id,
      returnedOk: 1,
      damaged: 0,
      missing: 0,
      locationId,
    });
    flash(`„${item.device?.name}" zurückgebucht.`, true);
  }

  if (items.length === 0) {
    return <EmptyHint text="Für diesen Job ist nichts ausgegeben." />;
  }

  return (
    <div className="space-y-4">
      {/* Lagerort-Abfrage */}
      {canEdit && (
        <div className="rounded-lg border border-border bg-bg-raised p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
            <MapPin size={15} /> Wo wird ausgeladen?
          </p>
          {locations && locations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {locations.map((loc) => {
                const active = locationId === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocationId(active ? null : loc.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active ? "border-transparent text-white" : "border-border text-ink-muted hover:text-ink",
                    )}
                    style={active ? { backgroundColor: loc.color ?? "#3B82F6" } : undefined}
                  >
                    {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: loc.color ?? "#64748b" }} />}
                    {loc.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">
              Noch keine Lagerorte angelegt — im Inventar unter „Lagerorte" hinzufügen. Rückgabe geht auch ohne.
            </p>
          )}
          {locationId && (
            <p className="mt-2 text-xs text-ink-faint">
              Intakt zurückgegebene Geräte werden auf diesen Lagerort gesetzt.
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <ScannerBox onScan={handleScan} enabled placeholder="Zum Zurückbuchen scannen oder Barcode eintippen …" />
      )}
      {scanMsg && (
        <p className={cn("flex items-center gap-1.5 text-sm", scanMsg.ok ? "text-status-verfuegbar" : "text-status-defekt")}>
          {scanMsg.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          {scanMsg.text}
        </p>
      )}

      {outItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-status-verfuegbar">
          Alles zurückgegeben. 🎉
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-muted">Noch beim Kunden: {outQty}×</p>
          <div className="space-y-2">
            {outItems.map((item) => (
              <RueckgabeRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                onQuickReturn={() =>
                  returnItem.mutate({
                    id: item.id,
                    jobId: job.id,
                    returnedOk: quantityStillOut(item),
                    damaged: 0,
                    missing: 0,
                    locationId,
                  })
                }
                onDetailedReturn={() => setReturnFor(item)}
              />
            ))}
          </div>
        </>
      )}

      {returnFor && (
        <ReturnDialog
          open={!!returnFor}
          onClose={() => setReturnFor(null)}
          deviceName={returnFor.device?.name ?? "Gerät"}
          maxQuantity={quantityStillOut(returnFor)}
          onSubmit={(ok, dmg, miss, notes) => {
            returnItem.mutate({
              id: returnFor.id,
              jobId: job.id,
              returnedOk: ok,
              damaged: dmg,
              missing: miss,
              damageNotes: notes,
              locationId,
            });
            setReturnFor(null);
          }}
        />
      )}
    </div>
  );
}

function RueckgabeRow({
  item,
  canEdit,
  onQuickReturn,
  onDetailedReturn,
}: {
  item: PacklistItem;
  canEdit: boolean;
  onQuickReturn: () => void;
  onDetailedReturn: () => void;
}) {
  const stillOut = quantityStillOut(item);
  return (
    <div className="rounded-lg border border-border bg-bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-ink">{item.device?.name}</p>
            {item.quantity > 1 && <span className="shrink-0 font-mono text-xs text-accent">{stillOut}× offen</span>}
          </div>
          {(item.quantity_returned_ok > 0 || item.quantity_damaged > 0 || item.quantity_missing > 0) && (
            <p className="mt-0.5 text-xs text-ink-muted">
              {item.quantity_returned_ok > 0 && `zurück OK: ${item.quantity_returned_ok}× `}
              {item.quantity_damaged > 0 && `· defekt: ${item.quantity_damaged}× `}
              {item.quantity_missing > 0 && `· fehlend: ${item.quantity_missing}×`}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onQuickReturn}>
              <PackageCheck size={14} />
              Intakt zurück
            </Button>
            <Button size="sm" variant="ghost" onClick={onDetailedReturn} title="Defekt/fehlend erfassen">
              <PackageX size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hilfs-Komponenten ────────────────────────────────────────────────────────

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-ink-muted">
        <span>{label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-status-verfuegbar transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">{text}</p>
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
