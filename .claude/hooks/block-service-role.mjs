#!/usr/bin/env node
// Service-Role-Sperre (PreToolUse auf Write/Edit).
// Blockiert jeden Schreibvorgang unter apps/web/, dessen neuer Inhalt einen
// Service-Role-KEY (bzw. dessen Env-Namen) enthaelt. Harte Invariante aus
// CLAUDE.md: Service-Role nur serverseitig (Edge Functions), nie im Frontend.
// Absichtlich eng gefasst (…-role-KEY / SUPABASE_SERVICE_ROLE), damit blosse
// Erwaehnungen der Postgres-Rolle "service_role" (z. B. in Kommentaren) nicht
// faelschlich blockieren. Faellt bei internen Fehlern offen aus (exit 0).
import fs from "node:fs";

function main() {
  let raw = "";
  try { raw = fs.readFileSync(0, "utf8"); } catch { process.exit(0); }
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const input = data.tool_input || {};
  const filePath = (input.file_path || "").replace(/\\/g, "/");
  if (!/(^|\/)apps\/web\//.test(filePath)) process.exit(0);

  const text = [input.content, input.new_string].filter(Boolean).join("\n");
  if (/(service[_-]?role[_-]?key|supabase_service_role)/i.test(text)) {
    process.stderr.write(
      "Service-Role im Frontend blockiert: " + filePath + " darf keinen Service-Role-Key/Env-Namen enthalten.\n" +
      "Service-Role nur serverseitig (Edge Functions). Siehe CLAUDE.md 'Stolpersteine'.\n",
    );
    process.exit(2);
  }
  process.exit(0);
}

try { main(); } catch { process.exit(0); }
