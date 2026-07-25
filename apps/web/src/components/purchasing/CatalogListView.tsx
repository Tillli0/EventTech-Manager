import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronUp, Download, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PillSelect } from "@/components/ui/PillSelect";
import { SummaryStats } from "@/components/ui/SummaryStats";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useSubrentals } from "@/hooks/useSubrentals";
import { useCategories } from "@/hooks/useDevices";
import { useSuppliers } from "@/hooks/useSuppliers";
import { buildProcurementCatalog, type CatalogEntry } from "@/lib/procurementCatalog";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";

type SortKey = "haeufigkeit" | "name" | "preis";

/**
 * Beschaffungs-Katalog: reine Auswertung der Anmiet-Historie — kein eigener
 * Datensatz, keine Pflege. Zeigt, was schon einmal beschafft wurde, bei wem,
 * zu welchem (auf einen Tag umgerechneten) Preis. Nach dem Listen-Rezept aus
 * `apps/web/CLAUDE.md`, aber bewusst OHNE Jahr-Filter und OHNE Monats-/
 * Kundengruppierung — der Katalog ist selbst die Verdichtung über alle Jahre;
 * ein Archiv-Umschalter würde ihm den Sinn nehmen. Gruppiert wird stattdessen
 * nach Kategorie, wie im Inventar.
 */
export function CatalogListView() {
  const { data: subrentals, isLoading, error } = useSubrentals();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "haeufigkeit", dir: "desc" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const catalog = useMemo(() => buildProcurementCatalog(subrentals ?? []), [subrentals]);

  const usedSupplierIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of catalog) for (const s of entry.suppliers) ids.add(s.id);
    return ids;
  }, [catalog]);

  const categoryOptions = useMemo(() => {
    const usedCategoryIds = new Set(catalog.map((e) => e.categoryId).filter(Boolean));
    return (categories ?? []).filter((c) => usedCategoryIds.has(c.id));
  }, [categories, catalog]);

  const supplierOptions = useMemo(
    () => (suppliers ?? []).filter((s) => usedSupplierIds.has(s.id)),
    [suppliers, usedSupplierIds],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = catalog;
    if (term) rows = rows.filter((e) => e.label.toLowerCase().includes(term));
    if (categoryFilter) rows = rows.filter((e) => e.categoryId === categoryFilter);
    if (supplierFilter) rows = rows.filter((e) => e.suppliers.some((s) => s.id === supplierFilter));

    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "haeufigkeit") cmp = a.timesProcured - b.timesProcured;
      else if (sort.key === "name") cmp = a.label.localeCompare(b.label, "de");
      else cmp = (a.lastPriced?.unitCostPerDay ?? 0) - (b.lastPriced?.unitCostPerDay ?? 0);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [catalog, search, categoryFilter, supplierFilter, sort]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { label: string; color: string | null; entries: CatalogEntry[] }>();
    for (const entry of filtered) {
      const key = entry.categoryId ?? "__none__";
      const label = entry.categoryName ?? "Ohne Kategorie";
      const color = (categories ?? []).find((c) => c.id === entry.categoryId)?.color ?? null;
      let group = groups.get(key);
      if (!group) {
        group = { label, color, entries: [] };
        groups.set(key, group);
      }
      group.entries.push(entry);
    }
    return [...groups.values()].sort((a, b) => {
      if (a.label === "Ohne Kategorie") return 1;
      if (b.label === "Ohne Kategorie") return -1;
      return a.label.localeCompare(b.label, "de");
    });
  }, [filtered, categories]);

  const stats = useMemo(
    () => ({
      articles: catalog.length,
      suppliers: usedSupplierIds.size,
      procurements: catalog.reduce((sum, e) => sum + e.timesProcured, 0),
    }),
    [catalog, usedSupplierIds],
  );

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExport() {
    exportToCsv(
      `beschaffungs-katalog-${new Date().toISOString().slice(0, 10)}`,
      [
        { label: "Bezeichnung", value: (e: CatalogEntry) => e.label },
        { label: "Kategorie", value: (e: CatalogEntry) => e.categoryName ?? "" },
        { label: "Beschaffungen", value: (e: CatalogEntry) => e.timesProcured },
        { label: "Zuletzt Partner", value: (e: CatalogEntry) => e.lastProcurement.supplierName },
        { label: "Zuletzt am", value: (e: CatalogEntry) => formatDate(e.lastProcurement.date) },
        { label: "Zuletzt EK pro Tag", value: (e: CatalogEntry) => e.lastPriced ? e.lastPriced.unitCostPerDay.toFixed(2).replace(".", ",") : "" },
        { label: "Günstigster Partner", value: (e: CatalogEntry) => e.cheapest?.supplierName ?? "" },
        { label: "Günstigster EK pro Tag", value: (e: CatalogEntry) => e.cheapest ? e.cheapest.unitCostPerDay.toFixed(2).replace(".", ",") : "" },
      ],
      filtered,
    );
  }

  if (isLoading) return <LoadingState label="Katalog wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  if (catalog.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Noch kein Katalog"
        description="Der Beschaffungs-Katalog füllt sich von selbst, sobald du Anmiet-Vorgänge erfasst — keine Pflege nötig."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SummaryStats
        stats={[
          { label: "Artikel im Katalog", value: String(stats.articles) },
          { label: "Genutzte Verleih-Partner", value: String(stats.suppliers) },
          { label: "Beschaffungen gesamt", value: String(stats.procurements) },
        ]}
      />

      <div className="space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Bezeichnung …"
            className="pl-9"
          />
        </div>
        {categoryOptions.length > 0 && (
          <PillSelect
            allLabel="Alle Kategorien"
            options={categoryOptions.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        )}
        {supplierOptions.length > 0 && (
          <PillSelect
            allLabel="Alle Verleih-Partner"
            options={supplierOptions.map((s) => ({ value: s.id, label: s.name }))}
            value={supplierFilter}
            onChange={setSupplierFilter}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-ink-faint">
          <span className="mr-1">Sortieren:</span>
          {(
            [
              { k: "haeufigkeit" as const, label: "Häufigkeit" },
              { k: "name" as const, label: "Name" },
              { k: "preis" as const, label: "Tagespreis" },
            ]
          ).map(({ k, label }) => {
            const active = sort.key === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleSort(k)}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-2 py-1 font-medium transition-colors",
                  active ? "bg-bg-raised text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
                {active && (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
              </button>
            );
          })}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download size={14} />
          CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="px-4 py-8 text-center text-sm text-ink-faint">Keine Einträge für diese Auswahl.</Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <div
                className="flex items-center gap-2 rounded-md border-l-4 px-3 py-2"
                style={{ borderLeftColor: group.color ?? "#8B92A3", backgroundColor: `${group.color ?? "#8B92A3"}14` }}
              >
                <span className="text-sm font-semibold" style={{ color: group.color ?? "#8B92A3" }}>
                  {group.label}
                </span>
                <span className="text-xs text-ink-faint">
                  {group.entries.length} {group.entries.length === 1 ? "Artikel" : "Artikel"}
                </span>
              </div>
              {group.entries.map((entry) => (
                <CatalogRow
                  key={entry.key}
                  entry={entry}
                  expanded={expanded.has(entry.key)}
                  onToggle={() => toggleExpanded(entry.key)}
                  accentColor={group.color}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogRow({
  entry,
  expanded,
  onToggle,
  accentColor,
}: {
  entry: CatalogEntry;
  expanded: boolean;
  onToggle: () => void;
  accentColor: string | null;
}) {
  const cheapestDiffers = entry.cheapest && entry.lastPriced && entry.cheapest.supplierId !== entry.lastPriced.supplierId;

  return (
    <Card
      className="border-l-[3px] px-4 py-3"
      style={{ borderLeftColor: accentColor ?? "#8B92A3" }}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 text-left">
        <ChevronRight size={15} className={cn("shrink-0 text-ink-faint transition-transform", expanded && "rotate-90")} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{entry.label}</p>
          <p className="text-xs text-ink-muted">
            zuletzt bei {entry.lastProcurement.supplierName} am {formatDate(entry.lastProcurement.date)}
          </p>
          {cheapestDiffers && (
            <p className="text-xs text-status-verfuegbar">
              günstiger bei {entry.cheapest!.supplierName}: {formatCurrency(entry.cheapest!.unitCostPerDay)}/Tag
            </p>
          )}
        </div>
        <div className="text-right">
          {entry.lastPriced ? (
            <p className="font-mono text-sm text-ink">{formatCurrency(entry.lastPriced.unitCostPerDay)}/Tag</p>
          ) : (
            <p className="text-xs text-ink-faint">unbepreist</p>
          )}
          <p className="text-xs text-ink-faint">{entry.timesProcured}×</p>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {entry.procurements.map((p) => (
            <div key={p.subrentalId} className="flex items-center justify-between text-xs">
              <div className="min-w-0 flex-1">
                <Link to={`/jobs/${p.jobId}`} className="text-ink hover:underline">
                  {p.jobTitle ?? "Job"}
                </Link>
                <span className="text-ink-faint"> · {p.supplierName} · {formatDate(p.date)}</span>
              </div>
              <span className="font-mono text-ink-muted">
                {p.quantity}× {formatCurrency(p.unitCost)}
                {p.unitCostPerDay > 0 && ` (${formatCurrency(p.unitCostPerDay)}/Tag)`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
