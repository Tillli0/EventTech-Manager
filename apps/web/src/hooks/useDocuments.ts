import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DocumentCategory, DocumentEntityType, DocumentRecord } from "@/types/database";

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

      const jobIds = [...new Set(docs.filter((d) => d.entity_type === "job").map((d) => d.entity_id))];
      const customerIds = [...new Set(docs.filter((d) => d.entity_type === "customer").map((d) => d.entity_id))];

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
