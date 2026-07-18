import { test, expect } from "@playwright/test";
import { gotoAngemeldet, collectConsoleErrors } from "./helpers";

/**
 * Seiten-Smoke: Jede Hauptseite lädt, zeigt Inhalt und wirft keine JS-Fehler.
 *
 * Das ist das eigentliche Netz für den UI-Neuschnitt (PLAN-UI-NEUSCHNITT.md):
 * Ein Theme-Umbau oder eine geänderte Navigation bricht typischerweise genau so —
 * eine Route läuft ins Leere, eine Seite bleibt weiß, ein Import fehlt. Die
 * Vitest-Suite kann das nicht sehen, weil sie nur Rechenlogik prüft.
 */

const SEITEN = [
  { pfad: "/", name: "Überblick" },
  { pfad: "/jobs", name: "Jobs" },
  { pfad: "/inventar", name: "Inventar" },
  { pfad: "/kunden", name: "Anfragen / Kunden" },
  { pfad: "/angebote", name: "Angebote" },
  { pfad: "/rechnungen", name: "Rechnungen" },
  { pfad: "/auswertungen", name: "Auswertungen" },
  { pfad: "/dokumente", name: "Dokumente" },
  { pfad: "/kalender", name: "Kalender" },
  { pfad: "/aufgaben", name: "Aufgaben" },
  { pfad: "/admin", name: "Verwaltung" },
];

test.describe("Seiten-Smoke", () => {
  for (const seite of SEITEN) {
    test(`${seite.name} (${seite.pfad}) lädt ohne Fehler`, async ({ page }) => {
      const fehler = collectConsoleErrors(page);

      await gotoAngemeldet(page, seite.pfad);

      // WICHTIG (in der Mutationsprobe teuer gelernt): erst warten, bis die Seite
      // wirklich fertig ist. Ohne das prüft der Test die noch intakte App-Hülle
      // und ist durch, BEVOR ein Render-Absturz durchschlägt — er meldet dann
      // grün, obwohl die Seite kaputt ist.
      await page.waitForLoadState("networkidle").catch(() => {
        /* Dauerverbindungen (HMR) verhindern networkidle — dann reicht die Prüfung unten. */
      });
      await page.waitForTimeout(500);

      // 1) Die Seite darf nicht weiß bleiben: der Inhaltsbereich muss stehen.
      //    Stürzt eine Seite beim Rendern ab, fehlt <main> komplett.
      const inhalt = page.locator("main").first();
      await expect(inhalt, `Kein <main> auf ${seite.pfad} — Seite abgestürzt?`).toBeVisible({
        timeout: 20_000,
      });

      // 2) Ladezustände dürfen nicht dauerhaft stehen bleiben.
      await expect
        .poll(async () => (await inhalt.innerText()).trim().length, {
          timeout: 20_000,
          message: "Seite blieb ohne sichtbaren Inhalt",
        })
        .toBeGreaterThan(0);

      // 3) Keine Fehler-/Ersatzansicht statt der echten Seite.
      const bodyText = await page.locator("body").innerText();
      expect(bodyText, `Fehleransicht statt Inhalt auf ${seite.pfad}`).not.toMatch(
        /Unerwarteter Fehler|Neue Version verfügbar/,
      );

      // 4) Keine JavaScript-Fehler (inkl. Render-Abstürzen) — zuletzt geprüft,
      //    damit verzögert auftretende Fehler noch erfasst werden.
      expect(fehler, `Konsolenfehler auf ${seite.pfad}:\n${fehler.join("\n")}`).toEqual([]);
    });
  }

  test("unbekannte Route führt nicht zu einem weißen Bildschirm", async ({ page }) => {
    await page.goto("/diese-route-gibt-es-nicht");
    // Egal ob Weiterleitung oder 404-Ansicht — sichtbarer Inhalt muss da sein.
    await expect(page.locator("body")).not.toHaveText("");
  });
});

test.describe("Navigation", () => {
  test("Hauptnavigation führt zu den Seiten", async ({ page }) => {
    await gotoAngemeldet(page, "/");

    // Nach dem Umbau der Navigation (U3) muss dieser Test weiterhin grün sein —
    // er hängt bewusst an den sichtbaren Beschriftungen, nicht an CSS-Klassen.
    await page.getByRole("link", { name: "Jobs", exact: true }).first().click();
    await expect(page).toHaveURL(/\/jobs/);

    await page.getByRole("link", { name: "Kalender", exact: true }).first().click();
    await expect(page).toHaveURL(/\/kalender/);
  });
});
