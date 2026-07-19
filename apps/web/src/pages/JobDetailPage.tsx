import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Printer, FileText, Download, Trash2, ChevronDown, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { OfferStatusBadge, InvoiceStatusBadge } from "@/components/ui/StatusBadge";
import { useJob, useUpdateJobStatus, useUpdateJob, useSoftDeleteJob } from "@/hooks/useJobs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useOffersForJob, fetchOfferWithItems } from "@/hooks/useOffers";
import { useInvoicesForJob } from "@/hooks/useInvoices";
import { downloadOfferPdf } from "@/lib/offerPdf";
import { useToast } from "@/components/ui/Toast";
import {
  JOB_STATUS_OPTIONS,
  offerTotals,
  invoicePaidSum,
  invoiceDerivedStatus,
  type JobStatus,
} from "@/types/database";
import { formatDateTime, formatCurrency, initials } from "@/lib/format";
import { PacklistSection } from "@/components/jobs/PacklistSection";
import { PacklistProgress } from "@/components/jobs/PacklistProgress";
import { printPacklist } from "@/lib/printPacklist";
import { JobTasksSection } from "@/components/tasks/JobTasksSection";
import { JobColorPicker } from "@/components/jobs/JobColorPicker";
import { Textarea } from "@/components/ui/Input";
import { JobMilestonesSection } from "@/components/jobs/JobMilestonesSection";
import { DocumentsCard } from "@/components/documents/DocumentsCard";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { useSetJobAssignees } from "@/hooks/useJobAssignees";
import { useProfiles, profileLabel, assignableProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/auth/AuthProvider";
import type { Job } from "@/types/database";
import { Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { jobTone } from "@/lib/statusTone";

// Muss zu den job.*-Farben in tailwind.config.js passen (dort für Badges/Punkte
// genutzt). Hier als Hex für farbig getönte Status-Buttons (inline style statt
// dynamischer Tailwind-Klassen, da JIT keine berechneten Klassennamen erkennt).

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const mayEdit = canEdit("jobs");
  const { data: job, isLoading, error } = useJob(id);
  const updateStatus = useUpdateJobStatus();
  const updateJob = useUpdateJob();
  const softDeleteJob = useSoftDeleteJob();
  const confirm = useConfirm();
  const toast = useToast();

  async function handleMoveToTrash() {
    if (!job) return;
    const ok = await confirm({
      title: "In den Papierkorb verschieben?",
      message: `„${job.title}" wird in den Papierkorb verschoben. Du kannst ihn dort wiederherstellen oder endgültig löschen.`,
      confirmLabel: "In den Papierkorb",
      danger: true,
    });
    if (!ok) return;
    await softDeleteJob.mutateAsync(job.id);
    toast.success("Job in den Papierkorb verschoben.");
    navigate("/jobs");
  }

  if (isLoading) return <LoadingState label="Job wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!job) return <ErrorState message="Job nicht gefunden." />;

  const customer = job.customer;
  const customerLabel = customer
    ? customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <div>
      <Link to="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Zurück zu Jobs
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {job.title}
            <JobStatusBadge status={job.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: job.color }}
                aria-hidden
              />
              <Calendar size={13} />
              {formatDateTime(job.start_date)} – {formatDateTime(job.end_date)}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {job.location}
              </span>
            )}
            {customerLabel && <span>{customerLabel}</span>}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => printPacklist(job)}>
              <Printer size={16} />
              Packliste drucken
            </Button>
            {mayEdit && (
              <Button variant="ghost" onClick={handleMoveToTrash} disabled={softDeleteJob.isPending}>
                <Trash2 size={16} />
                Papierkorb
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Packliste</h2>
            </CardHeader>
            <CardBody>
              <PacklistProgress items={job.packlist_items ?? []} />
              <PacklistSection job={job} canEdit={mayEdit} />
            </CardBody>
          </Card>

          <JobOffersCard jobId={job.id} />

          <JobInvoicesCard jobId={job.id} />

          <DocumentsCard entityType="job" entityId={job.id} />

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Aufgaben</h2>
            </CardHeader>
            <CardBody>
              <JobTasksSection jobId={job.id} jobTitle={job.title} jobColor={job.color} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Zeitplan</h2>
              <p className="mt-0.5 text-xs text-ink-faint">
                Programmablauf des Jobs — z.B. Aufbau, Soundcheck, Eventstart, Abbau. Wird zeitlich sortiert und im Kalender unter dem Job angezeigt.
              </p>
            </CardHeader>
            <CardBody>
              <JobMilestonesSection jobId={job.id} milestones={job.milestones ?? []} defaultAt={job.start_date} />
            </CardBody>
          </Card>

          <JobNotesCard job={job} mayEdit={mayEdit} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Status</h2>
            </CardHeader>
            <CardBody>
              {mayEdit ? (
                <div className="flex flex-col">
                  {JOB_STATUS_OPTIONS.filter((o) => o.value !== "storniert").map((opt, i, arr) => {
                    const tone = jobTone(opt.value as JobStatus);
                    const active = job.status === opt.value;
                    return (
                      <div key={opt.value} className="flex flex-col items-stretch">
                        <button
                          onClick={() => updateStatus.mutate({ id: job.id, status: opt.value as JobStatus })}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all",
                            tone.bg, tone.text,
                            active ? `${tone.border} ring-1 ring-current` : tone.border,
                            !active && "hover:translate-x-0.5",
                          )}
                        >
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.solid)} aria-hidden />
                          {opt.label}
                        </button>
                        {i < arr.length - 1 && (
                          <div className="flex justify-start pl-[19px]">
                            <ChevronDown size={14} className="my-0.5 text-ink-faint" aria-hidden />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="my-3 border-t border-border" />

                  {(() => {
                    const opt = JOB_STATUS_OPTIONS.find((o) => o.value === "storniert")!;
                    const tone = jobTone("storniert");
                    const active = job.status === "storniert";
                    return (
                      <button
                        onClick={() => updateStatus.mutate({ id: job.id, status: "storniert" })}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all",
                          tone.bg, tone.text,
                          active ? `${tone.border} ring-1 ring-current` : tone.border,
                          !active && "hover:translate-x-0.5",
                        )}
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.solid)} aria-hidden />
                        {opt.label}
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <JobStatusBadge status={job.status} />
              )}
            </CardBody>
          </Card>

          <JobAssigneesCard job={job} canEdit={mayEdit} />

          {mayEdit && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Farbe</h2>
              </CardHeader>
              <CardBody>
                <JobColorPicker value={job.color} onChange={(color) => updateJob.mutate({ id: job.id, color })} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Angebote, die zu diesem Job gehören (z.B. aus der Packliste erzeugt). */
function JobOffersCard({ jobId }: { jobId: string }) {
  const { data: offers } = useOffersForJob(jobId);
  const toast = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(offerId: string) {
    setDownloadingId(offerId);
    try {
      const offer = await fetchOfferWithItems(offerId);
      await downloadOfferPdf(offer);
    } catch (err) {
      console.error("PDF konnte nicht erzeugt werden:", err);
      toast.error("Das PDF konnte nicht erzeugt werden.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (!offers || offers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <FileText size={14} />
          Angebote
        </h2>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {offers.map((offer) => {
            const { gross } = offerTotals(offer.items ?? [], offer.tax_rate);
            return (
              <div
                key={offer.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <Link to="/angebote" className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{offer.title}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {offer.offer_number} · {formatCurrency(gross)}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <OfferStatusBadge status={offer.status} />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(offer.id)}
                    disabled={downloadingId === offer.id}
                  >
                    <Download size={14} />
                    {downloadingId === offer.id ? "…" : "PDF"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

/** Rechnungen, die zu diesem Job gehören — mit Status und offenem Betrag. */
function JobInvoicesCard({ jobId }: { jobId: string }) {
  const { data: invoices } = useInvoicesForJob(jobId);

  if (!invoices || invoices.length === 0) return null;

  const openTotal = invoices.reduce((sum, inv) => {
    if (inv.status !== "gestellt") return sum;
    const { gross } = offerTotals(inv.items ?? [], inv.tax_rate);
    return sum + Math.max(0, gross - invoicePaidSum(inv.payments));
  }, 0);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Receipt size={14} />
          Rechnungen
        </h2>
        {openTotal > 0 && (
          <span className="font-mono text-xs text-ink-muted">offen: {formatCurrency(openTotal)}</span>
        )}
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {invoices.map((invoice) => {
            const { gross } = offerTotals(invoice.items ?? [], invoice.tax_rate);
            const derived = invoiceDerivedStatus(invoice, invoice.items, invoice.payments);
            return (
              <Link
                key={invoice.id}
                to={`/rechnungen?open=${invoice.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 hover:border-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{invoice.title}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {invoice.invoice_number ?? "Entwurf"} · {formatCurrency(gross)}
                  </p>
                </div>
                <InvoiceStatusBadge status={derived} />
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

/** Notizen / weitere Infos zum Job — editierbar (übernimmt u.a. die Website-Anfrage-Nachricht). */
function JobNotesCard({ job, mayEdit }: { job: Job; mayEdit: boolean }) {
  const updateJob = useUpdateJob();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(job.notes ?? "");

  async function save() {
    try {
      await updateJob.mutateAsync({ id: job.id, notes: value.trim() || null });
      setEditing(false);
      toast.success("Notizen gespeichert.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notizen konnten nicht gespeichert werden.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Notizen / weitere Infos</h2>
        {mayEdit && !editing && (
          <Button size="sm" variant="ghost" onClick={() => { setValue(job.notes ?? ""); setEditing(true); }}>
            {job.notes ? "Bearbeiten" : "Hinzufügen"}
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Details, Absprachen, Besonderheiten …"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={save} disabled={updateJob.isPending}>
                {updateJob.isPending ? "Speichert …" : "Speichern"}
              </Button>
            </div>
          </div>
        ) : job.notes ? (
          <p className="whitespace-pre-wrap text-sm text-ink-muted">{job.notes}</p>
        ) : (
          <p className="text-sm text-ink-faint">Keine Notizen hinterlegt.</p>
        )}
      </CardBody>
    </Card>
  );
}

function JobAssigneesCard({ job, canEdit }: { job: Job; canEdit: boolean }) {
  const { data: allProfiles } = useProfiles();
  const profiles = assignableProfiles(allProfiles);
  const setAssignees = useSetJobAssignees();
  const assignedIds = (job.assignees ?? []).map((a) => a.user_id);

  function toggle(userId: string) {
    const next = assignedIds.includes(userId)
      ? assignedIds.filter((id) => id !== userId)
      : [...assignedIds, userId];
    setAssignees.mutate({ jobId: job.id, userIds: next });
  }

  const assignedProfiles = (profiles ?? []).filter((p) => assignedIds.includes(p.id));

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Users size={14} />
          Zugewiesene Nutzer
        </h2>
      </CardHeader>
      <CardBody>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {(profiles ?? []).map((p) => {
              const active = assignedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-all",
                    active
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-border text-ink-muted hover:-translate-y-0.5 hover:border-accent/40 hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      active ? "bg-accent text-accent-on" : "bg-bg-raised text-ink-faint",
                    )}
                  >
                    {initials(profileLabel(p))}
                  </span>
                  {profileLabel(p)}
                </button>
              );
            })}
          </div>
        ) : assignedProfiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedProfiles.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-2 rounded-full bg-bg-raised py-1 pl-1 pr-3 text-xs text-ink-muted"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                  {initials(profileLabel(p))}
                </span>
                {profileLabel(p)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">Niemand zugewiesen.</p>
        )}
      </CardBody>
    </Card>
  );
}
