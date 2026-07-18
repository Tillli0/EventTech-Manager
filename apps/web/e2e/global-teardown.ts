import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Räumt nach jedem E2E-Lauf die Testdaten weg (Ritual aus CLAUDE.md:
 * „Testdaten nach dem Beweis wieder entfernen").
 *
 * Nötig, weil der Job-Durchstich über die Oberfläche nur in den **Papierkorb**
 * verschiebt — die Zeile bleibt also mit `deleted_at` liegen und würde sich über
 * viele Läufe ansammeln. Hier wird sie endgültig entfernt.
 *
 * Läuft bewusst „leise": Ist der lokale Stack nicht erreichbar (oder läuft der
 * Test gegen eine andere Umgebung), wird nur gewarnt statt den Lauf rot zu
 * machen — Aufräumen darf ein grünes Ergebnis nicht kippen.
 */
export default async function globalTeardown() {
  const sql = `
    delete from calendar_entries where job_id in (select id from jobs where title like 'TEST-E2E%');
    delete from packlist_items  where job_id in (select id from jobs where title like 'TEST-E2E%');
    delete from jobs where title like 'TEST-E2E%';
  `;

  try {
    const { stdout } = await run("docker", [
      "exec",
      "-i",
      "supabase_db_eventtech-manager",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-c",
      sql,
    ]);
    const geloescht = (stdout.match(/DELETE (\d+)/g) ?? []).join(", ");
    if (geloescht) console.log(`[e2e] Testdaten aufgeräumt: ${geloescht}`);
  } catch (err) {
    console.warn(
      "[e2e] Testdaten konnten nicht automatisch aufgeräumt werden " +
        "(lokaler Stack nicht erreichbar?). Reste finden: " +
        "select * from jobs where title like 'TEST-E2E%';\n" +
        String(err).slice(0, 200),
    );
  }
}
