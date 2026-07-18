import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DocumentCategory, DocumentEntityType, DocumentRecord, Invoice, Offer } from "@/types/database";
import { renderInvoicePdfBlob } from "@/lib/invoicePdf";
import { renderOfferPdfBlob } from "@/lib/offerPdf";
import { archivedDocumentName } from "@/lib/documentNaming";

// Dokumenten-Ablage (Migration 0038). Der Storage-Bucket 'documents' ist PRIVAT —
// Dateien werden ausschließlich über kurzlebige signierte URLs geöffnet. Die
// Storage-Policies koppeln Lesen/Löschen an die Sichtbarkeit der documents-Zeile,
// deshalb ist die Reihenfolge beim Löschen wichtig (erst Datei, dann Zeile).

const DOCUMENTS_KEY = ["documents"] as const;

const DOCUMENTS_BUCKET = "documents";

/** Ein Dokument samt aufgelöstem Vorgang (Anzeigename + Ziel-Link) für die zentrale Sicht. */
export interface DocumentWithEntity extends DocumentRecord {
  entityLabel: string;
  /** Interner Link zum Vorgang, falls auflösbar (sonst null). */
  entityHref: string | null;
}

const ENTITY_FALLBACK_LABEL: Record<DocumentEntityType, string> = {
  job: "Job",
  customer: "Kunde",
  offer: "Angebot",
  invoice: "Rechnung",
  company: "Firma",
};

function customerName(c: { company_name: string | null; first_name: string | null; last_name: string | null }): string {
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Kunde";
}

/**
 * Alle für den Nutzer sichtbaren Dokumente (RLS filtert zeilenweise) für die zentrale
 * Dokumente-Seite. Löst den Vorgang je Zeile über Sammel-Abfragen auf: Job-Titel und
 * Kundennamen inkl. Ziel-Link. Andere Vorgangs-Typen bekommen ein generisches Label.
 */
export function useAllDocuments() {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, "all"],
    queryFn: async (): Promise<DocumentWithEntity[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const docs = (data ?? []) as DocumentRecord[];

      const idsOf = (type: DocumentEntityType) =>
        [...new Set(docs.filter((d) => d.entity_type === type).map((d) => d.entity_id))];
      const invoiceIds = idsOf("invoice");
      const offerIds = idsOf("offer");

      // Belege (Rechnung/Angebot) hängen am eigenen Vorgang, sollen in der Gesamtsicht
      // aber ihren Job zeigen. Dafür zuerst deren Job-/Kundenbezug auflösen …
      const [invoicesRes, offersRes] = await Promise.all([
        invoiceIds.length
          ? supabase.from("invoices").select("id, invoice_number, job_id, customer_id").in("id", invoiceIds)
          : Promise.resolve({ data: [], error: null }),
        offerIds.length
          ? supabase.from("offers").select("id, offer_number, job_id, customer_id").in("id", offerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (invoicesRes.error) throw invoicesRes.error;
      if (offersRes.error) throw offersRes.error;

      const invoiceMeta = new Map(
        (invoicesRes.data ?? []).map((i) => [i.id, { number: i.invoice_number as string | null, job_id: i.job_id as string | null, customer_id: i.customer_id as string | null }]),
      );
      const offerMeta = new Map(
        (offersRes.data ?? []).map((o) => [o.id, { number: o.offer_number as string | null, job_id: o.job_id as string | null, customer_id: o.customer_id as string | null }]),
      );

      // … dann alle benötigten Job-/Kunden-IDs sammeln (direkte + über Belege).
      const jobIds = [
        ...new Set([
          ...idsOf("job"),
          ...[...invoiceMeta.values(), ...offerMeta.values()].map((m) => m.job_id).filter((v): v is string => !!v),
        ]),
      ];
      const customerIds = [
        ...new Set([
          ...idsOf("customer"),
          ...[...invoiceMeta.values(), ...offerMeta.values()].map((m) => m.customer_id).filter((v): v is string => !!v),
        ]),
      ];

      const [jobsRes, customersRes] = await Promise.all([
        jobIds.length
          ? supabase.from("jobs").select("id, title").in("id", jobIds)
          : Promise.resolve({ data: [], error: null }),
        customerIds.length
          ? supabase.from("customers").select("id, company_name, first_name, last_name").in("id", customerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (jobsRes.error) throw jobsRes.error;
      if (customersRes.error) throw customersRes.error;

      const jobTitle = new Map((jobsRes.data ?? []).map((j) => [j.id, j.title as string]));
      const customerLabel = new Map((customersRes.data ?? []).map((c) => [c.id, customerName(c)]));

      /** Beleg-Vorgang auflösen: bevorzugt Job, sonst Kunde, sonst Beleg-Nummer. */
      function belegEntity(
        meta: { number: string | null; job_id: string | null; customer_id: string | null } | undefined,
        fallback: DocumentEntityType,
      ): { entityLabel: string; entityHref: string | null } {
        if (meta?.job_id && jobTitle.has(meta.job_id)) {
          return { entityLabel: jobTitle.get(meta.job_id)!, entityHref: `/jobs/${meta.job_id}` };
        }
        if (meta?.customer_id && customerLabel.has(meta.customer_id)) {
          return { entityLabel: customerLabel.get(meta.customer_id)!, entityHref: `/kunden/${meta.customer_id}` };
        }
        return { entityLabel: meta?.number ?? ENTITY_FALLBACK_LABEL[fallback], entityHref: null };
      }

      return docs.map((d): DocumentWithEntity => {
        if (d.entity_type === "job") {
          return {
            ...d,
            entityLabel: jobTitle.get(d.entity_id) ?? "Job (gelöscht)",
            entityHref: jobTitle.has(d.entity_id) ? `/jobs/${d.entity_id}` : null,
          };
        }
        if (d.entity_type === "customer") {
          return {
            ...d,
            entityLabel: customerLabel.get(d.entity_id) ?? "Kunde (gelöscht)",
            entityHref: customerLabel.has(d.entity_id) ? `/kunden/${d.entity_id}` : null,
          };
        }
        if (d.entity_type === "invoice") return { ...d, ...belegEntity(invoiceMeta.get(d.entity_id), "invoice") };
        if (d.entity_type === "offer") return { ...d, ...belegEntity(offerMeta.get(d.entity_id), "offer") };
        return { ...d, entityLabel: ENTITY_FALLBACK_LABEL[d.entity_type], entityHref: null };
      });
    },
  });
}

/** Alle Dokumente eines Vorgangs (Job, Kunde, …), neueste zuerst. */
export function useDocuments(entityType: DocumentEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, entityType, entityId],
    enabled: !!entityId,
    queryFn: async (): Promise<DocumentRecord[]> => {
      if (!entityId) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRecord[];
    },
  });
}

export interface UploadDocumentInput {
  entityType: DocumentEntityType;
  entityId: string;
  file: File;
  title: string;
  category: DocumentCategory;
}

/**
 * Lädt die Datei in den privaten Bucket und legt die documents-Zeile an.
 * Schlägt das Anlegen der Zeile fehl (z. B. fehlendes Schreibrecht), wird die
 * bereits hochgeladene Datei wieder entfernt — keine verwaisten Dateien.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<DocumentRecord> => {
      const { entityType, entityId, file, title, category } = input;
      const id = crypto.randomUUID();
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const path = `${entityType}/${entityId}/${id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("documents")
        .insert({
          id,
          entity_type: entityType,
          entity_id: entityId,
          category,
          title: title.trim(),
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
        })
        .select("*")
        .single();
      if (error) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
        throw error;
      }
      return data as DocumentRecord;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: [...DOCUMENTS_KEY, doc.entity_type, doc.entity_id] });
    },
  });
}

/**
 * Löscht Datei UND Zeile. Reihenfolge: erst die Datei (die Storage-Delete-Policy
 * prüft über die noch vorhandene Zeile das Bearbeitungsrecht), dann die Zeile.
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: DocumentRecord): Promise<DocumentRecord> => {
      const { error: storageError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([doc.storage_path]);
      if (storageError) throw storageError;

      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      return doc;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: [...DOCUMENTS_KEY, doc.entity_type, doc.entity_id] });
    },
  });
}

/**
 * Stellt eine kurzlebige signierte URL aus (privater Bucket) und öffnet sie in
 * einem neuen Tab. RLS entscheidet, ob das Signieren überhaupt erlaubt ist.
 */
export async function openDocumentInNewTab(doc: DocumentRecord): Promise<void> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}

// ============================================================
// Auto-Archivierung erzeugter Beleg-PDFs (D4)
// ============================================================
//
// Beim Stellen einer Rechnung / Senden eines Angebots wird das erzeugte PDF
// dauerhaft im Dokumente-System abgelegt (GoBD-Archiv + Tills „alles an einem Ort").
// Bewusst am eigenen Vorgang (`invoice`/`offer`): das Schreibrecht dort ist
// `can_edit_area('angebote')` — genau das Recht, das man zum Stellen/Senden ohnehin
// hat. (Am Job zu hängen bräuchte `jobs`-Schreibrecht.) In der zentralen Sicht
// verlinken die Belege trotzdem auf ihren Job.
//
// Idempotent: Der `storage_path` leitet sich fest aus der Beleg-ID ab; ein zweiter
// Aufruf (Retry nach Teil-Fehler, erneutes Speichern) erzeugt keine Dublette.

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";

/** Storage-Fehler „Datei existiert bereits" (409) — bei Retry nach Teil-Fehler zu erwarten. */
const isStorageDuplicate = (err: unknown): boolean => {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { statusCode?: string | number; status?: number; message?: string };
  return (
    e.statusCode === "409" ||
    e.statusCode === 409 ||
    e.status === 409 ||
    /already exists|duplicate/i.test(e.message ?? "")
  );
};

/**
 * Legt ein erzeugtes Beleg-PDF idempotent im privaten Bucket ab und schreibt die
 * documents-Zeile (`is_auto = true`). Best-effort — Aufrufer behandeln Fehler weich,
 * da der Beleg selbst (Rechnung/Angebot) bereits gültig ist.
 */
async function archiveGeneratedPdf(opts: {
  entityType: Extract<DocumentEntityType, "invoice" | "offer">;
  entityId: string;
  category: Extract<DocumentCategory, "rechnung" | "angebot">;
  title: string;
  fileName: string;
  blob: Blob;
}): Promise<void> {
  const { entityType, entityId, category, title, fileName, blob } = opts;
  const storagePath = `${entityType}/${entityId}/auto/${category}-${entityId}.pdf`;

  // Schon archiviert? Dann nichts tun (idempotent).
  const { data: existing, error: exErr } = await supabase
    .from("documents")
    .select("id")
    .eq("storage_path", storagePath)
    .maybeSingle();
  if (exErr) throw exErr;
  if (existing) return;

  // upsert:false wie beim manuellen Upload — upsert:true würde die Storage-Update-Policy
  // auslösen, die eine (hier noch fehlende) documents-Zeile verlangt. Existiert die Datei
  // aus einem früheren Teil-Fehler bereits, ist das kein Problem: wir legen nur die Zeile nach.
  const { error: upErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, blob, { contentType: "application/pdf", upsert: false });
  if (upErr && !isStorageDuplicate(upErr)) throw upErr;

  const { error: insErr } = await supabase.from("documents").insert({
    entity_type: entityType,
    entity_id: entityId,
    category,
    title,
    file_name: fileName,
    storage_path: storagePath,
    mime_type: "application/pdf",
    size_bytes: blob.size,
    is_auto: true,
  });
  if (insErr) {
    // Parallel-Anlage (Race) → als Erfolg werten; sonst die Datei aufräumen.
    if (isUniqueViolation(insErr)) return;
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw insErr;
  }
}

/** Kundenname (Firma oder Vor-/Nachname) für den Dateinamen. */
function customerDisplayName(customer: Invoice["customer"] | Offer["customer"]): string {
  if (!customer) return "";
  return customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "";
}

/** Gestellte Rechnung als PDF archivieren (Kategorie „rechnung"). */
export async function archiveInvoicePdf(invoice: Invoice): Promise<void> {
  if (!invoice.invoice_number) return; // Entwürfe haben keine Nummer → nichts archivieren
  const blob = await renderInvoicePdfBlob(invoice);
  await archiveGeneratedPdf({
    entityType: "invoice",
    entityId: invoice.id,
    category: "rechnung",
    title: `Rechnung ${invoice.invoice_number}`,
    fileName: archivedDocumentName(invoice.invoice_number, customerDisplayName(invoice.customer)),
    blob,
  });
}

/** Gesendetes Angebot als PDF archivieren (Kategorie „angebot"). */
export async function archiveOfferPdf(offer: Offer): Promise<void> {
  const blob = await renderOfferPdfBlob(offer);
  await archiveGeneratedPdf({
    entityType: "offer",
    entityId: offer.id,
    category: "angebot",
    title: `Angebot ${offer.offer_number}`,
    fileName: archivedDocumentName(offer.offer_number, customerDisplayName(offer.customer)),
    blob,
  });
}
