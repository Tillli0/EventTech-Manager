import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, FileUp, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateField";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useDevices } from "@/hooks/useDevices";
import {
  useCreateSubrental,
  useUpdateSubrental,
  type SubrentalItemInput,
} from "@/hooks/useSubrentals";
import { useExtractSubrentalDocument } from "@/hooks/useExtractSubrentalDocument";
import { useUploadDocument } from "@/hooks/useDocuments";
import { subrentalTotals, SUBRENTAL_LOGISTICS_OPTIONS, SUBRENTAL_STATUS_OPTIONS } from "@/lib/subrentals";
import { formatCurrency } from "@/lib/format";
import type { Subrental, SubrentalLogistics, SubrentalStatus } from "@/types/database";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface DraftItem extends SubrentalItemInput {
  /** lokale Zeilen-ID nur fürs Rendering */
  key: string;
}

let draftKeySeq = 0;
function nextKey() {
  return `subrental-item-${draftKeySeq++}`;
}

export function CreateSubrentalDialog({
  open,
  onClose,
  jobId,
  editSubrental,
  presetItem,
}: {
  open: boolean;
  onClose: () => void;
  /** Der Job, dem der neue Anmiet-Vorgang zugeordnet wird. */
  jobId: string;
  /** Wenn gesetzt: Dialog bearbeitet diesen Vorgang statt einen neuen anzulegen. */
  editSubrental?: Subrental;
  /** Vorbefüllte erste Position, z.B. aus der Packlisten-Fehlmenge übernommen. */
  presetItem?: SubrentalItemInput;
}) {
  const { data: suppliers } = useSuppliers();
  const { data: devices } = useDevices();
  const createSubrental = useCreateSubrental();
  const updateSubrental = useUpdateSubrental();
  const extractDocument = useExtractSubrentalDocument();
  const uploadDocument = useUploadDocument();
  const isEdit = !!editSubrental;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [supplierId, setSupplierId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logistics, setLogistics] = useState<SubrentalLogistics>("abholung");
  const [status, setStatus] = useState<SubrentalStatus>("entwurf");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [deviceToAdd, setDeviceToAdd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // Datei bleibt bis zum Speichern im State — wird danach am Vorgang archiviert
  // (dieselbe Datei, die zur Erkennung hochgeladen wurde, oder eine ohne Erkennung
  // angehängte). Rein clientseitig, kein serverseitiger Zwischenspeicher nötig.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedSupplierMissing, setExtractedSupplierMissing] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editSubrental) {
      setSupplierId(editSubrental.supplier_id);
      setStartDate(editSubrental.start_date);
      setEndDate(editSubrental.end_date);
      setLogistics(editSubrental.logistics);
      setStatus(editSubrental.status);
      setNotes(editSubrental.notes ?? "");
      setItems(
        [...(editSubrental.items ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((it) => ({
            key: nextKey(),
            device_id: it.device_id,
            description: it.description,
            quantity: it.quantity,
            unit_cost: it.unit_cost,
          })),
      );
    } else {
      setSupplierId("");
      setStartDate("");
      setEndDate("");
      setLogistics("abholung");
      setStatus("entwurf");
      setNotes("");
      setItems(presetItem ? [{ ...presetItem, key: nextKey() }] : []);
    }
    setDeviceToAdd("");
    setFormError(null);
    setPendingFile(null);
    setExtractError(null);
    setExtractedSupplierMissing(null);
  }, [open, editSubrental, presetItem]);

  const totals = subrentalTotals(items);

  async function handleFileSelected(file: File) {
    setPendingFile(file);
    setExtractError(null);
    setExtractedSupplierMissing(null);
    try {
      const extracted = await extractDocument.mutateAsync(file);

      if (extracted.supplier_name_guess) {
        const guess = extracted.supplier_name_guess.trim().toLowerCase();
        const match = suppliers?.find(
          (s) => s.name.toLowerCase().includes(guess) || guess.includes(s.name.toLowerCase()),
        );
        if (match) setSupplierId(match.id);
        else setExtractedSupplierMissing(extracted.supplier_name_guess);
      }
      if (extracted.start_date_guess && ISO_DATE.test(extracted.start_date_guess)) {
        setStartDate(extracted.start_date_guess);
      }
      if (extracted.end_date_guess && ISO_DATE.test(extracted.end_date_guess)) {
        setEndDate(extracted.end_date_guess);
      }
      if (extracted.items.length > 0) {
        setItems(
          extracted.items.map((it) => ({
            key: nextKey(),
            device_id: null,
            description: it.description,
            quantity: Math.max(1, Math.round(it.quantity) || 1),
            unit_cost: Math.max(0, it.unit_cost || 0),
          })),
        );
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Erkennung fehlgeschlagen.");
    }
  }

  function addDevice() {
    if (!deviceToAdd) return;
    const device = devices?.find((d) => d.id === deviceToAdd);
    if (!device) return;
    setItems((prev) => [...prev, { key: nextKey(), device_id: device.id, description: device.name, quantity: 1, unit_cost: 0 }]);
    setDeviceToAdd("");
  }

  function addFreeItem() {
    setItems((prev) => [...prev, { key: nextKey(), device_id: null, description: "", quantity: 1, unit_cost: 0 }]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!supplierId) {
      setFormError("Bitte einen Verleih-Partner wählen.");
      return;
    }
    if (!startDate || !endDate) {
      setFormError("Bitte Start- und Enddatum festlegen.");
      return;
    }
    if (endDate < startDate) {
      setFormError("Das Enddatum darf nicht vor dem Startdatum liegen.");
      return;
    }
    if (items.some((item) => !item.description.trim())) {
      setFormError("Jede Position braucht eine Bezeichnung.");
      return;
    }

    const payloadItems = items.map(({ key: _key, ...rest }) => ({ ...rest, description: rest.description.trim() }));

    try {
      let savedId: string;
      if (editSubrental) {
        const saved = await updateSubrental.mutateAsync({
          id: editSubrental.id,
          job_id: jobId,
          supplier_id: supplierId,
          start_date: startDate,
          end_date: endDate,
          logistics,
          status,
          notes: notes.trim() || null,
          items: payloadItems,
        });
        savedId = saved.id;
      } else {
        const saved = await createSubrental.mutateAsync({
          job_id: jobId,
          supplier_id: supplierId,
          start_date: startDate,
          end_date: endDate,
          logistics,
          notes: notes.trim() || null,
          items: payloadItems,
        });
        savedId = saved.id;
      }

      // Hochgeladenes Verleiher-PDF am Vorgang archivieren — best-effort: der
      // Anmiet-Vorgang bleibt gültig, auch wenn die Archivierung scheitert (D4-Muster).
      if (pendingFile) {
        try {
          await uploadDocument.mutateAsync({
            entityType: "subrental",
            entityId: savedId,
            file: pendingFile,
            title: pendingFile.name,
            category: "eingangsrechnung",
          });
        } catch (archiveErr) {
          console.warn("Verleiher-Dokument konnte nicht archiviert werden:", archiveErr);
        }
      }

      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Anmiet-Vorgang konnte nicht gespeichert werden.");
    }
  }

  const isPending = createSubrental.isPending || updateSubrental.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Anmiet-Vorgang bearbeiten" : "Neuer Anmiet-Vorgang"}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <Sparkles size={15} className="text-accent" />
              Verleiher-Angebot oder -Rechnung hochladen
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileSelected(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={extractDocument.isPending}
            >
              <FileUp size={14} />
              {extractDocument.isPending ? "Wird gelesen …" : "PDF wählen"}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Positionen, Partner und Zeitraum werden automatisch vorgeschlagen — bitte kurz prüfen, bevor du speicherst.
          </p>
          {pendingFile && !extractError && (
            <p className="mt-1.5 text-xs text-status-verfuegbar">
              „{pendingFile.name}" wird beim Speichern am Vorgang abgelegt.
            </p>
          )}
          {extractedSupplierMissing && (
            <p className="mt-1.5 text-xs text-status-wartung">
              Partner „{extractedSupplierMissing}" wurde im Dokument erkannt, ist aber kein bestehender
              Verleih-Partner — bitte manuell wählen oder zuerst unter „Verleih-Partner" anlegen.
            </p>
          )}
          {extractError && (
            <p className="mt-1.5 text-xs text-status-defekt">{extractError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Verleih-Partner *">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Partner wählen …</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Logistik">
            <Select value={logistics} onChange={(e) => setLogistics(e.target.value as SubrentalLogistics)}>
              {SUBRENTAL_LOGISTICS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Von *">
            <DateInput value={startDate} onChange={setStartDate} placeholder="Startdatum" />
          </FormField>
          <FormField label="Bis *">
            <DateInput value={endDate} onChange={setEndDate} placeholder="Enddatum" />
          </FormField>
        </div>

        {isEdit && (
          <FormField label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as SubrentalStatus)}>
              {SUBRENTAL_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {/* Positionen */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink-muted">Positionen</p>
          <div className="mb-3 flex gap-2">
            <Select value={deviceToAdd} onChange={(e) => setDeviceToAdd(e.target.value)} className="flex-1">
              <option value="">Gerät aus Inventar wählen …</option>
              {devices?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Button type="button" variant="secondary" onClick={addDevice} disabled={!deviceToAdd}>
              <Plus size={16} />
              Hinzufügen
            </Button>
            <Button type="button" variant="ghost" onClick={addFreeItem}>
              Freie Position
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
              Noch keine Positionen. Gerät aus dem Inventar wählen oder eine freie Position anlegen.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-xs text-ink-faint">
                <span className="flex-1">Bezeichnung</span>
                <span className="w-16 text-right">Menge</span>
                <span className="w-28 text-right">EK je Stück</span>
                <span className="w-24 text-right">Summe</span>
                <span className="w-8" />
              </div>
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.key, { description: e.target.value })}
                    placeholder="Bezeichnung"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-16 text-right"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(item.key, { unit_cost: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-28 text-right"
                  />
                  <span className="w-24 text-right text-sm font-mono text-ink">
                    {formatCurrency(item.unit_cost * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-status-defekt"
                    aria-label="Position entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between border-t border-border pt-1 font-semibold text-ink">
            <span>Einkauf gesamt (netto)</span>
            <span className="font-mono">{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>

        {formError && (
          <div className="rounded-md border border-status-defekt/40 bg-status-defekt/10 px-3 py-2 text-sm text-status-defekt">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Wird gespeichert …" : isEdit ? "Änderungen speichern" : "Vorgang speichern"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
