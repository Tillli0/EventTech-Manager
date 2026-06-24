import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckSquare, Calendar, Briefcase, Trash2, Check, List, ChevronRight } from "lucide-react";
import { isBefore, isToday, isTomorrow, startOfDay, addDays } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { useTasks, useUpdateTaskStatus, useDeleteTask } from "@/hooks/useTasks";
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

export function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasks, isLoading, error } = useTasks();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const { groups, completed } = useMemo(() => {
    const today = startOfDay(new Date());
    const active = (tasks ?? []).filter((t) => t.status !== "erledigt");
    const done = (tasks ?? []).filter((t) => t.status === "erledigt").sort(sortTasks);

    const byBucket = new Map<string, TaskRecord[]>();
    for (const t of active) {
      const k = bucketKey(t, today);
      if (!byBucket.has(k)) byBucket.set(k, []);
      byBucket.get(k)!.push(t);
    }
    const groups = BUCKETS.map((b) => ({ ...b, tasks: (byBucket.get(b.key) ?? []).sort(sortTasks) })).filter(
      (g) => g.tasks.length > 0,
    );
    return { groups, completed: done };
  }, [tasks]);

  const openCount = (tasks ?? []).filter((t) => t.status !== "erledigt").length;

  function toggleDone(task: TaskRecord) {
    updateStatus.mutate({ id: task.id, status: task.status === "erledigt" ? "offen" : "erledigt" });
  }

  return (
    <div>
      <PageHeader
        title="Aufgaben"
        description={tasks ? `${openCount} offen · ${completed.length} erledigt` : undefined}
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
        <div className="mx-auto max-w-2xl">
          {groups.length === 0 && completed.length > 0 && (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
              Alles erledigt — keine offenen Aufgaben. 🎉
            </p>
          )}

          {groups.map((group) => (
            <section key={group.key} className="mb-5">
              <h3 className={cn("mb-1 px-3 text-xs font-semibold uppercase tracking-wide", group.tone ?? "text-ink-muted")}>
                {group.label}
                <span className="ml-1.5 font-normal text-ink-faint">{group.tasks.length}</span>
              </h3>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onOpen={() => setSelectedTaskId(task.id)}
                    onToggle={() => toggleDone(task)}
                    onDelete={() => {
                      if (confirm(`„${task.title}" wirklich löschen?`)) deleteTask.mutate(task.id);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Erledigt — einklappbar (Google-Stil) */}
          {completed.length > 0 && (
            <section className="mb-5">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink"
              >
                <ChevronRight size={14} className={cn("transition-transform", showCompleted && "rotate-90")} />
                Erledigt
                <span className="font-normal text-ink-faint">{completed.length}</span>
              </button>
              {showCompleted && (
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {completed.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onOpen={() => setSelectedTaskId(task.id)}
                      onToggle={() => toggleDone(task)}
                      onDelete={() => {
                        if (confirm(`„${task.title}" wirklich löschen?`)) deleteTask.mutate(task.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <TaskDetailDialog taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  onToggle,
  onDelete,
}: {
  task: TaskRecord;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "erledigt";
  const checklist = task.checklist_items ?? [];
  const checked = checklist.filter((i) => i.checked).length;
  const total = checklist.length;
  const overdue = !done && !!task.due_date && isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));

  return (
    <div
      className="group flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-bg-raised"
      onClick={onOpen}
    >
      {/* runde Checkbox wie Google Tasks */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
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
                <Briefcase size={11} />
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
