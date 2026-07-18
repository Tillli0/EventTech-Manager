import { File, FileCheck, FileSignature, FileText, Map, Receipt } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DocumentCategory } from "@/types/database";

/**
 * Optik je Dokument-Kategorie (Design-Tokens, keine Roh-Farben). Geteilt zwischen
 * der Karte am Vorgang (DocumentsCard) und der zentralen Dokumente-Seite, damit die
 * Farb-/Icon-Zuordnung an einer Stelle lebt.
 */
export const CATEGORY_META: Record<DocumentCategory, { icon: LucideIcon; text: string; bg: string }> = {
  genehmigung: { icon: FileCheck, text: "text-status-wartung", bg: "bg-status-wartung-bg" },
  bauplan: { icon: Map, text: "text-status-ausgeliehen", bg: "bg-status-ausgeliehen-bg" },
  eingangsrechnung: { icon: Receipt, text: "text-job-laeuft", bg: "bg-job-laeuft/10" },
  vertrag: { icon: FileSignature, text: "text-job-planung", bg: "bg-job-planung/10" },
  angebot: { icon: FileText, text: "text-job-rueckgabe", bg: "bg-job-rueckgabe/10" },
  rechnung: { icon: FileText, text: "text-status-verfuegbar", bg: "bg-status-verfuegbar-bg" },
  sonstiges: { icon: File, text: "text-ink-muted", bg: "bg-bg-raised" },
};
