import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, MapPin, Download, ChevronRight, History, Trash2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useJobs, useDeletedJobs, useRestoreJob, useHardDeleteJob } from "@/hooks/useJobs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  JOB_STATUS_OPTIONS,
  JOB_VIEW_MODE_OPTIONS,
  isJobCompletelyPast,
  type JobStatus,
  type JobViewMode,
} from "@/types/database";
import { formatDate, initials } from "@/lib/format";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import { useSetJobViewMode } from "@/hooks/useAdminUsers";
import { useProfiles, profileLabel } from "@/hooks/useProfiles";
import { exportToCsv } from "@/lib/csv";
import type { Job } from "@/types/database";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { jobTone } from "@/lib/statusTone";

function customerLabel(job: Job): string | null {
  const c = job.customer;
  if (!c) return null;
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null;
}

// Literal Klassennamen (nicht interpoliert), damit Tailwinds JIT sie findet.
export function JobsPage() {
  const { canEdit, isManager, profile, user, refresh } = useAuth();
  const mayEdit = canEdit("jobs");
  const setViewMode = useSetJobViewMode();
  const { data: jobs, isLoading, error } = useJobs();
  const { data: deletedJobs } = useDeletedJobs();
  const { data: allProfiles } = useProfiles();
  const restoreJob = useRestoreJob();
  const hardDeleteJob = useHardDeleteJob();
  const confirm = useConfirm();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<JobStatus | "alle">("alle");
  const [createOpen, setCreateOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const profileNameById = useMemo(() => {
    const map = new Map<string, string>();
    allProfiles?.forEach((p) => map.set(p.id, profileLabel(p)));
    return map;
  }, [allProfiles]);

  async function handleRestore(job: Job) {
    await restoreJob.mutateAsync(job.id);
    toast.success(`„${job.title}" wiederhergestellt.`);
  }

  async function handleHardDelete(job: Job) {
    const ok = await confirm({
      title: "Job endgültig löschen?",
      message: `„${job.title}" wird unwiderruflich gelöscht — samt Packliste, Zeitplan und zugehörigen Kalenderterminen. Das kann nicht rückgängig gemacht werden.`,
      confirmLabel: "Endgültig löschen",
      danger: true,
    });
    if (!ok) return;
    await hardDeleteJob.mutateAsync(job.id);
    toast.success("Job endgültig gelöscht.");
  }

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (statusFilter === "alle") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  // Komplett vergangene Jobs (Ende + alle Zeitplan-Termine vorbei) in einen
  // eigenen, einklappbaren „Vergangen"-Ordner trennen.
  const { activeJobs, pastJobs } = useMemo(() => {
    const now = new Date();
    const active: Job[] = [];
    const past: Job[] = [];
    for (const job of filteredJobs) {
      (isJobCompletelyPast(job, now) ? past : active).push(job);
    }
    return { activeJobs: active, pastJobs: past };
  }, [filteredJobs]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs?.forEach((j) => (counts[j.status] = (counts[j.status] ?? 0) + 1));
    return counts;
  }, [jobs]);

  function handleExport() {
    const statusLabel = (s: JobStatus) => JOB_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
    exportToCsv(
      `jobs-${new Date().toISOString().slice(0, 10)}`,
      [
        { label: "Titel", value: (j: Job) => j.title },
        { label: "Kunde", value: (j: Job) => customerLabel(j) ?? "" },
        { label: "Start", value: (j: Job) => formatDate(j.start_date) },
        { label: "Ende", value: (j: Job) => formatDate(j.end_date) },
        { label: "Ort", value: (j: Job) => j.location },
        { label: "Status", value: (j: Job) => statusLabel(j.status) },
      ],
      filteredJobs,
    );
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        description={jobs ? `${jobs.length} Jobs insgesamt` : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={filteredJobs.length === 0}>
              <Download size={16} />
              CSV
            </Button>
            {mayEdit && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Job anlegen
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <StatusChip active={statusFilter === "alle"} onClick={() => setStatusFilter("alle")}>
            Alle <ChipCount n={jobs?.length ?? 0} />
          </StatusChip>
          {JOB_STATUS_OPTIONS.map((opt) => (
            <StatusChip
              key={opt.value}
              active={statusFilter === opt.value}
              tone={`${jobTone(opt.value).bg} ${jobTone(opt.value).text}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label} <ChipCount n={statusCounts[opt.value] ?? 0} />
            </StatusChip>
          ))}
        </div>
        {isManager && profile && (
          <label className="flex shrink-0 items-center gap-2 text-sm text-ink-muted">
            <span className="shrink-0">Sichtmodus:</span>
            <Select
              value={profile.job_view_mode}
              onChange={async (e) => {
                if (!user) return;
                await setViewMode.mutateAsync({ userId: user.id, mode: e.target.value as JobViewMode });
                await refresh();
              }}
              className="sm:w-48"
              title="Welche Jobs du selbst siehst"
            >
              {JOB_VIEW_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {isLoading && <LoadingState label="Jobs werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && filteredJobs.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="Keine Jobs gefunden"
          description="Lege einen neuen Job an, um eine Packliste zu erstellen."
          action={
            mayEdit ? (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Ersten Job anlegen
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="space-y-2">
        {activeJobs.map((job) => (
          <JobCard key={job.id} job={job} profileNameById={profileNameById} />
        ))}
      </div>

      {/* Vergangen-Ordner: komplett abgeschlossene Jobs, standardmäßig eingeklappt */}
      {pastJobs.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-bg-surface px-4 py-3 text-left transition-colors hover:border-accent/40"
          >
            <ChevronRight
              size={16}
              className={cn("shrink-0 text-ink-muted transition-transform", pastOpen && "rotate-90")}
            />
            <History size={15} className="shrink-0 text-ink-muted" />
            <span className="text-sm font-medium text-ink">Vergangen</span>
            <span className="text-xs text-ink-faint">
              {pastJobs.length} {pastJobs.length === 1 ? "Job" : "Jobs"}
            </span>
          </button>
          {pastOpen && (
            <div className="mt-2 space-y-2">
              {pastJobs.map((job) => (
                <JobCard key={job.id} job={job} profileNameById={profileNameById} muted />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Papierkorb: in den Papierkorb verschobene Jobs (nur Bearbeiter) */}
      {mayEdit && deletedJobs && deletedJobs.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setTrashOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-bg-surface px-4 py-3 text-left transition-colors hover:border-accent/40"
          >
            <ChevronRight
              size={16}
              className={cn("shrink-0 text-ink-muted transition-transform", trashOpen && "rotate-90")}
            />
            <Trash2 size={15} className="shrink-0 text-ink-muted" />
            <span className="text-sm font-medium text-ink">Papierkorb</span>
            <span className="text-xs text-ink-faint">
              {deletedJobs.length} {deletedJobs.length === 1 ? "Job" : "Jobs"}
            </span>
          </button>
          {trashOpen && (
            <div className="mt-2 space-y-2">
              {deletedJobs.map((job) => (
                <TrashedJobCard
                  key={job.id}
                  job={job}
                  onRestore={() => handleRestore(job)}
                  onDelete={() => handleHardDelete(job)}
                  busy={restoreJob.isPending || hardDeleteJob.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateJobDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function ChipCount({ n }: { n: number }) {
  return <span className="ml-1 rounded-full bg-black/15 px-1.5 text-[10px] font-semibold">{n}</span>;
}

function StatusChip({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? tone
            ? cn(tone, "border-transparent")
            : "border-transparent bg-accent/15 text-accent"
          : "border-border text-ink-muted hover:border-accent/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Karte für einen Job in der Liste — Fortschritt/Zuweisung nur je nach Status. */
function JobCard({
  job,
  profileNameById,
  muted = false,
}: {
  job: Job;
  profileNameById: Map<string, string>;
  muted?: boolean;
}) {
  const items = job.packlist_items ?? [];
  const assignees = (job.assignees ?? []).map((a) => profileNameById.get(a.user_id)).filter(Boolean) as string[];

  let progress: { label: string; done: number; total: number } | null = null;
  if (items.length > 0) {
    if (job.status === "packen" || job.status === "laeuft") {
      const total = items.reduce((s, i) => s + i.quantity, 0);
      const done = items.reduce((s, i) => s + i.quantity_picked_up, 0);
      if (total > 0) progress = { label: "Gepackt", done, total };
    } else if (job.status === "rueckgabe") {
      const total = items.reduce((s, i) => s + i.quantity_picked_up, 0);
      const done = items.reduce((s, i) => s + i.quantity_returned_ok + i.quantity_damaged + i.quantity_missing, 0);
      if (total > 0) progress = { label: "Zurück", done, total };
    }
  }

  return (
    <Link to={`/jobs/${job.id}`}>
      <Card
        className={cn(
          "border-l-4 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-accent/40",
          muted && "opacity-70",
        )}
        style={{ borderLeftColor: job.color }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium text-ink">{job.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span>
                {formatDate(job.start_date)} – {formatDate(job.end_date)}
              </span>
              {customerLabel(job) && <span>{customerLabel(job)}</span>}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {job.location}
                </span>
              )}
            </div>
          </div>

          {progress && (
            <div className="w-full shrink-0 sm:w-32">
              <div className="mb-1 flex justify-between text-[11px] text-ink-faint">
                <span>{progress.label}</span>
                <span>
                  {progress.done}/{progress.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-raised">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-3">
            {assignees.length > 0 && (
              <div className="flex -space-x-2">
                {assignees.slice(0, 3).map((name, i) => (
                  <span
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg-surface bg-accent-soft text-[10px] font-medium text-accent"
                    title={name}
                  >
                    {initials(name)}
                  </span>
                ))}
                {assignees.length > 3 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg-surface bg-bg-raised text-[10px] font-medium text-ink-faint">
                    +{assignees.length - 3}
                  </span>
                )}
              </div>
            )}
            <JobStatusBadge status={job.status} />
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** Karte für einen Job im Papierkorb: wiederherstellen oder endgültig löschen. */
function TrashedJobCard({
  job,
  onRestore,
  onDelete,
  busy,
}: {
  job: Job;
  onRestore: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-muted line-through">{job.title}</p>
        <p className="text-xs text-ink-faint">
          {formatDate(job.start_date)} – {formatDate(job.end_date)}
          {job.deleted_at && <> · gelöscht am {formatDate(job.deleted_at)}</>}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="secondary" onClick={onRestore} disabled={busy}>
          <RotateCcw size={14} />
          Wiederherstellen
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} disabled={busy}>
          <Trash2 size={14} />
          Löschen
        </Button>
      </div>
    </Card>
  );
}
