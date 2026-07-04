import type {
  Customer,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  Job,
  PacklistItem,
} from "@/types/database";
import { invoiceDerivedStatus, invoicePaidSum, offerTotals } from "@/types/database";

// ============================================================
// Auswertungen — reine Aggregationslogik (getestet in reports.test.ts)
//
// Bewusst schmale Eingabetypen (Picks statt voller Entitäten): die Hooks liefern
// vollständige Invoice/Job-Objekte, die strukturell passen, und die Tests kommen
// ohne riesige Fixture-Objekte aus. Umsatz zählt nur für GESTELLTE Rechnungen
// (Entwurf/Storno nie), Stichtag ist das Rechnungsdatum; Zahlungseingang zählt
// nach Zahldatum. Jobs zählen ohne Storno/Papierkorb, Stichtag Startdatum.
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportInvoice = Pick<
  Invoice,
  "status" | "invoice_date" | "due_date" | "tax_rate" | "customer_id"
> & {
  items?: Pick<InvoiceItem, "quantity" | "rental_days" | "unit_price">[];
  payments?: Pick<InvoicePayment, "amount" | "paid_at">[];
  customer?: Pick<Customer, "company_name" | "first_name" | "last_name"> | null;
};

export type ReportJob = Pick<Job, "status" | "start_date" | "end_date" | "deleted_at"> & {
  packlist_items?: Pick<PacklistItem, "device_id" | "quantity">[];
};

// ------------------------------------------------------------
// Monats-Eimer für Zeitreihen
// ------------------------------------------------------------

export interface MonthBucket {
  year: number;
  /** 0–11 (wie Date#getMonth). */
  month: number;
  /** Achsen-Label; am Jahresanfang bzw. beim ältesten Eimer mit Jahreszahl. */
  label: string;
}

const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** Die letzten `count` Monate inklusive des laufenden, älteste zuerst. */
export function lastMonths(count: number, now: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const withYear = d.getMonth() === 0 || i === count - 1;
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: withYear ? `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` : MONTH_LABELS[d.getMonth()],
    });
  }
  return buckets;
}

/** Index des Eimers, in den das Datum fällt — -1 wenn außerhalb/ungültig. */
function bucketIndex(buckets: MonthBucket[], iso: string | null | undefined): number {
  if (!iso) return -1;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return -1;
  return buckets.findIndex((b) => b.year === d.getFullYear() && b.month === d.getMonth());
}

// ------------------------------------------------------------
// Finanzen
// ------------------------------------------------------------

function isIssued(inv: Pick<Invoice, "status" | "invoice_date">): boolean {
  return inv.status === "gestellt" && !!inv.invoice_date;
}

/** Bruttobetrag einer Rechnung aus ihren Positionen. */
export function invoiceGross(inv: Pick<ReportInvoice, "items" | "tax_rate">): number {
  return offerTotals(inv.items ?? [], inv.tax_rate).gross;
}

/** Gestellter Brutto-Umsatz je Monat (nach Rechnungsdatum). */
export function revenueByMonth(invoices: ReportInvoice[], buckets: MonthBucket[]): number[] {
  const values = buckets.map(() => 0);
  for (const inv of invoices) {
    if (!isIssued(inv)) continue;
    const i = bucketIndex(buckets, inv.invoice_date);
    if (i >= 0) values[i] += invoiceGross(inv);
  }
  return values;
}

/** Zahlungseingang je Monat (nach Zahldatum; Entwürfe haben keine Zahlungen). */
export function paymentsByMonth(invoices: ReportInvoice[], buckets: MonthBucket[]): number[] {
  const values = buckets.map(() => 0);
  for (const inv of invoices) {
    if (inv.status === "entwurf") continue;
    for (const p of inv.payments ?? []) {
      const i = bucketIndex(buckets, p.paid_at);
      if (i >= 0) values[i] += p.amount;
    }
  }
  return values;
}

export interface FinanceSummary {
  /** Gestellter Umsatz im laufenden Jahr. */
  issuedGrossYear: number;
  issuedNetYear: number;
  issuedCountYear: number;
  /** Zahlungseingang im laufenden Jahr. */
  paidYear: number;
  /** Aktuell offen über alle gestellten Rechnungen (Stand jetzt). */
  openTotal: number;
  openCount: number;
  /** Davon überfällig (Stand jetzt). */
  overdueTotal: number;
  overdueCount: number;
}

export function financeSummary(invoices: ReportInvoice[], now: Date = new Date()): FinanceSummary {
  const year = now.getFullYear();
  const summary: FinanceSummary = {
    issuedGrossYear: 0,
    issuedNetYear: 0,
    issuedCountYear: 0,
    paidYear: 0,
    openTotal: 0,
    openCount: 0,
    overdueTotal: 0,
    overdueCount: 0,
  };

  for (const inv of invoices) {
    if (inv.status === "entwurf") continue;

    for (const p of inv.payments ?? []) {
      if (new Date(p.paid_at).getFullYear() === year) summary.paidYear += p.amount;
    }

    if (inv.status !== "gestellt") continue;
    const totals = offerTotals(inv.items ?? [], inv.tax_rate);
    if (inv.invoice_date && new Date(inv.invoice_date).getFullYear() === year) {
      summary.issuedGrossYear += totals.gross;
      summary.issuedNetYear += totals.net;
      summary.issuedCountYear += 1;
    }

    const open = Math.max(0, totals.gross - invoicePaidSum(inv.payments));
    if (open > 0.005) {
      summary.openTotal += open;
      summary.openCount += 1;
      if (invoiceDerivedStatus(inv, inv.items, inv.payments, now) === "ueberfaellig") {
        summary.overdueTotal += open;
        summary.overdueCount += 1;
      }
    }
  }
  return summary;
}

// ------------------------------------------------------------
// Jobs & Geräte
// ------------------------------------------------------------

function countsAsJob(job: Pick<Job, "status" | "deleted_at">): boolean {
  return job.status !== "storniert" && !job.deleted_at;
}

/** Jobs je Monat (nach Startdatum; ohne Storno/Papierkorb). */
export function jobsByMonth(jobs: ReportJob[], buckets: MonthBucket[]): number[] {
  const values = buckets.map(() => 0);
  for (const job of jobs) {
    if (!countsAsJob(job)) continue;
    const i = bucketIndex(buckets, job.start_date);
    if (i >= 0) values[i] += 1;
  }
  return values;
}

/** Belegte Tage eines Jobs — beide Randtage zählen mit (tagesbasierte Jobs). */
export function jobDurationDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
  const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
  return Math.max(0, Math.round((endDay - startDay) / DAY_MS) + 1);
}

export interface TopDevice {
  deviceId: string;
  /** Summe der gebuchten Stück über alle Jobs im Zeitraum. */
  bookedQuantity: number;
  /** Gerätetage = Stück × Jobdauer, aufsummiert — das Auslastungsmaß. */
  deviceDays: number;
  jobCount: number;
}

/** Meistgebuchte Geräte aus den Packlisten der Jobs, deren Ende ≥ `from` liegt. */
export function topDevices(jobs: ReportJob[], from: Date, limit: number): TopDevice[] {
  const map = new Map<string, TopDevice>();
  for (const job of jobs) {
    if (!countsAsJob(job)) continue;
    if (new Date(job.end_date).getTime() < from.getTime()) continue;
    const days = jobDurationDays(job.start_date, job.end_date);
    for (const item of job.packlist_items ?? []) {
      const entry = map.get(item.device_id) ?? {
        deviceId: item.device_id,
        bookedQuantity: 0,
        deviceDays: 0,
        jobCount: 0,
      };
      entry.bookedQuantity += item.quantity;
      entry.deviceDays += item.quantity * days;
      entry.jobCount += 1;
      map.set(item.device_id, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.deviceDays - a.deviceDays).slice(0, limit);
}

export interface TopCustomer {
  customerId: string;
  name: string;
  gross: number;
  invoiceCount: number;
}

/** Kunden mit dem meisten gestellten Umsatz ab `from` (nach Rechnungsdatum). */
export function topCustomers(invoices: ReportInvoice[], from: Date, limit: number): TopCustomer[] {
  const map = new Map<string, TopCustomer>();
  for (const inv of invoices) {
    if (!isIssued(inv) || !inv.customer_id) continue;
    const date = inv.invoice_date;
    if (!date || new Date(date).getTime() < from.getTime()) continue;
    const c = inv.customer;
    const name =
      c?.company_name || [c?.first_name, c?.last_name].filter(Boolean).join(" ") || "Unbekannter Kunde";
    const entry = map.get(inv.customer_id) ?? {
      customerId: inv.customer_id,
      name,
      gross: 0,
      invoiceCount: 0,
    };
    entry.gross += invoiceGross(inv);
    entry.invoiceCount += 1;
    map.set(inv.customer_id, entry);
  }
  return [...map.values()].sort((a, b) => b.gross - a.gross).slice(0, limit);
}
