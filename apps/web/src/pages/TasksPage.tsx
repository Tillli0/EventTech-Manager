import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckSquare, Calendar, Briefcase, Trash2, Check, List, ChevronRight } from "lucide-react";
import { isBefore, isToday, isTomorrow, startOfDay, addDays } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskEditPanel } from "@/components/tasks/TaskEditPanel";
import { useTasks, useUpdateTaskStatus, useDeleteTask, useCreateTask } from "@/hooks/useTasks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type TaskRecord = NonNullable<ReturnType<typeof useTasks>["data"]>[number];

/** Datums-„Eimer" wie in Google Tasks (Sortierung nach Datum). */
const BUCKETS: { key: string; label: string; tone?: string }[] = [
  { key: "ueberfaellig", label: "Überfällig", tone: "text-status-defekt" },
  { key: "heute", label: "Heute", tone: "text-accent" },
  { key: "morgen", label: "Morgen" },
  { key: "woche", label: "Diese Woche" },
  { key: "spaeter", label: "Später" },
  { key: "ohne", label: "Ohne Datum" },
];

const PRIO_ORDER: Record<string, number> = { dringend: 0, hoch: 1, normal: 2, niedrig: 3 };

function bucketKey(task: TaskRecord, today: Date): string {
  if (!task.due_date) return "ohne";
  const d = startOfDay(new Date(task.due_date));
  if (isBefore(d, today)) return "ueberfaellig";
  if (isToday(d)) return "heute";
  if (isTomorrow(d)) return "morgen";
  if (isBefore(d, addDays(today, 7))) return "woche";
  return "spaeter";
}

function sortTasks(a: TaskRecord, b: TaskRecord): number {
  const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
  const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
  if (da !== db) return da - db;
  const pa = PRIO_ORDER[a.priority] ?? 9;
  const pb = PRIO_ORDER[b.priority] ?? 9;
  if (pa !== pb) return pa - pb;
  return a.title.localeCompare(b.title, "de");
}

interface JobGroup {
  jobId: string;
  title: string;
  color: string;
  tasks: TaskRecord[];
}

export function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showDoneJob, setShowDoneJob] = useState(false);
  const [showDoneOther, setShowDoneOther] = useState(false);

  const { data: tasks, isLoading, error } = useTasks();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const { jobGroups, otherGroups, jobDone, otherDone } = useMemo(() => {
    const today = startOfDay(new Date());
    const all = tasks ?? [];
    const active = all.filter((t) => t.status !== "erledigt");
    const done = all.filter((t) => t.status === "erledigt").sort(sortTasks);

    // ── Linke Spalte: Job-Aufgaben, nach Job gruppiert ──────────────────────
    const byJob = new Map<string, JobGroup>();
    for (const t of active) {
      if (!t.job_id || !t.job) continue;
      let g = byJob.get(t.job_id);
      if (!g) {
        g = { jobId: t.job_id, title: t.job.title, color: t.job.color ?? "#6366f1", tasks: [] };
        byJob.set(t.job_id, g);
      }
      g.tasks.push(t);
    }
    const jobGroups = Array.from(byJob.values())
      .map((g) => ({ ...g, tasks: g.tasks.sort(sortTasks) }))
      .sort((a, b) => {
        const ea = a.tasks[0]?.due_date ? new Date(a.tasks[0].due_date).getTime() : Infinity;
        const eb = b.tasks[0]?.due_date ? new Date(b.tasks[0].due_date).getTime() : Infinity;
        if (ea !== eb) return ea - eb;
        return a.title.localeCompare(b.title, "de");
      });

    // ── Rechte Spalte: Sonstige Aufgaben, nach Datum-Eimern ─────────────────
    const others = active.filter((t) => !t.job_id);
    const byBucket = new Map<string, TaskRecord[]>();
    for (const t of others) {
      const k = bucketKey(t, today);
      if (!byBucket.has(k)) byBucket.set(k, []);
      byBucket.get(k)!.push(t);
    }
    const otherGroups = BUCKETS.map((b) => ({ ...b, tasks: (byBucket.get(b.key) ?? []).sort(sortTasks) })).filter(
      (g) => g.tasks.length > 0,
    );

    return {
      jobGroups,
      otherGroups,
      jobDone: done.filter((t) => !!t.job_id),
      otherDone: done.filter((t) => !t.job_id),
    };
  }, [tasks]);

  const openCount = (tasks ?? []).filter((t) => t.status !== "erledigt").length;
  const doneCount = (tasks ?? []).length - openCount;

  function toggleDone(task: TaskRecord) {
    updateStatus.mutate({ id: task.id, status: task.status === "erledigt" ? "offen" : "erledigt" });
  }
  function toggleExpand(id: string) {
    setExpandedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function collapse(id: string) {
    setExpandedIds((cur) => {
      if (!cur.has(id)) return cur;
      const next = new Set(cur);
      next.delete(id);
      return next;
    });
  }
  function handleDelete(task: TaskRecord) {
    if (confirm(`„${task.title}" wirklich löschen?`)) {
      collapse(task.id);
      deleteTask.mutate(task.id);
    }
  }

  const renderItem = (task: TaskRecord) => (
    <TaskItem
      key={task.id}
      task={task}
      expanded={expandedIds.has(task.id)}
      onToggleExpand={() => toggleExpand(task.id)}
      onToggleDone={() => toggleDone(task)}
      onDelete={() => handleDelete(task)}
      onCollapse={() => collapse(task.id)}
    />
  );

  const jobEmpty = jobGroups.length === 0 && jobDone.length === 0;
  const otherEmpty = otherGroups.length === 0 && otherDone.length === 0;

  return (
    <div>
      <PageHeader
        title="Aufgaben"
        description={tasks ? `${openCount} offen · ${doneCount} erledigt` : undefined}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Aufgabe anlegen
          </Button>
        }
      />

      {isLoading && <LoadingState label="Aufgaben werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && (!tasks || tasks.length === 0) && (
        <EmptyState
          icon={CheckSquare}
          title="Keine Aufgaben"
          description="Lege deine erste Aufgabe an."
          action={
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Erste Aufgabe anlegen
            </Button>
          }
        />
      )}

      {!isLoading && tasks && tasks.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Job-Aufgaben ──────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Briefcase size={15} className="text-ink-muted" />
              Job-Aufgaben
            </h2>

            {jobEmpty && (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
                Keine Aufgaben, die zu einem Job gehören.
              </p>
            )}

            {jobGroups.map((group) => (
              <div key={group.jobId} className="mb-5">
                <Link
                  to={`/jobs/${group.jobId}`}
                  className="mb-1 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                    aria-hidden
                  />
                  <span className="truncate normal-case tracking-normal text-ink">{group.title}</span>
                  <span className="font-normal text-ink-faint">{group.tasks.length}</span>
                </Link>
                <div
                  className="divide-y divide-border overflow-hidden rounded-lg border border-l-4 border-border"
                  style={{ borderLeftColor: group.color }}
                >
                  {group.tasks.map(renderItem)}
                  <QuickAddRow jobId={group.jobId} placeholder="Aufgabe für diesen Job …" />
                </div>
              </div>
            ))}

            {jobDone.length > 0 && (
              <CompletedSection
                count={jobDone.length}
                open={showDoneJob}
                onToggle={() => setShowDoneJob((v) => !v)}
              >
                {jobDone.map(renderItem)}
              </CompletedSection>
            )}
          </section>

          {/* ── Sonstige Aufgaben ─────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckSquare size={15} className="text-ink-muted" />
              Sonstige Aufgaben
            </h2>

            <div className="mb-4 overflow-hidden rounded-lg border border-border">
              <QuickAddRow placeholder="Aufgabe hinzufügen" />
            </div>

            {otherEmpty && (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
                Noch keine sonstigen Aufgaben.
              </p>
            )}

            {otherGroups.map((group) => (
              <div key={group.key} className="mb-5">
                <h3 className={cn("mb-1 px-1 text-xs font-semibold uppercase tracking-wide", group.tone ?? "text-ink-muted")}>
                  {group.label}
                  <span className="ml-1.5 font-normal text-ink-faint">{group.tasks.length}</span>
                </h3>
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {group.tasks.map(renderItem)}
                </div>
              </div>
            ))}

            {otherDone.length > 0 && (
              <CompletedSection
                count={otherDone.length}
                open={showDoneOther}
                onToggle={() => setShowDoneOther((v) => !v)}
              >
                {otherDone.map(renderItem)}
              </CompletedSection>
            )}
          </section>
        </div>
      )}

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

/** Einklappbare „Erledigt"-Sektion (Google-Stil), je Spalte. */
function CompletedSection({
  count,
  open,
  onToggle,
  children,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink"
      >
        <ChevronRight size={14} className={cn("transition-transform", open && "rotate-90")} />
        Erledigt
        <span className="font-normal text-ink-faint">{count}</span>
      </button>
      {open && <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">{children}</div>}
    </section>
  );
}

/** Inline-Schnellanlage einer Aufgabe (Google-Stil), optional an einen Job gebunden. */
function QuickAddRow({ jobId, placeholder }: { jobId?: string | null; placeholder: string }) {
  const createTask = useCreateTask();
  const [text, setText] = useState("");

  async function add() {
    const title = text.trim();
    if (!title || createTask.isPending) return;
    setText("");
    await createTask.mutateAsync({ title, job_id: jobId ?? null });
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2.5">
      <Plus size={16} className="shrink-0 text-accent" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}

/** Eine Aufgabe: zugeklappt eine Kompaktzeile, aufgeklappt der volle Inline-Editor. */
function TaskItem({
  task,
  expanded,
  onToggleExpand,
  onToggleDone,
  onDelete,
  onCollapse,
}: {
  task: TaskRecord;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onCollapse: () => void;
}) {
  if (expanded) {
    return (
      <div className="flex gap-1.5 bg-bg-raised/40 px-2 py-2.5">
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-1 shrink-0 text-ink-faint hover:text-ink"
          aria-label="Einklappen"
        >
          <ChevronRight size={16} className="rotate-90 transition-transform" />
        </button>
        <div className="min-w-0 flex-1">
          <TaskEditPanel taskId={task.id} onDeleted={onCollapse} />
        </div>
      </div>
    );
  }

  const done = task.status === "erledigt";
  const checklist = task.checklist_items ?? [];
  const checked = checklist.filter((i) => i.checked).length;
  const total = checklist.length;
  const overdue = !done && !!task.due_date && isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));

  return (
    <div
      className="group flex cursor-pointer items-start gap-2 px-2 py-2.5 transition-colors hover:bg-bg-raised"
      onClick={onToggleExpand}
    >
      {/* Aufklapp-Pfeil */}
      <span className="mt-0.5 shrink-0 text-ink-faint transition-transform">
        <ChevronRight size={16} />
      </span>

      {/* runde Checkbox wie Google Tasks */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone();
        }}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-status-verfuegbar bg-status-verfuegbar text-white" : "border-ink-faint hover:border-accent",
        )}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
      >
        <Check size={12} className={done ? "" : "opacity-0 transition-opacity group-hover:opacity-40"} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium text-ink", done && "text-ink-muted line-through")}>{task.title}</p>
          {(task.priority === "hoch" || task.priority === "dringend") && !done && (
            <TaskPriorityBadge priority={task.priority} />
          )}
          {task.content_type === "list" && total > 0 && (
            <span className="flex items-center gap-1 text-xs text-ink-faint">
              <List size={11} />
              {checked}/{total}
            </span>
          )}
        </div>

        {task.content_type === "notes" && task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{task.description}</p>
        )}

        {(task.due_date || task.job) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
            {task.due_date && (
              <span className={cn("flex items-center gap-1", overdue && "font-medium text-status-defekt")}>
                <Calendar size={11} />
                {formatDate(task.due_date)}
              </span>
            )}
            {task.job && (
              <Link
                to={`/jobs/${task.job_id}`}
                className="flex items-center gap-1 hover:text-ink"
                onClick={(e) => e.stopPropagation()}
              >
                <Briefcase size={11} style={{ color: task.job.color }} />
                {task.job.title}
              </Link>
            )}
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 text-ink-faint opacity-0 transition-opacity hover:text-status-defekt group-hover:opacity-100"
        aria-label="Aufgabe löschen"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
