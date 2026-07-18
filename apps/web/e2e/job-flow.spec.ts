import { test, expect } from "@playwright/test";
import { gotoAngemeldet, testTitle, collectConsoleErrors } from "./helpers";

/**
 * Durchstich durch die wichtigste Domäne: Job anlegen → Detailseite → löschen.
 *
 * BEWUSSTE GRENZE — keine Rechnung stellen:
 * Der ursprüngliche Plan sah vor, bis zur gestellten Rechnung durchzugehen. Das
 * wird hier absichtlich NICHT gemacht: Gestellte Rechnungen sind laut
 * Domänen-Invariante (CLAUDE.md) per Trigger **unlöschbar** und verbrauchen eine
 * Nummer aus dem lückenlosen Jahreskreis. Ein automatisierter Test, der bei jedem
 * Lauf eine unlöschbare Rechnung erzeugt, würde dauerhaft Müll hinterlassen und
 * den Nummernkreis aufblähen — das widerspricht „Testdaten aufräumen" und
 * „Korrektheit vor Eleganz bei Geld und Recht".
 *
 * Die Rechnungslogik ist stattdessen abgedeckt durch Vitest (`invoiceTimeline`,
 * `database.test.ts`), die DB-Constraints selbst und den Seiten-Smoke.
 */

test.describe("Job-Durchstich", () => {
  test("Job anlegen, öffnen und wieder entfernen", async ({ page }) => {
    const fehler = collectConsoleErrors(page);
    const titel = testTitle("Job");

    await gotoAngemeldet(page, "/jobs");

    // --- Anlegen ---------------------------------------------------------
    await page.getByRole("button", { name: "Job anlegen" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("z.B. Sommerfest 2026").fill(titel);

    // Zeitraum ist Pflicht: Kalender öffnen und einen Tag wählen.
    await dialog.getByRole("button", { name: /Zeitraum festlegen/ }).click();

    // Einen Monat vorblättern, damit der Termin sicher in der ZUKUNFT liegt.
    // (Teuer gelernt: Ein Termin in der Vergangenheit landet in der eingeklappten
    // Gruppe „Vergangen" und ist in der Liste nicht sichtbar — der Job wird
    // korrekt angelegt, der Test sieht ihn nur nicht.)
    await dialog.getByRole("button", { name: "Nächster Monat" }).click();

    // ACHTUNG (teuer gelernt): Tage NICHT über getByRole/Name ansprechen. Tage mit
    // Jobs tragen ein `title` (z. B. "Geburtstag"), das den zugänglichen Namen
    // überschreibt — der Button heißt dann nicht mehr "15". Deshalb exakt über
    // den Textinhalt suchen, das ist unabhängig von den vorhandenen Jobs.
    await dialog.locator("button").filter({ hasText: /^15$/ }).first().click();

    // Auswahl muss angekommen sein, sonst schlägt das Anlegen still fehl
    // ("Bitte einen Zeitraum festlegen").
    await expect(
      dialog.getByRole("button", { name: /Zeitraum festlegen/ }),
      "Zeitraum wurde nicht übernommen",
    ).toBeHidden({ timeout: 10_000 });

    await dialog.getByRole("button", { name: "Job anlegen" }).click();

    // --- Prüfen ----------------------------------------------------------
    // Nach dem Anlegen bleibt die App auf der Liste; der neue Job muss dort stehen.
    await expect(page.getByText(titel).first()).toBeVisible({ timeout: 20_000 });

    // Von der Liste in die Detailseite — testet zugleich die Verlinkung.
    await page.getByText(titel).first().click();
    await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}/, { timeout: 20_000 });

    // Die Detailseite muss ihre Kernbausteine zeigen — bricht der Umbau (U6)
    // die Abschnitte, fällt es hier auf.
    await expect(page.getByText("Packliste").first()).toBeVisible({ timeout: 20_000 });

    // --- Aufräumen -------------------------------------------------------
    // Über die Oberfläche, damit der Löschweg gleich mitgeprüft wird
    // (Bestätigung ist Pflicht — destruktive Aktionen laufen über ConfirmDialog).
    await page.getByRole("button", { name: "Papierkorb" }).click();
    await page.getByRole("button", { name: "In den Papierkorb" }).click();

    await expect(page).toHaveURL(/\/jobs$/, { timeout: 20_000 });
    // Der Job darf in der aktiven Liste nicht mehr auftauchen.
    await expect(page.getByText(titel)).toHaveCount(0, { timeout: 20_000 });

    expect(fehler, `Konsolenfehler:\n${fehler.join("\n")}`).toEqual([]);
  });
});
