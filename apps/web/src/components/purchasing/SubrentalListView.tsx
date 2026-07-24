import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Truck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { SummaryStats } from "@/components/ui/SummaryStats";
import { SubrentalStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useSubrentals } from "@/hooks/useSubrentals";
import { subrentalTotals, isActiveSubrentalStatus, SUBRENTAL_LOGISTICS_OPTIONS } from "@/lib/subrentals";
import { SUBRENTAL_STATUS_OPTIONS } from "@/lib/subrentals";
import { formatDate, formatCurrency } from "@/lib/format";
import type { SubrentalStatus } from "@/types/database";

type Filter = SubrentalStatus | "alle";

export function SubrentalListView() {
  const { data: subrentals, isLoading, error } = useSubrentals();
  const [filter, setFilter] = useState<Filter>("alle");

  const stats = useMemo(() => {
    const rows = subrentals ?? [];
    const active = rows.filter((s) => isActiveSubrentalStatus(s.status));
    const open = active.filter((s) => s.status === "entwurf" || s.status === "angefragt");
    const confirmed = active.filter((s) => s.status === "bestaetigt" || s.status === "uebernommen");
    const yearSum = active
      .filter((s) => new Date(s.start_date).getFullYear() === new Date().getFullYear())
      .reduce((sum, s) => sum + subrentalTotals(s.items ?? []).total, 0);
    const openSum = open.reduce((sum, s) => sum + subrentalTotals(s.items ?? []).total, 0);
    return { open: open.length, openSum, confirmed: confirmed.length, yearSum };
  }, [subrentals]);

  const counts = useMemo(() => {
    const map = new Map<SubrentalStatus, number>();
    for (const s of subrentals ?? []) map.set(s.status, (map.get(s.status) ?? 0) + 1);
    return map;
  }, [subrentals]);

  const filtered = useMemo(() => {
    if (!subrentals) return [];
    if (filter === "alle") return subrentals;
    return subrentals.filter((s) => s.status === filter);
  }, [subrentals, filter]);

  if (isLoading) return <LoadingState label="Anmietungen werden geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  if (!subrentals || subrentals.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="Noch keine Anmiet-Vorgänge"
        description="Anmiet-Vorgänge werden am jeweiligen Job angelegt (Tab „Material“)."
      />
    );
  }

  const filterOptions: { value: Filter; label: string; count: number }[] = [
    { value: "alle", label: "Alle", count: subrentals.length },
    ...SUBRENTAL_STATUS_OPTIONS.map((o) => ({ value: o.value as Filter, label: o.label, count: counts.get(o.value) ?? 0 })),
  ];

  return (
    <div className="space-y-4">
      <SummaryStats
        stats={[
          { label: "Offen (Entwurf/Angefragt)", value: String(stats.open), sub: formatCurrency(stats.openSum), tone: "amber" },
          { label: "Bestätigt/Übernommen", value: String(stats.confirmed), tone: "accent" },
          { label: "EK dieses Jahr", value: formatCurrency(stats.yearSum), sub: "nicht stornierte Vorgänge", tone: "green" },
        ]}
      />

      <Tabs<Filter> options={filterOptions} value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <Card className="px-4 py-8 text-center text-sm text-ink-faint">Keine Anmietungen für diese Auswahl.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((subrental) => {
            const { total } = subrentalTotals(subrental.items ?? []);
            const logisticsLabel = SUBRENTAL_LOGISTICS_OPTIONS.find((o) => o.value === subrental.logistics)?.label;
            return (
              <Link key={subrental.id} to={`/jobs/${subrental.job_id}`}>
                <Card className="flex items-center gap-3 border-l-[3px] border-l-accent px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-accent/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {subrental.supplier?.name ?? "Verleih-Partner"}
                      {subrental.job?.title && <span className="text-ink-faint"> · {subrental.job.title}</span>}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(subrental.start_date)} – {formatDate(subrental.end_date)} · {logisticsLabel}
                    </p>
                  </div>
                  <span className="hidden font-mono text-xs text-ink-muted sm:block">{formatCurrency(total)}</span>
                  <SubrentalStatusBadge status={subrental.status} />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
