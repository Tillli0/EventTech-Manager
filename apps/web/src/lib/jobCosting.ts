import type { Invoice, InvoiceItem, JobCost, Offer, OfferItem, Subrental, SubrentalItem } from "@/types/database";
import { offerTotals } from "@/types/database";
import { subrentalTotals, isActiveSubrentalStatus } from "@/lib/subrentals";
import { jobCostsTotal } from "@/lib/jobCosts";
import { isIssued } from "@/lib/reports";

export interface JobCosting {
  /** Erlös aus angenommenen Angeboten (netto). 0, wenn keins angenommen ist. */
  revenueQuoted: number;
  /** Erlös aus gestellten, nicht stornierten Rechnungen (netto). null, solange keine Rechnung gestellt ist. */
  revenueInvoiced: number | null;
  costSubrental: number;
  costPersonal: number;
  costOther: number;
  costTotal: number;
  marginQuoted: number;
  marginInvoiced: number | null;
  /** null, wenn revenueQuoted 0 ist (Division durch 0 vermeiden). */
  marginPctQuoted: number | null;
  /** null, wenn revenueInvoiced null oder 0 ist. */
  marginPctInvoiced: number | null;
}

/**
 * Kalkulation eines Jobs — zwei getrennte Erlös-Zahlen (Kalkuliert vs. Abgerechnet,
 * nie mischen), Kosten aus Anmiet-Vorgängen + Kosten-Positionen (E6). Alles netto.
 */
export function computeJobCosting(input: {
  offers: (Pick<Offer, "status" | "tax_rate"> & {
    items?: Pick<OfferItem, "quantity" | "rental_days" | "unit_price">[];
  })[];
  invoices: (Pick<Invoice, "status" | "invoice_date" | "tax_rate"> & {
    items?: Pick<InvoiceItem, "quantity" | "rental_days" | "unit_price">[];
  })[];
  subrentals: (Pick<Subrental, "status"> & { items?: Pick<SubrentalItem, "quantity" | "unit_cost">[] })[];
  costs: Pick<JobCost, "cost_type" | "amount">[];
}): JobCosting {
  const { offers, invoices, subrentals, costs } = input;

  const revenueQuoted = offers
    .filter((o) => o.status === "angenommen")
    .reduce((sum, o) => sum + offerTotals(o.items ?? [], o.tax_rate).net, 0);

  const issuedInvoices = invoices.filter(isIssued);
  const revenueInvoiced =
    issuedInvoices.length === 0
      ? null
      : issuedInvoices.reduce((sum, inv) => sum + offerTotals(inv.items ?? [], inv.tax_rate).net, 0);

  const costSubrental = subrentals
    .filter((s) => isActiveSubrentalStatus(s.status))
    .reduce((sum, s) => sum + subrentalTotals(s.items ?? []).total, 0);
  const costPersonal = jobCostsTotal(costs.filter((c) => c.cost_type === "personal"));
  const costOther = jobCostsTotal(costs.filter((c) => c.cost_type !== "personal"));
  const costTotal = costSubrental + costPersonal + costOther;

  const marginQuoted = revenueQuoted - costTotal;
  const marginInvoiced = revenueInvoiced == null ? null : revenueInvoiced - costTotal;

  return {
    revenueQuoted,
    revenueInvoiced,
    costSubrental,
    costPersonal,
    costOther,
    costTotal,
    marginQuoted,
    marginInvoiced,
    marginPctQuoted: revenueQuoted > 0 ? (marginQuoted / revenueQuoted) * 100 : null,
    marginPctInvoiced: revenueInvoiced != null && revenueInvoiced > 0 ? (marginInvoiced! / revenueInvoiced) * 100 : null,
  };
}
