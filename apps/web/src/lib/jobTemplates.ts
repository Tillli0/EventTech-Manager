/**
 * Vorlagen je Event-Art (P3, v1 nur Programmpunkte, siehe Migration 0056).
 * Reine Zeit-Offset-Rechnung — Minuten relativ zu jobs.start_date, absolut in
 * beide Richtungen umrechenbar. Läuft über Millisekunden-Arithmetik auf einem
 * absoluten Date-Zeitpunkt, deshalb automatisch sommerzeit-sicher (anders als
 * die wiederkehrenden Regeln in personalSchedule.ts, die Wanduhrzeiten in der
 * lokalen Zeitzone nachbilden — hier gibt es keine Wanduhrzeit-Regel, nur einen
 * festen Minuten-Abstand zu einem festen Ankerpunkt).
 */

export interface TemplateItemOffset {
  title: string;
  offset_minutes: number;
  duration_minutes: number | null;
  notes: string | null;
}

export interface AppliedMilestone {
  title: string;
  at: string;
  end_at: string | null;
  notes: string | null;
}

/** Wendet eine Vorlage auf einen Job mit gegebenem Start an — erzeugt fertige Programmpunkte. */
export function applyTemplateOffsets(items: TemplateItemOffset[], jobStartDate: Date): AppliedMilestone[] {
  return items.map((item) => {
    const at = new Date(jobStartDate.getTime() + item.offset_minutes * 60_000);
    const end_at =
      item.duration_minutes != null ? new Date(at.getTime() + item.duration_minutes * 60_000).toISOString() : null;
    return { title: item.title, at: at.toISOString(), end_at, notes: item.notes };
  });
}

export interface MilestoneForTemplate {
  title: string;
  at: string;
  end_at: string | null;
  notes: string | null;
}

/** Kehrfunktion: "aus diesem Job eine Vorlage machen" — Programmpunkte in Offsets zum Job-Start umrechnen. */
export function deriveTemplateItemsFromMilestones(
  milestones: MilestoneForTemplate[],
  jobStartDate: Date,
): TemplateItemOffset[] {
  return milestones.map((m) => {
    const at = new Date(m.at);
    const offset_minutes = Math.round((at.getTime() - jobStartDate.getTime()) / 60_000);
    const duration_minutes = m.end_at
      ? Math.round((new Date(m.end_at).getTime() - at.getTime()) / 60_000)
      : null;
    return { title: m.title, offset_minutes, duration_minutes, notes: m.notes };
  });
}
