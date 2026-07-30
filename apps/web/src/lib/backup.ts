import { supabase } from "@/lib/supabase";

/**
 * Client-seitige Datensicherung: liest die angegebenen Tabellen über die
 * (RLS-abgesicherte) Data-API und lädt sie als eine JSON-Datei herunter.
 *
 * Bewusst ohne Edge Function / Service-Role — es wird nur exportiert, was der
 * angemeldete Innen-Nutzer ohnehin lesen darf. Für Admin/Verwaltung sind das
 * alle fachlichen Daten. Kein Secret, kein Deploy nötig.
 */

/**
 * Alle fachlichen Tabellen (komplette Datensicherung).
 *
 * War seit der Rechnungs-/Anmietungs-Neuausrichtung (2026-07) veraltet — Rechnungen,
 * Dokumente, Verleih-Partner, Anmiet-Vorgänge und Kosten fehlten hier komplett und
 * wurden bei "Backup erstellen" still nicht mitgesichert. Beim Ergänzen neuer
 * fachlicher Tabellen IMMER hier eintragen, sonst lügt die Datensicherung weiter.
 */
export const FULL_BACKUP_TABLES: string[] = [
  "company_settings",
  "categories",
  "locations",
  "devices",
  "barcodes",
  "device_photos",
  "device_documents",
  "device_sets",
  "device_set_items",
  "device_history",
  "customers",
  "customer_inquiries",
  "customer_notes",
  "website_leads",
  "venues",
  "jobs",
  "job_assignees",
  "job_milestones",
  "milestone_assignees",
  "job_costs",
  "cost_settings",
  "job_services",
  "job_templates",
  "job_template_items",
  "job_notes",
  "job_retrospectives",
  "packlist_items",
  "offers",
  "offer_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "invoice_dunnings",
  "suppliers",
  "subrentals",
  "subrental_items",
  "subrental_order_emails",
  "documents",
  "tasks",
  "task_checklist_items",
  "calendar_entries",
  "calendar_feeds",
  "personal_blocks",
  "personal_recurring_blocks",
  "profiles",
  "user_area_access",
];

/** Nur Inventar-relevante Tabellen (separate Inventar-Sicherung). */
export const INVENTORY_BACKUP_TABLES: string[] = [
  "categories",
  "locations",
  "devices",
  "barcodes",
  "device_photos",
  "device_documents",
  "device_sets",
  "device_set_items",
  "device_history",
];

export interface BackupResult {
  fileName: string;
  tableCount: number;
  rowCount: number;
  errors: { table: string; message: string }[];
}

interface BackupFile {
  meta: {
    app: string;
    kind: string;
    generated_at: string;
    tables: string[];
  };
  data: Record<string, unknown[]>;
  errors: Record<string, string>;
}

function timestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function triggerDownload(fileName: string, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exportiert die Tabellen als JSON-Datei. Fehlschläge einzelner Tabellen (z.B.
 * fehlende Leserechte) brechen die Sicherung nicht ab, sondern werden gesammelt
 * mitgeliefert und zurückgegeben.
 */
export async function exportBackup(
  tables: string[],
  kind: "komplett" | "inventar",
): Promise<BackupResult> {
  const data: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};
  let rowCount = 0;

  for (const table of tables) {
    const { data: rows, error } = await supabase.from(table).select("*");
    if (error) {
      errors[table] = error.message;
      continue;
    }
    data[table] = rows ?? [];
    rowCount += rows?.length ?? 0;
  }

  const now = new Date();
  const file: BackupFile = {
    meta: {
      app: "EventTech-Manager",
      kind,
      generated_at: now.toISOString(),
      tables,
    },
    data,
    errors,
  };

  const fileName = `eventtech-backup-${kind}-${timestamp(now)}.json`;
  triggerDownload(fileName, JSON.stringify(file, null, 2));

  return {
    fileName,
    tableCount: Object.keys(data).length,
    rowCount,
    errors: Object.entries(errors).map(([table, message]) => ({ table, message })),
  };
}
