import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateField";
import { useToast } from "@/components/ui/Toast";
import { useAddInvoicePayment, useDeleteInvoicePayment } from "@/hooks/useInvoices";
import { offerTotals, invoicePaidSum, type Invoice } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/format";

const PAYMENT_METHODS = ["Überweisung", "Bar", "PayPal", "Sonstiges"];

/** Zahlungen einer Rechnung erfassen/ansehen. Betrag ist mit dem offenen Rest vorbelegt. */
export function PaymentDialog({
  invoice,
  open,
  onClose,
  canEdit,
}: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}) {
  const addPayment = useAddInvoicePayment();
  const deletePayment = useDeleteInvoicePayment();
  const toast = useToast();

  const { gross } = offerTotals(invoice.items ?? [], invoice.tax_rate);
  const paid = invoicePaidSum(invoice.payments);
  const openAmount = Math.max(0, gross - paid);

  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);

  useEffect(() => {
    if (!open) return;
    setAmount(openAmount > 0 ? openAmount.toFixed(2) : "");
    setPaidAt(new Date().toISOString().slice(0, 10));
    setMethod(PAYMENT_METHODS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Bitte einen gültigen Betrag eingeben.");
      return;
    }
    try {
      await addPayment.mutateAsync({
        invoice_id: invoice.id,
        amount: value,
        paid_at: paidAt || new Date().toISOString().slice(0, 10),
        method,
      });
      toast.success("Zahlung erfasst.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zahlung konnte nicht erfasst werden.");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Zahlungen — ${invoice.invoice_number ?? "Entwurf"}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-bg-raised px-4 py-3 text-center text-sm">
          <div>
            <p className="text-xs text-ink-faint">Rechnungsbetrag</p>
            <p className="font-mono font-medium text-ink">{formatCurrency(gross)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Gezahlt</p>
            <p className="font-mono font-medium text-status-verfuegbar">{formatCurrency(paid)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Offen</p>
            <p className="font-mono font-medium text-ink">{formatCurrency(openAmount)}</p>
          </div>
        </div>

        {(invoice.payments?.length ?? 0) > 0 && (
          <div className="space-y-1.5">
            {invoice.payments!.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-ink-muted">
                  {formatDate(p.paid_at)}
                  {p.method ? ` · ${p.method}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-ink">{formatCurrency(p.amount)}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => deletePayment.mutate(p.id)}
                      className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:text-status-defekt"
                      aria-label="Zahlung löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {canEdit && invoice.status === "gestellt" && (
          <form onSubmit={handleAdd} className="space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-3 gap-2">
              <FormField label="Betrag (€)">
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </FormField>
              <FormField label="Datum">
                <DateInput value={paidAt} onChange={setPaidAt} />
              </FormField>
              <FormField label="Zahlungsart">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={addPayment.isPending}>
                {addPayment.isPending ? "Wird gespeichert …" : "Zahlung erfassen"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
