import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useSubrentals } from "@/hooks/useSubrentals";
import { buildProcurementCatalog, type CatalogEntry } from "@/lib/procurementCatalog";
import { formatCurrency, formatDate } from "@/lib/format";

/**
 * Position aus dem Beschaffungs-Katalog (Anmiet-Historie) ins Angebot
 * übernehmen. Zeigt bewusst nur den Einkaufspreis als Orientierung — der
 * Verkaufspreis bleibt leer, Till entscheidet ihn selbst (siehe
 * PLAN-NEUAUSRICHTUNG.md, Etappe E11).
 */
export function CatalogPickerDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (entry: CatalogEntry, quantity: number) => void;
}) {
  const { data: subrentals, isLoading, error } = useSubrentals();
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const catalog = useMemo(() => buildProcurementCatalog(subrentals ?? []), [subrentals]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalog;
    return catalog.filter((e) => e.label.toLowerCase().includes(term));
  }, [catalog, search]);

  function handlePick(entry: CatalogEntry) {
    onPick(entry, quantities[entry.key] ?? 1);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Position aus dem Katalog übernehmen" maxWidth="max-w-lg">
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Bezeichnung …"
            className="pl-9"
          />
        </div>

        {isLoading && <LoadingState label="Katalog wird geladen …" />}
        {error && <ErrorState message={error.message} />}

        {!isLoading && !error && catalog.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="Noch kein Katalog"
            description="Der Beschaffungs-Katalog füllt sich, sobald Anmiet-Vorgänge erfasst wurden."
          />
        )}

        {!isLoading && filtered.length === 0 && catalog.length > 0 && (
          <p className="px-1 py-4 text-center text-sm text-ink-faint">Keine Treffer für diese Suche.</p>
        )}

        {filtered.length > 0 && (
          <div className="max-h-96 space-y-1.5 overflow-y-auto scrollbar-thin">
            {filtered.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{entry.label}</p>
                  <p className="text-xs text-ink-muted">
                    {entry.lastPriced ? (
                      <>
                        zuletzt {formatCurrency(entry.lastPriced.unitCostPerDay)}/Tag bei{" "}
                        {entry.lastPriced.supplierName} ({formatDate(entry.lastPriced.date)})
                      </>
                    ) : (
                      "noch nicht bepreist"
                    )}
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={quantities[entry.key] ?? 1}
                  onChange={(e) =>
                    setQuantities((prev) => ({ ...prev, [entry.key]: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                  }
                  className="w-16 text-right"
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => handlePick(entry)}>
                  Übernehmen
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
