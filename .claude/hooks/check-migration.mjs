#!/usr/bin/env node
// Migrations-Waechter (PostToolUse auf Write/Edit).
// Prueft neu geschriebene Dateien unter supabase/migrations/*.sql gegen die drei
// teuersten dokumentierten "Stolpersteine" (siehe CLAUDE.md):
//   1. doppelte Migrationsnummer,
//   2. `create table` ohne RLS / ohne GRANTs (-> still leere Daten/403),
//   3. ENUM-Falle: `alter type ... add value` gemeinsam mit dessen Nutzung.
// Faellt bei internen Fehlern bewusst "offen" aus (exit 0), damit der Hook den
// Arbeitsfluss nie blockiert. Warnungen gehen ueber exit 2 an Claude zurueck.
import fs from "node:fs";
import path from "node:path";

function main() {
  let raw = "";
  try { raw = fs.readFileSync(0, "utf8"); } catch { process.exit(0); }
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const input = data.tool_input || {};
  const filePath = input.file_path || "";
  const norm = filePath.replace(/\\/g, "/");
  if (!/supabase\/migrations\/.*\.sql$/i.test(norm)) process.exit(0);

  let content = "";
  try { content = fs.readFileSync(filePath, "utf8"); }
  catch { content = input.content || input.new_string || ""; }
  const lc = content.toLowerCase();
  const warnings = [];

  const base = path.basename(norm);
  const m = base.match(/^(\d{4})_/);
  if (m) {
    const num = m[1];
    const dir = path.dirname(filePath);
    try {
      const others = fs.readdirSync(dir).filter((f) => f.startsWith(num + "_") && f !== base);
      if (others.length) warnings.push(`Migrationsnummer ${num} ist doppelt: auch ${others.join(", ")}. Naechste freie Nummer waehlen (ls supabase/migrations/ | tail).`);
    } catch { /* ignore */ }
  }

  if (/create\s+table/.test(lc)) {
    if (!/enable\s+row\s+level\s+security/.test(lc))
      warnings.push("`create table` ohne `enable row level security` — RLS aktivieren (Schablone aus 0012).");
    if (!/\bgrant\b/.test(lc))
      warnings.push("`create table` ohne `grant` — explizite GRANTs fuer authenticated + service_role (sonst still leere Daten/403).");
  }

  if (/add\s+value/.test(lc) && /(create\s+policy|create\s+(or\s+replace\s+)?function|create\s+table|has_area\s*\()/.test(lc))
    warnings.push("ENUM-Falle: `alter type ... add value` und dessen Nutzung duerfen NICHT in derselben Datei stehen (bricht die Cloud-Action). In getrennte Migrationen aufteilen.");

  if (warnings.length) {
    process.stderr.write("Migrations-Waechter (" + base + "):\n- " + warnings.join("\n- ") + "\n");
    process.exit(2);
  }
  process.exit(0);
}

try { main(); } catch { process.exit(0); }
