import { expect, type Page } from "@playwright/test";

/**
 * Gemeinsame Helfer für die E2E-Tests.
 *
 * Zugangsdaten stammen aus der lokalen Entwicklungsumgebung (Skill `eventtech-dev`)
 * und sind bewusst überschreibbar, damit hier keine Zugangsdaten fest verdrahtet
 * sind, wenn jemand eine andere lokale Instanz nutzt.
 */
export const LOGIN_EMAIL = process.env.E2E_EMAIL ?? "admin@eventtech.local";
export const LOGIN_PASSWORD = process.env.E2E_PASSWORD ?? "EventTech2026!";

/** Abgelegte Sitzung aus `auth.setup.ts` — nicht ins Git (siehe .gitignore). */
export const AUTH_STATE_PATH = "e2e/.auth/state.json";

/** Präfix für alle vom Test erzeugten Daten — macht Aufräumen eindeutig (CLAUDE.md). */
export const TEST_PREFIX = "TEST-E2E";

/** Eindeutiger Titel pro Lauf, damit parallele/wiederholte Läufe sich nicht stören. */
export function testTitle(suffix: string): string {
  return `${TEST_PREFIX}-${Date.now()}-${suffix}`;
}

/**
 * Öffnet einen Pfad und stellt sicher, dass die App eingeloggt geladen ist.
 *
 * Die Anmeldung selbst passiert EINMALIG in `auth.setup.ts`; hier wird nur noch
 * geprüft, dass die Sitzung greift. Landet die Seite doch auf /login, ist die
 * abgelegte Sitzung abgelaufen — dann ist die Fehlermeldung eindeutig, statt
 * dass der Test an einem irreführenden Timeout scheitert.
 */
export async function gotoAngemeldet(page: Page, pfad = "/"): Promise<void> {
  await page.goto(pfad);
  await expect(
    page.getByPlaceholder("name@firma.de"),
    "Nicht angemeldet — abgelegte Sitzung ungültig? (e2e/.auth/state.json löschen und neu laufen lassen)",
  ).toBeHidden({ timeout: 20_000 });
}

/**
 * Sammelt Konsolenfehler einer Seite. Bewusst gefiltert: Netzwerk-/Ressourcen-
 * Rauschen (z. B. fehlende Favicons) soll den Test nicht rot machen, echte
 * JavaScript-Fehler dagegen schon.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/favicon|net::ERR_|Failed to load resource/i.test(text)) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}
