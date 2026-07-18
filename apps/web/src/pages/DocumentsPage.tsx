import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Files, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SummaryStats } from "@/components/ui/SummaryStats";
import { YearFilter } from "@/components/ui/YearFilter";
import { GroupHeaderRow } from "@/components/ui/GroupRow";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useAllDocuments, openDocumentInNewTab, type DocumentWithEntity } from "@/hooks/useDocuments";
import { CATEGORY_META } from "@/components/documents/categoryMeta";
import { availableYears, filterByYear, groupItems, type YearValue } from "@/lib/listGrouping";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from "@/types/database";

type CategoryFilter = DocumentCategory | "alle";

// Reihenfolge der Kategorie-Spalte (links). „angebot"/„rechnung" sind die automatisch
// archivierten PDFs (Etappe D4) und stehen hinten.
const CATEGORY_ORDER: DocumentCategory[] = [
  "genehmigung",
  "bauplan",
  "eingangsrechnung",
  "vertrag",
  "angebot",
  "rechnung",
  "sonstiges",
];

const getDate = (d: DocumentWithEntity) => d.created_at;

export function DocumentsPage() {
  const { data: documents, isLoading, error } = useAllDocuments();
  const toast = useToast();

  const [category, setCategory] = useState<CategoryFilter>("alle");
  const [year, setYear] = useState<YearValue>(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const docs = useMemo(() => documents ?? [], [documents]);
  const years = useMemo(() => availableYears(docs, getDate), [docs]);
  // Wenn das gewählte Jahr keine Daten hat, aufs neueste vorhandene ausweichen.
  const effectiveYear: YearValue =
    year !== "alle" && years.length > 0 && !years.includes(year) ? years[0] : year;

  const yearDocs = useMemo(() => filterByYear(docs, getDate, effectiveYear), [docs, effectiveYear]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<DocumentCategory, number>();
    for (const d of yearDocs) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    return counts;
  }, [yearDocs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("de-DE");
    return yearDocs.filter((d) => {
      if (category !== "alle" && d.category !== category) return false;
      if (!q) return true;
      return (
        d.title.toLocaleLowerCase("de-DE").includes(q) ||
        d.file_name.toLocaleLowerCase("de-DE").includes(q) ||
        d.entityLabel.toLocaleLowerCase("de-DE").includes(q)
      );
    });
  }, [yearDocs, category, search]);

  const groups = useMemo(
    () =>
      groupItems(filtered, "monat", {
        getDate,
        getCustomer: () => null,
        getValue: (d) => d.size_bytes ?? 0,
      }),
    [filtered],
  );

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

  return (
    <div>
      <PageHeader
        title="Dokumente"
        description="Genehmigungen, Baupläne, Verleiher-Rechnungen, Verträge und erzeugte PDFs — an einem Ort, verknüpft mit ihrem Vorgang."
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
              { label: "Gesamtgröße", value: formatBytes(totalBytes) },
              { label: "Automatisch archiviert", value: String(docs.filter((d) => d.is_auto).length), tone: "accent" },
            ]}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2 sm:max-w-xs">
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

          <div className="grid gap-4 lg:grid-cols-[184px_minmax(0,1fr)]">
            {/* Kategorie-Spalte: mobil horizontal scrollend, ab lg als Seitenspalte. */}
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              <CategoryButton
                active={category === "alle"}
                onClick={() => setCategory("alle")}
                icon={Files}
                iconClass="text-accent"
                label="Alle Dokumente"
                count={yearDocs.length}
              />
              {CATEGORY_ORDER.map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <CategoryButton
                    key={cat}
                    active={category === cat}
                    onClick={() => setCategory(cat)}
                    icon={meta.icon}
                    iconClass={meta.text}
                    label={DOCUMENT_CATEGORY_LABELS[cat]}
                    count={categoryCounts.get(cat) ?? 0}
                  />
                );
              })}
            </nav>

            <div className="overflow-hidden rounded-lg border border-border">
              {filtered.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-faint">
                  Keine Dokumente in dieser Auswahl.
                </p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-ink-faint">
                      <th className="px-4 py-2 font-medium">Dokument</th>
                      <th className="hidden px-4 py-2 font-medium sm:table-cell">Vorgang</th>
                      <th className="hidden px-4 py-2 font-medium sm:table-cell">Datum</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const isCollapsed = collapsed.has(group.key);
                      return (
                        <Fragment key={group.key}>
                          <GroupHeaderRow
                            label={group.label}
                            count={group.items.length}
                            sum={formatBytes(group.sum)}
                            colSpan={4}
                            collapsed={isCollapsed}
                            onToggle={() => toggle(group.key)}
                          />
                          {!isCollapsed &&
                            group.items.map((doc) => {
                              const meta = CATEGORY_META[doc.category];
                              const Icon = meta.icon;
                              return (
                                <tr key={doc.id} className="border-b border-border-subtle last:border-0">
                                  <td className="px-4 py-2.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <span
                                        className={cn(
                                          "flex h-8 w-8 flex-none items-center justify-center rounded-md",
                                          meta.bg,
                                        )}
                                      >
                                        <Icon size={15} className={meta.text} strokeWidth={1.75} />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                                          <span className="truncate">{doc.title}</span>
                                          {doc.is_auto && (
                                            <span className="flex-none rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-medium text-accent">
                                              auto
                                            </span>
                                          )}
                                        </p>
                                        <p className="truncate text-xs text-ink-faint">
                                          <span className="sm:hidden">
                                            {doc.entityLabel} · {formatDate(doc.created_at)}
                                          </span>
                                          <span className="hidden sm:inline">
                                            {DOCUMENT_CATEGORY_LABELS[doc.category]} · {formatBytes(doc.size_bytes)}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="hidden px-4 py-2.5 sm:table-cell">
                                    {doc.entityHref ? (
                                      <Link
                                        to={doc.entityHref}
                                        className="text-xs text-accent transition-colors hover:text-accent-hover"
                                      >
                                        {doc.entityLabel}
                                      </Link>
                                    ) : (
                                      <span className="text-xs text-ink-muted">{doc.entityLabel}</span>
                                    )}
                                  </td>
                                  <td className="hidden whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-muted sm:table-cell">
                                    {formatDate(doc.created_at)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => void open(doc)}
                                      aria-label={`„${doc.title}" öffnen`}
                                      title="Öffnen"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-bg-raised hover:text-ink"
                                    >
                                      <ExternalLink size={15} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  icon: Icon,
  iconClass,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Files;
  iconClass: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-none items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors lg:w-full",
        active ? "bg-bg-raised text-ink" : "text-ink-muted hover:bg-bg-surface hover:text-ink",
      )}
    >
      <Icon size={15} className={cn("shrink-0", iconClass)} strokeWidth={1.75} />
      <span className="whitespace-nowrap lg:whitespace-normal">{label}</span>
      <span className="ml-auto pl-2 font-mono text-xs text-ink-faint">{count}</span>
    </button>
  );
}
