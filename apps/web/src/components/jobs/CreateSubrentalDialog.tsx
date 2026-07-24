import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { subrentalTotals, SUBRENTAL_LOGISTICS_OPTIONS, SUBRENTAL_STATUS_OPTIONS } from "@/lib/subrentals";
import { formatCurrency } from "@/lib/format";
import type { Subrental, SubrentalLogistics, SubrentalStatus } from "@/types/database";

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
}: {
  open: boolean;
  onClose: () => void;
  /** Der Job, dem der neue Anmiet-Vorgang zugeordnet wird. */
  jobId: string;
  /** Wenn gesetzt: Dialog bearbeitet diesen Vorgang statt einen neuen anzulegen. */
  editSubrental?: Subrental;
}) {
  const { data: suppliers } = useSuppliers();
  const { data: devices } = useDevices();
  const createSubrental = useCreateSubrental();
  const updateSubrental = useUpdateSubrental();
  const isEdit = !!editSubrental;

  const [supplierId, setSupplierId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logistics, setLogistics] = useState<SubrentalLogistics>("abholung");
  const [status, setStatus] = useState<SubrentalStatus>("entwurf");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [deviceToAdd, setDeviceToAdd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
      setItems([]);
    }
    setDeviceToAdd("");
    setFormError(null);
  }, [open, editSubrental]);

  const totals = subrentalTotals(items);

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
      if (editSubrental) {
        await updateSubrental.mutateAsync({
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
      } else {
        await createSubrental.mutateAsync({
          job_id: jobId,
          supplier_id: supplierId,
          start_date: startDate,
          end_date: endDate,
          logistics,
          notes: notes.trim() || null,
          items: payloadItems,
        });
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
