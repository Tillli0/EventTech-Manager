import type { Subrental } from "@/types/database";

/**
 * Logistik-Faden: eine chronologische Zeitleiste „wann muss ich was wo abholen/
 * zurückbringen" über alle Anmiet-Vorgänge eines Jobs — sobald zwei, drei
 * Verleiher an einem Job hängen, ist nicht das Material das Problem, sondern
 * das Puzzle drumherum. Reine Ableitung aus den vorhandenen Vorgängen, keine
 * neue Tabelle. Warnt nur, wenn ein Termin auf ein Wochenende fällt (Verleiher
 * könnte geschlossen haben) — sonst kein Vorbild, wie professionelle Software
 * Öffnungszeiten kennt, deshalb bewusst kein Anspruch auf echte Öffnungszeiten.
 */

export type LogisticsEventType = "abholen" | "zurueckbringen";

export interface LogisticsEvent {
  subrentalId: string;
  jobId: string;
  supplierName: string;
  type: LogisticsEventType;
  date: string;
  label: string;
  isWeekend: boolean;
}

type LogisticsSubrental = Pick<Subrental, "id" | "job_id" | "start_date" | "end_date" | "logistics" | "status"> & {
  supplier?: { name: string } | null;
};

function isWeekendDate(dateOnly: string): boolean {
  const day = new Date(`${dateOnly}T00:00:00`).getDay(); // 0 = Sonntag, 6 = Samstag
  return day === 0 || day === 6;
}

export function buildLogisticsTimeline(subrentals: LogisticsSubrental[]): LogisticsEvent[] {
  const events: LogisticsEvent[] = [];

  for (const s of subrentals) {
    if (s.status === "storniert") continue;
    const supplierName = s.supplier?.name ?? "Verleih-Partner";
    const isAbholung = s.logistics === "abholung";

    events.push({
      subrentalId: s.id,
      jobId: s.job_id,
      supplierName,
      type: "abholen",
      date: s.start_date,
      label: isAbholung
        ? `Abholen bei ${supplierName}`
        : s.logistics === "lieferung_lager"
          ? `Lieferung ins Lager von ${supplierName}`
          : `Lieferung zur Location von ${supplierName}`,
      isWeekend: isWeekendDate(s.start_date),
    });

    events.push({
      subrentalId: s.id,
      jobId: s.job_id,
      supplierName,
      type: "zurueckbringen",
      date: s.end_date,
      label: isAbholung ? `Zurückbringen zu ${supplierName}` : `Abholung durch ${supplierName}`,
      isWeekend: isWeekendDate(s.end_date),
    });
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
