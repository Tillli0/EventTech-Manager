import type { Invoice, InvoiceDunning, InvoiceItem, InvoicePayment } from "@/types/database";
import { DUNNING_LEVEL_LABELS, invoicePaidSum, offerTotals } from "@/types/database";

// ============================================================
// Verlaufs-Zeitstrahl einer Rechnung — komplett aus vorhandenen Daten
// abgeleitet (kein Schema nötig): erstellt → gestellt → Zahlungen/Mahnungen
// → vollständig bezahlt bzw. storniert. Pure Logik, getestet in
// invoiceTimeline.test.ts; formatiert wird erst in der UI.
// ============================================================

export type TimelineKind = "erstellt" | "gestellt" | "zahlung" | "mahnung" | "bezahlt" | "storniert";

export interface TimelineEvent {
  kind: TimelineKind;
  /** ISO-Zeitpunkt des Ereignisses (für Sortierung + Anzeige). */
  at: string;
  label: string;
  /** Zusatzzeile, z.B. Zahlungsart oder Rechnungsnummer. */
  detail?: string;
  /** Betrag in EUR (Zahlungen, Bezahlt-Meilenstein); UI formatiert. */
  amount?: number;
}

export type TimelineInvoice = Pick<
  Invoice,
  "status" | "invoice_number" | "invoice_date" | "created_at" | "updated_at" | "tax_rate"
> & {
  items?: Pick<InvoiceItem, "quantity" | "rental_days" | "unit_price">[];
  payments?: Pick<InvoicePayment, "amount" | "paid_at" | "method">[];
  dunnings?: Pick<InvoiceDunning, "level" | "sent_at" | "to_email">[];
};

/** Ereignisse chronologisch aufsteigend (ältestes zuerst). */
export function invoiceTimeline(inv: TimelineInvoice): TimelineEvent[] {
  const events: TimelineEvent[] = [{ kind: "erstellt", at: inv.created_at, label: "Entwurf erstellt" }];

  if (inv.invoice_number) {
    events.push({
      kind: "gestellt",
      at: inv.invoice_date ?? inv.created_at,
      label: "Rechnung gestellt",
      detail: inv.invoice_number,
    });
  }

  for (const p of inv.payments ?? []) {
    events.push({
      kind: "zahlung",
      at: p.paid_at,
      label: "Zahlung eingegangen",
      detail: p.method ?? undefined,
      amount: p.amount,
    });
  }

  for (const d of inv.dunnings ?? []) {
    events.push({
      kind: "mahnung",
      at: d.sent_at,
      label: `${DUNNING_LEVEL_LABELS[d.level] ?? `Mahnstufe ${d.level}`} versendet`,
      detail: `an ${d.to_email}`,
    });
  }

  const { gross } = offerTotals(inv.items ?? [], inv.tax_rate);
  const paid = invoicePaidSum(inv.payments);
  if (inv.status === "gestellt" && gross > 0 && paid >= gross - 0.005) {
    const lastPayment = (inv.payments ?? []).reduce<string | null>(
      (latest, p) => (latest === null || p.paid_at > latest ? p.paid_at : latest),
      null,
    );
    events.push({
      kind: "bezahlt",
      at: lastPayment ?? inv.updated_at,
      label: "Vollständig bezahlt",
      amount: gross,
    });
  }

  if (inv.status === "storniert") {
    events.push({ kind: "storniert", at: inv.updated_at, label: "Storniert" });
  }

  // Chronologisch aufsteigend; bei gleichem Zeitpunkt bleibt die Einfüge-
  // Reihenfolge erhalten (Array#sort ist stabil).
  return events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
