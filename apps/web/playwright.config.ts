import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-Konfiguration (ROADMAP P0.4, Etappe A3 aus PLAN-V1-ABSICHERN.md).
 *
 * Zweck: das Netz für den UI-Neuschnitt. Die Vitest-Suite prüft Rechenlogik —
 * sie merkt NICHT, wenn nach einem Umbau eine Seite weiß bleibt oder eine Route
 * kaputt ist. Genau das fangen diese Tests.
 *
 * Voraussetzung: der lokale Supabase-Stack läuft (Skill `eventtech-dev`).
 * Der Vite-Dev-Server wird bei Bedarf automatisch gestartet; ein bereits
 * laufender wird wiederverwendet (verwaiste Dev-Server sind ein bekannter
 * Stolperstein, siehe CLAUDE.md).
 *
 * Bewusst nur Chromium: ein stabiler Browser ist mehr wert als drei wacklige.
 */
export default defineConfig({
  testDir: "./e2e",
  // Entfernt nach jedem Lauf die TEST-E2E-Daten (der Job-Durchstich verschiebt
  // über die Oberfläche nur in den Papierkorb, die Zeile bliebe sonst liegen).
  globalTeardown: "./e2e/global-teardown.ts",
  // Kein Parallelbetrieb: Die Tests teilen sich eine Datenbank, und der
  // Rechnungs-Flow vergibt eine lückenlose Nummer — Parallelität würde die
  // Nachweise gegeneinander laufen lassen.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },
  projects: [
    // Meldet sich einmalig an und legt die Sitzung ab. Ohne diesen Schritt würde
    // sich jeder Test einzeln anmelden — nach wenigen Versuchen greift dann das
    // Rate-Limit der Supabase-Auth und die Tests scheitern an Timeouts, obwohl
    // die App völlig in Ordnung ist.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/state.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
