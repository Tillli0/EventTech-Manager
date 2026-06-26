import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateField";
import { useCustomers, useInquiries } from "@/hooks/useCustomers";
import { useDevices } from "@/hooks/useDevices";
import { useCreateOffer, type CreateOfferItemInput } from "@/hooks/useOffers";
import { offerTotals } from "@/types/database";
import { formatCurrency } from "@/lib/format";

interface DraftItem extends CreateOfferItemInput {
  /** lokale Zeilen-ID nur fürs Rendering */
  key: string;
}

let draftKeySeq = 0;
function nextKey() {
  return `item-${draftKeySeq++}`;
}

export function CreateOfferDialog({
  open,
  onClose,
  presetCustomerId,
  presetInquiryId,
  presetTitle,
  presetItems,
}: {
  open: boolean;
  onClose: () => void;
  presetCustomerId?: string;
  presetInquiryId?: string;
  presetTitle?: string;
  /** Vorbefüllte Positionen, z.B. aus einer Job-Packliste übernommen. */
  presetItems?: CreateOfferItemInput[];
}) {
  const { data: customers } = useCustomers();
  const { data: inquiries } = useInquiries();
  const { data: devices } = useDevices();
  const createOffer = useCreateOffer();

  const [customerId, setCustomerId] = useState(presetCustomerId ?? "");
  const [inquiryId, setInquiryId] = useState(presetInquiryId ?? "");
  const [title, setTitle] = useState(presetTitle ?? "");
  const [validUntil, setValidUntil] = useState("");
  const [taxRate, setTaxRate] = useState("19");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [deviceToAdd, setDeviceToAdd] = useState("");
  const [bulkDays, setBulkDays] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function applyDaysToAll() {
    const d = Math.max(1, parseInt(bulkDays, 10) || 1);
    setItems((prev) => prev.map((it) => ({ ...it, rental_days: d })));
  }

  useEffect(() => {
    if (open) {
      setCustomerId(presetCustomerId ?? "");
      setInquiryId(presetInquiryId ?? "");
      setTitle(presetTitle ?? "");
      setValidUntil("");
      setTaxRate("19");
      setNotes("");
      setItems(presetItems ? presetItems.map((it) => ({ ...it, key: nextKey() })) : []);
      setDeviceToAdd("");
      setBulkDays("");
      setFormError(null);
    }
  }, [open, presetCustomerId, presetInquiryId, presetTitle, presetItems]);

  const customerInquiries = useMemo(
    () => (inquiries ?? []).filter((inq) => inq.customer_id === customerId),
    [inquiries, customerId],
  );

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

    try {
      await createOffer.mutateAsync({
        customer_id: customerId || null,
        inquiry_id: inquiryId || null,
        title: title.trim(),
        valid_until: validUntil || null,
        tax_rate: parsedTax,
        notes: notes.trim() || null,
        items: items.map(({ key: _key, ...rest }) => ({ ...rest, description: rest.description.trim() })),
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Angebot konnte nicht gespeichert werden.");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Angebot erstellen" maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kunde">
            <Select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setInquiryId("");
              }}
            >
              <option value="">Kein Kunde</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Zugehörige Anfrage" hint="Wird automatisch auf „Angebot gesendet“ gesetzt.">
            <Select value={inquiryId} onChange={(e) => setInquiryId(e.target.value)} disabled={!customerId}>
              <option value="">Keine</option>
              {customerInquiries.map((inq) => (
                <option key={inq.id} value={inq.id}>
                  {inq.title}
                </option>
              ))}
            </Select>
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
          <FormField label="Gültig bis">
            <DateInput value={validUntil} onChange={setValidUntil} placeholder="Datum wählen" />
          </FormField>
          <FormField label="MwSt-Satz (%)">
            <Input type="number" min={0} step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </FormField>
        </div>

        {/* Positionen */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-muted">Positionen</p>
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted">Tage für alle:</span>
                <Input
                  type="number"
                  min={1}
                  value={bulkDays}
                  onChange={(e) => setBulkDays(e.target.value)}
                  placeholder="z.B. 3"
                  className="w-20 text-right"
                />
                <Button type="button" variant="secondary" onClick={applyDaysToAll} disabled={!bulkDays.trim()}>
                  Übernehmen
                </Button>
              </div>
            )}
          </div>
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
                    min={1}
                    value={item.rental_days}
                    onChange={(e) =>
                      updateItem(item.key, { rental_days: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                    className="w-16 text-right"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.key, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-24 text-right"
                  />
                  <span className="w-24 text-right text-sm font-mono text-ink">
                    {formatCurrency(item.unit_price * item.quantity * item.rental_days)}
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
          <Button type="submit" disabled={createOffer.isPending}>
            {createOffer.isPending ? "Wird gespeichert …" : "Angebot speichern"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
