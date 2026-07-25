import type { Subrental, SubrentalItem } from "@/types/database";
import { isActiveSubrentalStatus } from "@/lib/subrentals";
import { jobDurationDays } from "@/lib/reports";

/**
 * Beschaffungs-Katalog: verdichtet die Anmiet-Historie zu einer Nachschlage-
 * Sicht ("was habe ich schon mal wo zu welchem Preis beschafft?"), ohne dass
 * dafür irgendetwas gepflegt werden muss — er entsteht rein aus vorhandenen
 * Anmiet-Vorgängen und wächst mit jedem neuen Vorgang von selbst.
 *
 * Wichtige Fachregeln (siehe Migrationskopf 0042_subrentals.sql):
 * - `unit_cost` ist der Einkaufspreis je Stück für den GESAMTEN Zeitraum,
 *   nicht pro Tag — Vorgänge mit unterschiedlicher Dauer sind daher nur über
 *   einen umgerechneten Tagespreis (`unitCostPerDay`) vergleichbar.
 * - Positionen mit `unit_cost === 0` sind unbepreiste Zeilen (z. B. aus
 *   "Fehlmenge anmieten" in der Packliste) — sie zählen für die Häufigkeit,
 *   aber nicht für Preisvergleiche ("günstigster Partner", "zuletzt bepreist").
 * - Stornierte Vorgänge fließen nicht ein.
 */

export interface CatalogProcurement {
  subrentalId: string;
  jobId: string;
  jobTitle: string | null;
  supplierId: string;
  supplierName: string;
  /** Bezeichnung wie in dieser Position erfasst (Schreibweise kann variieren). */
  description: string;
  /** Beginn des Anmiet-Zeitraums (subrentals.start_date). */
  date: string;
  /** Zeitraum-Länge in Tagen (beide Randtage zählen, wie bei Jobs). */
  days: number;
  quantity: number;
  /** Wie erfasst: je Stück für den gesamten Zeitraum. */
  unitCost: number;
  /** Umgerechnet auf einen Tag; 0 wenn days === 0 oder unitCost === 0. */
  unitCostPerDay: number;
}

export interface CatalogEntry {
  /** "dev:<uuid>" für Katalog-Geräte, "txt:<normalisiert>" für Freitext-Positionen. */
  key: string;
  /** Anzeigename = Bezeichnung der jüngsten Beschaffung. */
  label: string;
  deviceId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  /** Anzahl Vorgänge, in denen diese Position vorkommt (inkl. unbepreister). */
  timesProcured: number;
  totalQuantity: number;
  /** Jüngste Beschaffung überhaupt, unabhängig vom Preis. */
  lastProcurement: CatalogProcurement;
  /** Jüngste Beschaffung MIT Preis > 0 — null, wenn nie bepreist. */
  lastPriced: CatalogProcurement | null;
  /** Günstigste Beschaffung nach Tagespreis, nur unter den bepreisten. */
  cheapest: CatalogProcurement | null;
  suppliers: { id: string; name: string; count: number }[];
  /** Alle Beschaffungen dieser Position, absteigend nach Datum. */
  procurements: CatalogProcurement[];
}

/** Normalisiert eine Freitext-Bezeichnung fürs Zusammenführen unterschiedlicher Schreibweisen. */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Zusammenführungs-Schlüssel einer Position: `device_id` (stabil) oder normalisierter Freitext. */
export function catalogEntryKey(item: Pick<SubrentalItem, "device_id" | "description">): string {
  if (item.device_id) return `dev:${item.device_id}`;
  return `txt:${normalizeDescription(item.description)}`;
}

type CatalogSubrental = Pick<Subrental, "id" | "job_id" | "supplier_id" | "status" | "start_date" | "end_date"> & {
  supplier?: { id: string; name: string } | null;
  job?: { id: string; title: string } | null;
  items?: SubrentalItem[];
};

/** Baut den Beschaffungs-Katalog aus allen (nicht stornierten) Anmiet-Vorgängen. */
export function buildProcurementCatalog(subrentals: CatalogSubrental[]): CatalogEntry[] {
  const byKey = new Map<
    string,
    {
      deviceId: string | null;
      categoryId: string | null;
      categoryName: string | null;
      procurements: CatalogProcurement[];
    }
  >();

  for (const subrental of subrentals) {
    if (!isActiveSubrentalStatus(subrental.status)) continue;
    if (!subrental.items || subrental.items.length === 0) continue;

    const days = jobDurationDays(subrental.start_date, subrental.end_date);
    const supplierName = subrental.supplier?.name ?? "Verleih-Partner";

    for (const item of subrental.items) {
      const key = catalogEntryKey(item);
      const unitCostPerDay = days > 0 && item.unit_cost > 0 ? item.unit_cost / days : 0;

      const procurement: CatalogProcurement = {
        subrentalId: subrental.id,
        jobId: subrental.job_id,
        jobTitle: subrental.job?.title ?? null,
        supplierId: subrental.supplier_id,
        supplierName,
        description: item.description,
        date: subrental.start_date,
        days,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        unitCostPerDay,
      };

      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = {
          deviceId: item.device_id,
          categoryId: item.category_id,
          categoryName: item.category?.name ?? null,
          procurements: [],
        };
        byKey.set(key, bucket);
      }
      bucket.procurements.push(procurement);
      // Jüngste Kategorie-Zuordnung gewinnt (falls sie sich je geändert hat).
      if (item.category_id) {
        bucket.categoryId = item.category_id;
        bucket.categoryName = item.category?.name ?? bucket.categoryName;
      }
    }
  }

  const entries: CatalogEntry[] = [];
  for (const [key, bucket] of byKey) {
    const sorted = [...bucket.procurements].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const priced = sorted.filter((p) => p.unitCost > 0);
    const cheapest =
      priced.length > 0
        ? priced.reduce((min, p) => (p.unitCostPerDay < min.unitCostPerDay ? p : min))
        : null;

    const supplierCounts = new Map<string, { id: string; name: string; count: number }>();
    for (const p of sorted) {
      const existing = supplierCounts.get(p.supplierId);
      if (existing) existing.count += 1;
      else supplierCounts.set(p.supplierId, { id: p.supplierId, name: p.supplierName, count: 1 });
    }

    entries.push({
      key,
      label: sorted[0].description,
      deviceId: bucket.deviceId,
      categoryId: bucket.categoryId,
      categoryName: bucket.categoryName,
      timesProcured: sorted.length,
      totalQuantity: sorted.reduce((sum, p) => sum + p.quantity, 0),
      lastProcurement: sorted[0],
      lastPriced: priced[0] ?? null,
      cheapest,
      suppliers: [...supplierCounts.values()].sort((a, b) => b.count - a.count),
      procurements: sorted,
    });
  }

  return entries.sort((a, b) => {
    if (b.timesProcured !== a.timesProcured) return b.timesProcured - a.timesProcured;
    return a.label.localeCompare(b.label, "de");
  });
}
