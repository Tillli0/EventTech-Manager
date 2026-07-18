import { useRef, useState, type DragEvent } from "react";
import { ExternalLink, File, FileCheck, FileSignature, FileText, Files, Map, Plus, Receipt, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select, FormField } from "@/components/ui/Input";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/auth/AuthProvider";
import { useDocuments, useUploadDocument, useDeleteDocument, openDocumentInNewTab } from "@/hooks/useDocuments";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_UPLOAD_CATEGORIES,
  type DocumentCategory,
  type DocumentEntityType,
  type DocumentRecord,
} from "@/types/database";

// Wiederverwendbare Dokumente-Karte (Etappe D2, PLAN-NEUAUSRICHTUNG.md).
// Ruhige Tabellen-Optik nach dem freigegebenen Zielbild: farbige Kategorie-Kachel,
// Titel + Unterzeile, Kategorie-Badge, Datum/Größe mono, Aktionen rechts.
// Der Bucket ist privat — Öffnen läuft über kurzlebige signierte URLs.

/** Farbige Kachel + Badge je Kategorie (Design-Tokens, keine Roh-Farben). */
const CATEGORY_META: Record<DocumentCategory, { icon: LucideIcon; text: string; bg: string }> = {
  genehmigung: { icon: FileCheck, text: "text-status-wartung", bg: "bg-status-wartung-bg" },
  bauplan: { icon: Map, text: "text-status-ausgeliehen", bg: "bg-status-ausgeliehen-bg" },
  eingangsrechnung: { icon: Receipt, text: "text-job-laeuft", bg: "bg-job-laeuft/10" },
  vertrag: { icon: FileSignature, text: "text-job-planung", bg: "bg-job-planung/10" },
  angebot: { icon: FileText, text: "text-job-rueckgabe", bg: "bg-job-rueckgabe/10" },
  rechnung: { icon: FileText, text: "text-status-verfuegbar", bg: "bg-status-verfuegbar-bg" },
  sonstiges: { icon: File, text: "text-ink-muted", bg: "bg-bg-raised" },
};

/** Welcher Bereich zum Bearbeiten berechtigt — spiegelt can_edit_document() aus Migration 0038. */
function useMayEditDocuments(entityType: DocumentEntityType): boolean {
  const { canEdit, isAdmin } = useAuth();
  switch (entityType) {
    case "job":
      return canEdit("jobs");
    case "customer":
      return canEdit("kunden");
    case "offer":
    case "invoice":
      return canEdit("angebote");
    case "company":
      return isAdmin;
  }
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 lg:grid-cols-[minmax(0,1fr)_8.5rem_5.5rem_4.5rem_auto]";

export function DocumentsCard({
  entityType,
  entityId,
  uploadCategories = DOCUMENT_UPLOAD_CATEGORIES,
}: {
  entityType: DocumentEntityType;
  entityId: string;
  uploadCategories?: DocumentCategory[];
}) {
  const { data: documents, isLoading, error } = useDocuments(entityType, entityId);
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const mayEdit = useMayEditDocuments(entityType);
  const toast = useToast();
  const confirm = useConfirm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>(uploadCategories[0] ?? "sonstiges");
  const [dragActive, setDragActive] = useState(false);

  const totalBytes = (documents ?? []).reduce((sum, d) => sum + (d.size_bytes ?? 0), 0);

  function takeFile(file: File | undefined) {
    if (!file) return;
    setTitle(stripExtension(file.name));
    setCategory(uploadCategories[0] ?? "sonstiges");
    setPendingFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (!mayEdit) return;
    takeFile(e.dataTransfer.files?.[0]);
  }

  async function handleUpload() {
    if (!pendingFile || !title.trim()) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    try {
      await upload.mutateAsync({ entityType, entityId, file: pendingFile, title, category });
      toast.success("Dokument hochgeladen.");
      setPendingFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hochladen fehlgeschlagen.");
    }
  }

  async function handleOpen(doc: DocumentRecord) {
    try {
      await openDocumentInNewTab(doc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte das Dokument nicht öffnen.");
    }
  }

  async function handleDelete(doc: DocumentRecord) {
    const ok = await confirm({
      title: "Dokument löschen",
      message: `„${doc.title}" wird endgültig gelöscht — Datei und Eintrag.`,
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(doc);
      toast.success("Dokument gelöscht.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <Card
      onDragOver={(e) => {
        if (!mayEdit) return;
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      className={cn(dragActive && "border-accent")}
    >
      <CardHeader className="flex items-center gap-2">
        <Files size={16} className="text-accent" />
        <h2 className="text-sm font-semibold text-ink">Dokumente</h2>
        {documents && documents.length > 0 && (
          <span className="font-mono text-xs text-ink-faint">
            {documents.length} · {formatBytes(totalBytes)}
          </span>
        )}
        {mayEdit && (
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={14} />
            Hinzufügen
          </Button>
        )}
      </CardHeader>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          takeFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {isLoading ? (
        <div className="px-5 py-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 py-2.5">
              <div className="h-8 w-8 rounded-md bg-bg-raised" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/5 rounded bg-bg-raised" />
                <div className="h-2.5 w-1/4 rounded bg-bg-raised" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-5 py-4">
          <ErrorState message={error instanceof Error ? error.message : "Dokumente konnten nicht geladen werden."} />
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState
            icon={Files}
            title="Noch keine Dokumente"
            description="Genehmigungen, Baupläne, Verträge und Belege liegen hier direkt am Vorgang."
            action={
              mayEdit ? (
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Plus size={14} />
                  Dokument hinzufügen
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="px-5 pb-2 pt-1">
          <div className={cn(ROW_GRID, "hidden border-b border-border pb-1.5 pt-1 lg:grid")}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Dokument</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Kategorie</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Datum</span>
            <span className="text-right text-[10px] font-medium uppercase tracking-wider text-ink-faint">Größe</span>
            <span />
          </div>
          <ul className="divide-y divide-border-subtle">
            {documents.map((doc) => {
              const meta = CATEGORY_META[doc.category] ?? CATEGORY_META.sonstiges;
              const Icon = meta.icon;
              return (
                <li key={doc.id} className={cn(ROW_GRID, "py-2.5")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-md", meta.bg)}>
                      <Icon size={15} className={meta.text} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink">
                        <span className="truncate">{doc.title}</span>
                        {doc.is_auto && (
                          <span className="flex-none rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-medium text-accent">
                            auto
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        <span className="lg:hidden">
                          {DOCUMENT_CATEGORY_LABELS[doc.category]} · {formatBytes(doc.size_bytes)} ·{" "}
                          {formatDate(doc.created_at)}
                        </span>
                        <span className="hidden lg:inline">{doc.file_name}</span>
                      </p>
                    </div>
                  </div>
                  <span className="hidden lg:block">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        meta.bg,
                        meta.text,
                      )}
                    >
                      {DOCUMENT_CATEGORY_LABELS[doc.category]}
                    </span>
                  </span>
                  <span className="hidden font-mono text-xs text-ink-muted lg:block">{formatDate(doc.created_at)}</span>
                  <span className="hidden text-right font-mono text-xs text-ink-muted lg:block">
                    {formatBytes(doc.size_bytes)}
                  </span>
                  <span className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`„${doc.title}" öffnen`}
                      title="Öffnen"
                      onClick={() => void handleOpen(doc)}
                    >
                      <ExternalLink size={15} />
                    </Button>
                    {mayEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`„${doc.title}" löschen`}
                        title="Löschen"
                        onClick={() => void handleDelete(doc)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={!!pendingFile} onClose={() => setPendingFile(null)} title="Dokument hinzufügen">
        {pendingFile && (
          <div className="space-y-4">
            <p className="rounded-md border border-border bg-bg-raised px-3 py-2 font-mono text-xs text-ink-muted">
              {pendingFile.name} · {formatBytes(pendingFile.size)}
            </p>
            <FormField label="Titel">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </FormField>
            <FormField label="Kategorie">
              <Select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
                {uploadCategories.map((c) => (
                  <option key={c} value={c}>
                    {DOCUMENT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingFile(null)}>
                Abbrechen
              </Button>
              <Button variant="primary" onClick={() => void handleUpload()} disabled={upload.isPending}>
                {upload.isPending ? "Lädt hoch …" : "Hochladen"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
