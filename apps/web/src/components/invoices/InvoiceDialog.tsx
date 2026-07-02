import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateField";
import { useCustomers } from "@/hooks/useCustomers";
import { useDevices } from "@/hooks/useDevices";
import {
  useCreateInvoice,
  useUpdateInvoice,
  type CreateInvoiceInput,
  type CreateInvoiceItemInput,
} from "@/hooks/useInvoices";
import { offerTotals, type Invoice } from "@/types/database";
import { formatCurrency } from "@/lib/format";

interface DraftItem extends CreateInvoiceItemInput {
  /** lokale Zeilen-ID nur fürs Rendering */
  key: string;
}

let draftKeySeq = 0;
function nextKey() {
  return `inv-item-${draftKeySeq++}`;
}

/**
 * Rechnung anlegen/bearbeiten. Entwürfe sind frei editierbar; bei gestellten
 * Rechnungen sind die Positionen bewusst gesperrt (GoBD — Korrektur per Storno
 * + neue Rechnung), nur Fälligkeit/Notizen bleiben änderbar.
 */
export function InvoiceDialog({
  open,
  onClose,
  editInvoice,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  /** Wenn gesetzt: bestehende Rechnung bearbeiten statt neu anlegen. */
  editInvoice?: Invoice;
  /** Vorbefüllung (z.B. aus einem Angebot übernommen). */
  preset?: CreateInvoiceInput;
}) {
  const { data: customers } = useCustomers();
  const { data: devices } = useDevices();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const isEdit = !!editInvoice;
  const itemsLocked = isEdit && editInvoice!.status !== "entwurf";

  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [taxRate, setTaxRate] = useState("19");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [deviceToAdd, setDeviceToAdd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editInvoice) {
      setCustomerId(editInvoice.customer_id ?? "");
      setTitle(editInvoice.title);
      setDueDate(editInvoice.due_date ?? "");
      setServiceDate(editInvoice.service_date ?? "");
      setTaxRate(String(editInvoice.tax_rate ?? 19));
      setNotes(editInvoice.notes ?? "");
      setItems(
        [...(editInvoice.items ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((it) => ({
            key: nextKey(),
            device_id: it.device_id,
            description: it.description,
            quantity: it.quantity,
            rental_days: it.rental_days,
            unit_price: it.unit_price,
          })),
      );
    } else {
      setCustomerId(preset?.customer_id ?? "");
      setTitle(preset?.title ?? "");
      setDueDate(preset?.due_date ?? "");
      setServiceDate(preset?.service_date ?? "");
      setTaxRate(String(preset?.tax_rate ?? 19));
      setNotes(preset?.notes ?? "");
      setItems((preset?.items ?? []).map((it) => ({ ...it, key: nextKey() })));
    }
    setDeviceToAdd("");
    setFormError(null);
  }, [open, editInvoice, preset]);

  const parsedTax = Math.max(0, parseFloat(taxRate.replace(",", ".")) || 0);
  const totals = offerTotals(items, parsedTax);

  function addDevice() {
    if (!deviceToAdd) return;
    const device = devices?.find((d) => d.id === deviceToAdd);
    if (!device) return;
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        device_id: device.id,
        description: device.name,
        quantity: 1,
        rental_days: 1,
        unit_price: device.daily_rental_price ?? 0,
      },
    ]);
    setDeviceToAdd("");
  }

  function addFreeItem() {
    setItems((prev) => [
      ...prev,
      { key: nextKey(), device_id: null, description: "", quantity: 1, rental_days: 1, unit_price: 0 },
    ]);
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
    if (!title.trim()) {
      setFormError("Bitte einen Betreff/Titel eingeben.");
      return;
    }
    if (items.length === 0) {
      setFormError("Bitte mindestens eine Position hinzufügen.");
      return;
    }
    if (items.some((item) => !item.description.trim())) {
      setFormError("Jede Position braucht eine Bezeichnung.");
      return;
    }

    const payloadItems = items.map(({ key: _key, ...rest }) => ({ ...rest, description: rest.description.trim() }));

    try {
      if (editInvoice) {
        await updateInvoice.mutateAsync({
          id: editInvoice.id,
          customer_id: customerId || null,
          job_id: editInvoice.job_id ?? null,
          offer_id: editInvoice.offer_id ?? null,
          title: title.trim(),
          due_date: dueDate || null,
          service_date: serviceDate || null,
          tax_rate: parsedTax,
          notes: notes.trim() || null,
          items: payloadItems,
        });
      } else {
        await createInvoice.mutateAsync({
          customer_id: customerId || null,
          job_id: preset?.job_id ?? null,
          offer_id: preset?.offer_id ?? null,
          title: title.trim(),
          due_date: dueDate || null,
          service_date: serviceDate || null,
          tax_rate: parsedTax,
          notes: notes.trim() || null,
          items: payloadItems,
        });
      }
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Rechnung konnte nicht gespeichert werden.");
    }
  }

  const isPending = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Rechnung ${editInvoice?.invoice_number ?? "(Entwurf)"} bearbeiten` : "Rechnung erstellen"}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kunde">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={itemsLocked}>
              <option value="">Kein Kunde</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="MwSt-Satz (%)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              disabled={itemsLocked}
            />
          </FormField>
        </div>

        <FormField label="Betreff *">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Tontechnik Sommerfest 2026"
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Leistungs-/Eventdatum">
            <DateInput value={serviceDate} onChange={setServiceDate} placeholder="Datum wählen" />
          </FormField>
          <FormField label="Zahlbar bis">
            <DateInput value={dueDate} onChange={setDueDate} placeholder="Datum wählen" />
          </FormField>
        </div>

        {/* Positionen */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink-muted">Positionen</p>
          {itemsLocked ? (
            <p className="mb-3 rounded-md border border-border bg-bg-raised px-3 py-2 text-xs text-ink-muted">
              Die Rechnung ist gestellt — Positionen sind fixiert. Für inhaltliche Korrekturen bitte
              stornieren und eine neue Rechnung stellen.
            </p>
          ) : (
            <div className="mb-3 flex gap-2">
              <Select value={deviceToAdd} onChange={(e) => setDeviceToAdd(e.target.value)} className="flex-1">
                <option value="">Gerät aus Inventar wählen …</option>
                {devices?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.daily_rental_price != null ? ` — ${formatCurrency(d.daily_rental_price)}/Tag` : ""}
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
          )}

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
              Noch keine Positionen. Gerät aus dem Inventar wählen oder eine freie Position anlegen.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-xs text-ink-faint">
                <span className="flex-1">Bezeichnung</span>
                <span className="w-16 text-right">Menge</span>
                <span className="w-16 text-right">Tage</span>
                <span className="w-24 text-right">€/Tag</span>
                <span className="w-24 text-right">Summe</span>
                {!itemsLocked && <span className="w-8" />}
              </div>
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.key, { description: e.target.value })}
                    placeholder="Bezeichnung"
                    className="flex-1"
                    disabled={itemsLocked}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-16 text-right"
                    disabled={itemsLocked}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.rental_days}
                    onChange={(e) =>
                      updateItem(item.key, { rental_days: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                    className="w-16 text-right"
                    disabled={itemsLocked}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.key, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-24 text-right"
                    disabled={itemsLocked}
                  />
                  <span className="w-24 text-right font-mono text-sm text-ink">
                    {formatCurrency(item.unit_price * item.quantity * item.rental_days)}
                  </span>
                  {!itemsLocked && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-status-defekt"
                      aria-label="Position entfernen"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summen */}
        <div className="ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Netto</span>
            <span className="font-mono">{formatCurrency(totals.net)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>zzgl. {parsedTax} % MwSt.</span>
            <span className="font-mono">{formatCurrency(totals.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold text-ink">
            <span>Gesamt</span>
            <span className="font-mono">{formatCurrency(totals.gross)}</span>
          </div>
        </div>

        <FormField label="Anmerkungen">
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
            {isPending ? "Wird gespeichert …" : isEdit ? "Änderungen speichern" : "Als Entwurf speichern"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
