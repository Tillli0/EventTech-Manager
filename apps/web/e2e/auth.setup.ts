import { test as setup, expect } from "@playwright/test";
import { LOGIN_EMAIL, LOGIN_PASSWORD, AUTH_STATE_PATH } from "./helpers";

/**
 * Meldet sich EINMAL an und legt die Sitzung ab; alle Tests starten damit
 * bereits eingeloggt.
 *
 * Warum das sein muss (teuer gelernt): Meldet sich jeder Test einzeln an,
 * greift nach wenigen Versuchen das Rate-Limit der Supabase-Auth — die ersten
 * Tests laufen grün, der Rest scheitert an Timeouts. Das sieht wie ein
 * kaputtes UI aus, ist aber nur die gedrosselte Anmeldung.
 */
setup("anmelden", async ({ page }) => {
  await page.goto("/");

  const emailField = page.getByPlaceholder("name@firma.de");
  await expect(emailField).toBeVisible({ timeout: 30_000 });

  await emailField.fill(LOGIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill(LOGIN_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Erfolgreich ist die Anmeldung erst, wenn die App den Login verlassen hat.
  await expect(emailField).toBeHidden({ timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
