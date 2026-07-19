import type { JobStatus, DeviceStatus } from "@/types/database";

/**
 * EINE Quelle für „Status → Farbe" (PLAN-UI-NEUSCHNITT.md, Entscheidung K-F).
 *
 * Vorher lag dieselbe Zuordnung fünffach im Code verstreut: `STATUS_TONE` in
 * JobsPage und InventoryPage, `JOB_STATUS_HEX` in JobDetailPage, `TONE` in
 * DashboardPage, `KPI_TONE` in ReportsPage. Beim Theme-Umbau wäre jede davon
 * einzeln nachzuschärfen gewesen — und die Hex-Varianten hätten beim Umschalten
 * gar nicht mitgewechselt (helles Design mit dunklen Farbresten).
 *
 * Hier stehen deshalb ausschließlich **Klassennamen**, nie Hex-Werte: Sie zeigen
 * auf die CSS-Variablen aus `index.css` und wechseln damit automatisch mit dem
 * Theme.
 */

export interface Tone {
  /** Textfarbe, z. B. für Badge-Beschriftung. */
  text: string;
  /** Rahmenfarbe (meist mit Transparenz). */
  border: string;
  /** Dezent getönte Fläche. */
  bg: string;
  /** Volle Farbfläche, z. B. für Balken und Punkte. */
  solid: string;
}

/**
 * Klassennamen müssen für Tailwind **vollständig im Quelltext** stehen, sonst
 * werden sie beim Bauen wegoptimiert. Deshalb sind sie hier ausgeschrieben
 * statt zusammengesetzt.
 */
const JOB_TONES: Record<JobStatus, Tone> = {
  anfrage: {
    text: "text-job-anfrage",
    border: "border-job-anfrage/40",
    bg: "bg-job-anfrage/10",
    solid: "bg-job-anfrage",
  },
  bestaetigt: {
    text: "text-job-bestaetigt",
    border: "border-job-bestaetigt/40",
    bg: "bg-job-bestaetigt/10",
    solid: "bg-job-bestaetigt",
  },
  planung: {
    text: "text-job-planung",
    border: "border-job-planung/40",
    bg: "bg-job-planung/10",
    solid: "bg-job-planung",
  },
  packen: {
    text: "text-job-packen",
    border: "border-job-packen/40",
    bg: "bg-job-packen/10",
    solid: "bg-job-packen",
  },
  laeuft: {
    text: "text-job-laeuft",
    border: "border-job-laeuft/40",
    bg: "bg-job-laeuft/10",
    solid: "bg-job-laeuft",
  },
  rueckgabe: {
    text: "text-job-rueckgabe",
    border: "border-job-rueckgabe/40",
    bg: "bg-job-rueckgabe/10",
    solid: "bg-job-rueckgabe",
  },
  abgeschlossen: {
    text: "text-job-abgeschlossen",
    border: "border-job-abgeschlossen/40",
    bg: "bg-job-abgeschlossen/10",
    solid: "bg-job-abgeschlossen",
  },
  storniert: {
    text: "text-job-storniert",
    border: "border-job-storniert/40",
    bg: "bg-job-storniert/10",
    solid: "bg-job-storniert",
  },
};

const DEVICE_TONES: Record<DeviceStatus, Tone> = {
  verfuegbar: {
    text: "text-status-verfuegbar",
    border: "border-status-verfuegbar/40",
    bg: "bg-status-verfuegbar/10",
    solid: "bg-status-verfuegbar",
  },
  ausgeliehen: {
    text: "text-status-ausgeliehen",
    border: "border-status-ausgeliehen/40",
    bg: "bg-status-ausgeliehen/10",
    solid: "bg-status-ausgeliehen",
  },
  defekt: {
    text: "text-status-defekt",
    border: "border-status-defekt/40",
    bg: "bg-status-defekt/10",
    solid: "bg-status-defekt",
  },
  wartung: {
    text: "text-status-wartung",
    border: "border-status-wartung/40",
    bg: "bg-status-wartung/10",
    solid: "bg-status-wartung",
  },
};

/** Farbklassen für einen Job-Status. */
export function jobTone(status: JobStatus): Tone {
  return JOB_TONES[status] ?? JOB_TONES.anfrage;
}

/** Farbklassen für einen Geräte-Status. */
export function deviceTone(status: DeviceStatus): Tone {
  return DEVICE_TONES[status] ?? DEVICE_TONES.verfuegbar;
}

/**
 * Ampel für Kennzahlen: „gut / mittel / schlecht" ohne Domänenbezug.
 * Ersetzt die getrennten TONE-/KPI_TONE-Tabellen aus Dashboard und Auswertungen.
 */
export type ToneLevel = "gut" | "mittel" | "schlecht" | "neutral";

const LEVEL_TONES: Record<ToneLevel, Tone> = {
  gut: {
    text: "text-status-verfuegbar",
    border: "border-status-verfuegbar/40",
    bg: "bg-status-verfuegbar/10",
    solid: "bg-status-verfuegbar",
  },
  mittel: {
    text: "text-status-wartung",
    border: "border-status-wartung/40",
    bg: "bg-status-wartung/10",
    solid: "bg-status-wartung",
  },
  schlecht: {
    text: "text-status-defekt",
    border: "border-status-defekt/40",
    bg: "bg-status-defekt/10",
    solid: "bg-status-defekt",
  },
  neutral: {
    text: "text-ink-muted",
    border: "border-border",
    bg: "bg-bg-raised",
    solid: "bg-ink-faint",
  },
};

export function levelTone(level: ToneLevel): Tone {
  return LEVEL_TONES[level];
}

/**
 * Marge → Ampel. Schwellen aus dem freigegebenen Zielbild der Neuausrichtung
 * (grün ab 30 %, amber 10–30 %, rot darunter).
 */
export function marginLevel(prozent: number | null | undefined): ToneLevel {
  if (prozent === null || prozent === undefined || Number.isNaN(prozent)) return "neutral";
  if (prozent >= 30) return "gut";
  if (prozent >= 10) return "mittel";
  return "schlecht";
}
