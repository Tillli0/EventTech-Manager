// Persönliche Zeitachse (PLAN-MEIN-PLAN.md M1/E-D): zwei schlanke Tabellen statt einer
// generischen RRULE-Maschine. Konkrete Blöcke (personal_blocks) sind fertig; die
// wöchentliche Regel (personal_recurring_blocks) wird HIER — als reine Funktion, nicht
// in der DB — zu konkreten Terminen in einem Zeitraum aufgelöst.
//
// Zeitzonen-Regel (E-D): Wochentag/Uhrzeit sind lokale Werte. Die Auflösung baut lokale
// JS-Date-Objekte (new Date(jahr, monat, tag, stunde, minute)) statt UTC-Arithmetik —
// dadurch übernimmt JS selbst die Sommerzeit-Umstellung korrekt, ohne dass wir sie
// manuell nachrechnen müssen.

export type PersonalBlockCategory =
  | "koeln_schicht"
  | "schule"
  | "klausur"
  | "ferien"
  | "urlaub"
  | "krank"
  | "sonstiges";

export const PERSONAL_BLOCK_CATEGORY_LABELS: Record<PersonalBlockCategory, string> = {
  koeln_schicht: "Köln-Schicht",
  schule: "Schule",
  klausur: "Klausur",
  ferien: "Ferien",
  urlaub: "Urlaub",
  krank: "Krank",
  sonstiges: "Sonstiges",
};

/**
 * Sichtbar als Inhalt (Köln-Schichten zählen wie ein Einsatz) vs. nur als
 * Blocker wirksam (Schule/Klausur/Ferien/Urlaub/Krank — siehe PLAN-UI-NEUSCHNITT.md
 * Trennlinien-Tabelle in K-Leitidee). Nie eine eigene Karte für Schule & Co.
 */
export function isVisibleBlockCategory(category: PersonalBlockCategory): boolean {
  return category === "koeln_schicht";
}

export interface PersonalBlock {
  id: string;
  user_id: string;
  category: PersonalBlockCategory;
  title: string | null;
  start_at: string;
  end_at: string;
  notes: string | null;
}

export interface PersonalRecurringBlock {
  id: string;
  user_id: string;
  category: PersonalBlockCategory;
  title: string | null;
  /** 0 = Montag … 6 = Sonntag. */
  weekday: number;
  /** "HH:MM" oder "HH:MM:SS" (so wie Postgres `time` über PostgREST kommt). */
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to: string | null;
}

/** Ein aufgelöster Termin — egal ob aus einem konkreten Block oder einer Regel. */
export interface ResolvedPersonalBlock {
  id: string;
  category: PersonalBlockCategory;
  title: string | null;
  start: Date;
  end: Date;
  source: "block" | "recurring";
  /** ID des ursprünglichen Blocks/der Regel, für Bearbeiten/Löschen-Links. */
  sourceId: string;
}

function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(":");
  return { hours: Number(h), minutes: Number(m) };
}

/** date-fns/JS liefert 0=Sonntag…6=Samstag; wir rechnen intern 0=Montag…6=Sonntag. */
function toAppWeekday(jsWeekday: number): number {
  return (jsWeekday + 6) % 7;
}

/**
 * Löst eine wöchentliche Regel im Zeitraum [rangeStart, rangeEnd) zu konkreten
 * Terminen auf. Iteriert Kalendertage statt Wochen-Arithmetik — einfacher zu
 * lesen und robust gegenüber Gültigkeitsgrenzen mitten in der Woche.
 */
export function resolveRecurringBlock(
  rule: PersonalRecurringBlock,
  rangeStart: Date,
  rangeEnd: Date,
): ResolvedPersonalBlock[] {
  const results: ResolvedPersonalBlock[] = [];
  const validFrom = new Date(rule.valid_from + "T00:00:00");
  const validTo = rule.valid_to ? new Date(rule.valid_to + "T23:59:59") : null;

  const from = validFrom > rangeStart ? validFrom : rangeStart;
  const to = validTo && validTo < rangeEnd ? validTo : rangeEnd;
  if (from >= to) return results;

  const { hours: startH, minutes: startM } = parseTimeOfDay(rule.start_time);
  const { hours: endH, minutes: endM } = parseTimeOfDay(rule.end_time);

  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const limit = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= limit) {
    if (toAppWeekday(cursor.getDay()) === rule.weekday) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), startH, startM);
      const end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), endH, endM);
      if (start < to && end > from) {
        results.push({
          id: `${rule.id}:${start.toISOString()}`,
          category: rule.category,
          title: rule.title,
          start,
          end,
          source: "recurring",
          sourceId: rule.id,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

/**
 * Vereint konkrete Blöcke und aufgelöste Regel-Termine zu einer sortierten Liste
 * für einen Zeitraum — die eine Stelle, die Kalender-Ebenen und „Meine Zeiten"
 * gleichermaßen nutzen.
 */
export function resolvePersonalBlocks(
  blocks: PersonalBlock[],
  recurring: PersonalRecurringBlock[],
  rangeStart: Date,
  rangeEnd: Date,
): ResolvedPersonalBlock[] {
  const fromBlocks: ResolvedPersonalBlock[] = blocks
    .filter((b) => new Date(b.start_at) < rangeEnd && new Date(b.end_at) > rangeStart)
    .map((b) => ({
      id: b.id,
      category: b.category,
      title: b.title,
      start: new Date(b.start_at),
      end: new Date(b.end_at),
      source: "block",
      sourceId: b.id,
    }));

  const fromRecurring = recurring.flatMap((r) => resolveRecurringBlock(r, rangeStart, rangeEnd));

  return [...fromBlocks, ...fromRecurring].sort((a, b) => a.start.getTime() - b.start.getTime());
}
