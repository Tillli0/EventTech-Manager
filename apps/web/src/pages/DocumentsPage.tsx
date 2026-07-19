import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Files, Search, Folder, FolderOpen, Download, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SummaryStats } from "@/components/ui/SummaryStats";
import { YearFilter } from "@/components/ui/YearFilter";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useAllDocuments, openDocumentInNewTab, type DocumentWithEntity } from "@/hooks/useDocuments";
import { CATEGORY_META } from "@/components/documents/categoryMeta";
import { availableYears, filterByYear, type YearValue } from "@/lib/listGrouping";
import { formatBytes, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";
import { DOCUMENT_CATEGORY_LABELS } from "@/types/database";

const getDate = (d: DocumentWithEntity) => d.created_at;

// Ordner-Ansicht (PLAN-UI-NEUSCHNITT.md K-E): Dokumente nach Job sortiert, mit
// Ordner-Anmutung wie in professioneller Software. Umschaltbar auf Kategorie oder
// Datum — Standard „Nach Job", weil der Job Tills Denkeinheit ist.
type FolderMode = "job" | "kategorie" | "datum";

const MODE_OPTIONS: { value: FolderMode; label: string }[] = [
  { value: "job", label: "Nach Job" },
  { value: "kategorie", label: "Nach Kategorie" },
  { value: "datum", label: "Nach Datum" },
];

const MONTHS_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

interface Folder {
  key: string;
  label: string;
  /** Interner Link zum Vorgang (nur „Nach Job"), sonst null. */
  href: string | null;
  items: DocumentWithEntity[];
  bytes: number;
}

/** Dokumente in Ordner gruppieren — je nach Modus nach Vorgang, Kategorie oder Monat. */
function buildFolders(docs: DocumentWithEntity[], mode: FolderMode): Folder[] {
  const map = new Map<string, Folder>();

  for (const doc of docs) {
    let key: string;
    let label: string;
    let href: string | null = null;

    if (mode === "job") {
      key = doc.entityHref ?? `label:${doc.entityLabel}`;
      label = doc.entityLabel;
      href = doc.entityHref;
    } else if (mode === "kategorie") {
      key = `c:${doc.category}`;
      label = DOCUMENT_CATEGORY_LABELS[doc.category];
    } else {
      const d = new Date(doc.created_at);
      if (Number.isNaN(d.getTime())) {
        key = "0000-00";
        label = "Ohne Datum";
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
      }
    }

    const folder = map.get(key) ?? { key, label, href, items: [], bytes: 0 };
    folder.items.push(doc);
    folder.bytes += doc.size_bytes ?? 0;
    map.set(key, folder);
  }

  const folders = [...map.values()];
  if (mode === "datum") {
    folders.sort((a, b) => (a.key < b.key ? 1 : -1)); // neueste zuerst
  } else {
    // Größte Ordner zuerst, dann alphabetisch — der aktivste Vorgang steht oben.
    folders.sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label, "de-DE"));
  }
  return folders;
}

export function DocumentsPage() {
  const { data: documents, isLoading, error } = useAllDocuments();
  const toast = useToast();

  const [mode, setMode] = useState<FolderMode>("job");
  const [year, setYear] = useState<YearValue>(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const docs = useMemo(() => documents ?? [], [documents]);
  const years = useMemo(() => availableYears(docs, getDate), [docs]);
  const effectiveYear: YearValue =
    year !== "alle" && years.length > 0 && !years.includes(year) ? years[0] : year;

  const yearDocs = useMemo(() => filterByYear(docs, getDate, effectiveYear), [docs, effectiveYear]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("de-DE");
    if (!q) return yearDocs;
    return yearDocs.filter(
      (d) =>
        d.title.toLocaleLowerCase("de-DE").includes(q) ||
        d.file_name.toLocaleLowerCase("de-DE").includes(q) ||
        d.entityLabel.toLocaleLowerCase("de-DE").includes(q),
    );
  }, [yearDocs, search]);

  const folders = useMemo(() => buildFolders(filtered, mode), [filtered, mode]);
  const totalBytes = docs.reduce((sum, d) => sum + (d.size_bytes ?? 0), 0);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function open(doc: DocumentWithEntity) {
    try {
      await openDocumentInNewTab(doc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte das Dokument nicht öffnen.");
    }
  }

  function handleExport() {
    exportToCsv(
      `dokumente-${effectiveYear === "alle" ? "alle" : effectiveYear}`,
      [
        { label: "Titel", value: (d: DocumentWithEntity) => d.title },
        { label: "Kategorie", value: (d) => DOCUMENT_CATEGORY_LABELS[d.category] },
        { label: "Vorgang", value: (d) => d.entityLabel },
        { label: "Dateiname", value: (d) => d.file_name },
        { label: "Größe", value: (d) => d.size_bytes ?? 0 },
        { label: "Datum", value: (d) => formatDate(d.created_at) },
      ],
      filtered,
    );
  }

  return (
    <div>
      <PageHeader
        title="Dokumente"
        description="Genehmigungen, Baupläne, Verleiher-Rechnungen, Verträge und erzeugte PDFs — als Ordner je Vorgang."
        actions={
          docs.length > 0 ? (
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              CSV
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingState label="Dokumente werden geladen …" />
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : "Dokumente konnten nicht geladen werden."} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={Files}
          title="Noch keine Dokumente"
          description="Lade Dateien direkt am Job oder Kunden hoch — sie erscheinen dann auch hier gesammelt."
        />
      ) : (
        <div className="space-y-4">
          <SummaryStats
            stats={[
              { label: "Dokumente", value: String(docs.length) },
              { label: "Ordner", value: String(folders.length) },
              { label: "Gesamtgröße", value: formatBytes(totalBytes) },
              { label: "Automatisch archiviert", value: String(docs.filter((d) => d.is_auto).length), tone: "accent" },
            ]}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs options={MODE_OPTIONS} value={mode} onChange={setMode} size="sm" />
            <div className="flex items-center gap-2">
              <label className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2 sm:w-64">
                <Search size={15} className="shrink-0 text-ink-faint" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen (Titel, Vorgang …)"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </label>
              <YearFilter years={years} value={effectiveYear} onChange={setYear} />
            </div>
          </div>

          {folders.length === 0 ? (
            <p className="rounded-lg border border-border py-10 text-center text-sm text-ink-faint">
              Keine Dokumente in dieser Auswahl.
            </p>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => {
                const isCollapsed = collapsed.has(folder.key);
                return (
                  <div key={folder.key} className="overflow-hidden rounded-lg border border-border">
                    {/* Ordner-Kopf */}
                    <button
                      type="button"
                      onClick={() => toggle(folder.key)}
                      className="flex w-full items-center gap-3 bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-raised"
                      aria-expanded={!isCollapsed}
                    >
                      <ChevronRight
                        size={15}
                        className={cn("shrink-0 text-ink-muted transition-transform", !isCollapsed && "rotate-90")}
                      />
                      {isCollapsed ? (
                        <Folder size={17} className="shrink-0 text-accent" strokeWidth={1.75} />
                      ) : (
                        <FolderOpen size={17} className="shrink-0 text-accent" strokeWidth={1.75} />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{folder.label}</span>
                      <span className="shrink-0 font-mono text-xs text-ink-faint">
                        {folder.items.length} · {formatBytes(folder.bytes)}
                      </span>
                      {folder.href && (
                        <Link
                          to={folder.href}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-xs text-accent transition-colors hover:text-accent-hover"
                        >
                          Öffnen →
                        </Link>
                      )}
                    </button>

                    {/* Ordner-Inhalt */}
                    {!isCollapsed && (
                      <ul className="divide-y divide-border-subtle border-t border-border">
                        {folder.items.map((doc) => {
                          const meta = CATEGORY_META[doc.category];
                          const Icon = meta.icon;
                          return (
                            <li
                              key={doc.id}
                              className="flex items-center gap-3 px-4 py-2.5 pl-11 transition-colors hover:bg-bg-raised/40"
                            >
                              <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-md", meta.bg)}>
                                <Icon size={15} className={meta.text} strokeWidth={1.75} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink">
                                  <span className="truncate">{doc.title}</span>
                                  {doc.is_auto && (
                                    <span className="flex-none rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-medium text-accent">
                                      auto
                                    </span>
                                  )}
                                </p>
                                <p className="truncate text-xs text-ink-faint">
                                  {mode === "kategorie" ? doc.entityLabel : DOCUMENT_CATEGORY_LABELS[doc.category]} ·{" "}
                                  {formatBytes(doc.size_bytes)} · {formatDate(doc.created_at)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void open(doc)}
                                aria-label={`„${doc.title}" öffnen`}
                                title="Öffnen"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-bg-raised hover:text-ink"
                              >
                                <ExternalLink size={15} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
