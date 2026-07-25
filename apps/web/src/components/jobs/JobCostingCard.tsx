import { TrendingUp } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useOffersForJob } from "@/hooks/useOffers";
import { useInvoicesForJob } from "@/hooks/useInvoices";
import { useSubrentalsForJob } from "@/hooks/useSubrentals";
import { useJobCostsForJob } from "@/hooks/useJobCosts";
import { computeJobCosting } from "@/lib/jobCosting";
import { levelTone, marginLevel } from "@/lib/statusTone";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";

function formatPct(pct: number | null): string {
  return pct == null ? "—" : `${pct >= 0 ? "" : "−"}${Math.abs(Math.round(pct))} %`;
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={muted ? "text-ink-faint" : "text-ink-muted"}>{label}</span>
      <span className={`font-mono ${muted ? "text-ink-faint" : "text-ink"}`}>{value}</span>
    </div>
  );
}

/** Deckungsbeitrag des Jobs — Kalkuliert (angenommene Angebote) vs. Abgerechnet (gestellte Rechnungen). */
export function JobCostingCard({ jobId }: { jobId: string }) {
  const { hasArea } = useAuth();
  const { data: offers } = useOffersForJob(jobId);
  const { data: invoices } = useInvoicesForJob(jobId);
  const { data: subrentals } = useSubrentalsForJob(jobId);
  const { data: costs } = useJobCostsForJob(jobId);

  if (!hasArea("anmietung")) return null;

  const costing = computeJobCosting({
    offers: offers ?? [],
    invoices: invoices ?? [],
    subrentals: subrentals ?? [],
    costs: costs ?? [],
  });

  const quotedTone = levelTone(marginLevel(costing.marginPctQuoted));
  const invoicedTone = levelTone(marginLevel(costing.marginPctInvoiced));

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <TrendingUp size={14} />
          Kalkulation
        </h2>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Kalkuliert</p>
          <Row label="Erlös" value={formatCurrency(costing.revenueQuoted)} />
          <Row label="Anmietung" value={`− ${formatCurrency(costing.costSubrental)}`} muted />
          <Row label="Personal" value={`− ${formatCurrency(costing.costPersonal)}`} muted />
          <Row label="Sonstiges" value={`− ${formatCurrency(costing.costOther)}`} muted />
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-semibold text-ink">
            <span>Deckungsbeitrag</span>
            <span className="font-mono">{formatCurrency(costing.marginQuoted)}</span>
          </div>
          <div className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${quotedTone.bg} ${quotedTone.text}`}>
            {formatPct(costing.marginPctQuoted)}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Abgerechnet</p>
          {costing.revenueInvoiced == null ? (
            <p className="text-sm text-ink-faint">Noch keine Rechnung gestellt.</p>
          ) : (
            <>
              <Row label="Erlös" value={formatCurrency(costing.revenueInvoiced)} />
              <Row label="Anmietung" value={`− ${formatCurrency(costing.costSubrental)}`} muted />
              <Row label="Personal" value={`− ${formatCurrency(costing.costPersonal)}`} muted />
              <Row label="Sonstiges" value={`− ${formatCurrency(costing.costOther)}`} muted />
              <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-semibold text-ink">
                <span>Deckungsbeitrag</span>
                <span className="font-mono">{formatCurrency(costing.marginInvoiced ?? 0)}</span>
              </div>
              <div
                className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${invoicedTone.bg} ${invoicedTone.text}`}
              >
                {formatPct(costing.marginPctInvoiced)}
              </div>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
