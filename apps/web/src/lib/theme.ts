/**
 * Theme-Verwaltung (PLAN-UI-NEUSCHNITT.md, Etappe U2).
 *
 * Das Theme steckt als `data-theme` am <html>; die Farbwerte dazu stehen in
 * `index.css`. Gespeichert wird lokal im Browser — bewusst nicht in der
 * Datenbank: Es ist eine reine Anzeige-Einstellung pro Gerät, dafür braucht es
 * keine Tabelle und keinen Netzwerkweg.
 */

export const THEMES = ["creme", "weiss", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "creme";

export const THEME_LABELS: Record<Theme, string> = {
  creme: "Creme",
  weiss: "Weiß + Indigo",
  dark: "Dunkel",
};

export const THEME_HINTS: Record<Theme, string> = {
  creme: "Warm und ruhig, Schwarz als Aktionsfarbe",
  weiss: "Kühles Weiß mit Indigo-Akzent",
  dark: "Das frühere dunkle Theme",
};

const STORAGE_KEY = "eventtech.theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** Gespeichertes Theme lesen; fällt auf den Standard zurück. */
export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const gespeichert = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(gespeichert) ? gespeichert : DEFAULT_THEME;
  } catch {
    // Privater Modus o. ä. — dann eben der Standard, kein Grund zu scheitern.
    return DEFAULT_THEME;
  }
}

/** Theme setzen: am <html> anwenden und merken. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Nicht speichern zu können ist kein Fehler, der den Nutzer stören muss.
  }
}
