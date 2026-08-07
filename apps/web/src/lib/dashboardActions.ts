import { formatCurrency, formatDate } from "@/lib/format";
import type { Subrental, Task, WebsiteLead } from "@/types/database";

/**
 * „Was jetzt zählt" — die eine Handlungsliste der Startseite.
 *
 * Vorher lagen überfällige Aufgaben, offene Rechnungen, unbestätigte Anmietungen
 * und neue Website-Anfragen in vier gleich aussehenden Kästen nebeneinander. Wer
 * morgens auf die Seite kommt, musste selbst vergleichen, was davon am dringendsten
 * ist. Hier fließen alle vier in EINE nach Dringlichkeit sortierte Liste.
 *
 * Die Sortierung folgt genau zwei Stufen, damit sie erklärbar bleibt:
 *   Stufe 0 „überfällig"  — eine Frist ist verstrichen (Aufgabe, Rechnung).
 *                           Innerhalb: die am längsten überfällige zuerst.
 *   Stufe 1 „liegt bei dir" — noch keine Frist gerissen, wartet aber auf eine
 *                           Entscheidung (Anfrage sichten, Anmietung bestellen,
 *                           heute fällige Aufgabe). Innerhalb: nächstes Datum zuerst.
 */

export type ActionKind = "aufgabe" | "rechnung" | "anmietung" | "anfrage";
export type ActionUrgency = "ueberfaellig" | "offen";

export interface ActionItem {
  id: string;
  kind: ActionKind;
  urgency: ActionUrgency;
  /** Fette Hauptzeile. */
  title: string;
  /** Gedämpfte Unterzeile: worum es geht. */
  detail: string;
  /** Rechte Spalte, immer Mono: Datum oder Betrag. */
  meta: string;
  /** Ziel des Klicks. */
  to: string;
  /** Kleiner = weiter oben. Nur intern, nicht anzeigen. */
  sortKey: number;
}

/**
 * Auf das Nötigste eingedampfte Rechnung. Die Seite rechnet den Restbetrag und
 * den abgeleiteten Status selbst aus (`invoiceDerivedStatus`) — hier landet nur
 * das Ergebnis, damit diese Funktion ohne Datenbank-Typen testbar bleibt.
 */
export interface OffenerPosten {
  id: string;
  /** Rechnungsnummer, z. B. „RE-2026-0001". */
  nummer: string | null;
  titel: string;
  kunde: string | null;
  faelligAm: string | null;
  restbetrag: number;
  ueberfaellig: boolean;
}

const TAG_MS = 86_400_000;

/** Ganze Tage von `heute` bis `datum` (negativ = liegt in der Vergangenheit). */
function tageBis(datum: string | null, heute: Date): number {
  if (!datum) return 0;
  const ziel = new Date(datum);
  if (Number.isNaN(ziel.getTime())) return 0;
  ziel.setHours(0, 0, 0, 0);
  const start = new Date(heute);
  start.setHours(0, 0, 0, 0);
  return Math.round((ziel.getTime() - start.getTime()) / TAG_MS);
}

/** „seit 3 Tagen" / „heute" / „in 5 Tagen" — kürzer und konkreter als ein Datum. */
export function faelligkeitsText(tage: number): string {
  if (tage < -1) return `seit ${Math.abs(tage)} Tagen`;
  if (tage === -1) return "seit gestern";
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}

function sortKey(urgency: ActionUrgency, tage: number): number {
  // Stufe 0 zieht immer nach oben; innerhalb einer Stufe zählt das Datum.
  return (urgency === "ueberfaellig" ? 0 : 1_000_000) + tage;
}

export interface ActionInput {
  /** Offene Aufgaben mit Fälligkeit heute oder früher. */
  ueberfaelligeAufgaben: Task[];
  /** Gestellte, noch nicht vollständig bezahlte Rechnungen. Leer ohne Geld-Recht. */
  offenePosten: OffenerPosten[];
  /** Anmietungen in Entwurf/angefragt — der Ball liegt noch bei uns. Leer ohne Anmiet-Recht. */
  anmietungen: Subrental[];
  /** Website-Anfragen im Status „neu". */
  neueAnfragen: WebsiteLead[];
  heute: Date;
}

export function buildActionItems(input: ActionInput): ActionItem[] {
  const { ueberfaelligeAufgaben, offenePosten, anmietungen, neueAnfragen, heute } = input;
  const items: ActionItem[] = [];

  for (const task of ueberfaelligeAufgaben) {
    const tage = tageBis(task.due_date, heute);
    // Heute fällig ist noch nicht gerissen — das gehört in „liegt bei dir".
    const urgency: ActionUrgency = tage < 0 ? "ueberfaellig" : "offen";
    items.push({
      id: `aufgabe-${task.id}`,
      kind: "aufgabe",
      urgency,
      title: task.title,
      detail: task.job?.title ? `Aufgabe · ${task.job.title}` : "Aufgabe",
      meta: faelligkeitsText(tage),
      to: "/aufgaben",
      sortKey: sortKey(urgency, tage),
    });
  }

  for (const posten of offenePosten) {
    const tage = tageBis(posten.faelligAm, heute);
    const urgency: ActionUrgency = posten.ueberfaellig ? "ueberfaellig" : "offen";
    items.push({
      id: `rechnung-${posten.id}`,
      kind: "rechnung",
      urgency,
      title: posten.nummer ?? posten.titel,
      detail: [posten.kunde, posten.nummer ? posten.titel : null].filter(Boolean).join(" · ") || "Rechnung",
      meta: formatCurrency(posten.restbetrag),
      to: "/rechnungen",
      sortKey: sortKey(urgency, tage),
    });
  }

  for (const s of anmietungen) {
    const tage = tageBis(s.start_date, heute);
    items.push({
      id: `anmietung-${s.id}`,
      kind: "anmietung",
      urgency: "offen",
      title: s.supplier?.name ?? "Verleih-Partner",
      detail: s.status === "entwurf" ? "Anmietung noch nicht bestellt" : "Anmietung wartet auf Bestätigung",
      meta: formatDate(s.start_date),
      to: s.job_id ? `/jobs/${s.job_id}` : "/anmietung",
      sortKey: sortKey("offen", tage),
    });
  }

  for (const lead of neueAnfragen) {
    // Anfragen ohne Eventdatum bekommen den Eingang als Datum — sonst rutschen
    // sie mit „0 Tagen" grundlos an die Spitze der Stufe.
    const tage = tageBis(lead.event_date ?? lead.created_at, heute);
    items.push({
      id: `anfrage-${lead.id}`,
      kind: "anfrage",
      urgency: "offen",
      title: lead.name,
      detail: lead.event_type ? `Neue Anfrage · ${lead.event_type}` : "Neue Anfrage",
      meta: lead.event_date ? formatDate(lead.event_date) : "ohne Termin",
      to: "/kunden",
      sortKey: sortKey("offen", tage),
    });
  }

  return items.sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title, "de"));
}
