import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Einklappbarer Gruppen-Kopf als Tabellenzeile (Monats-/Kundengruppen in
 * Angebots-/Rechnungslisten): Label + Anzahl + Zwischensumme rechts.
 * Muster wie die Kategorie-Köpfe der Inventarseite, nur als <tr> für Tabellen.
 */
export function GroupHeaderRow({
  label,
  count,
  sum,
  colSpan,
  collapsed,
  onToggle,
}: {
  label: string;
  count: number;
  /** Bereits formatierte Zwischensumme (z.B. Währung); weglassen = keine Summe. */
  sum?: string;
  colSpan: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-border bg-bg-raised/60">
      <td colSpan={colSpan} className="px-0 py-0">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 px-4 py-2 text-left"
          aria-expanded={!collapsed}
        >
          <ChevronRight
            size={14}
            className={cn("shrink-0 text-ink-muted transition-transform", !collapsed && "rotate-90")}
          />
          <span className="text-xs font-semibold text-ink">{label}</span>
          <span className="text-xs text-ink-faint">{count}</span>
          {sum !== undefined && <span className="ml-auto font-mono text-xs text-ink-muted">{sum}</span>}
        </button>
      </td>
    </tr>
  );
}
