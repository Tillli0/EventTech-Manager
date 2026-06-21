import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckSquare, Calendar, User, Briefcase, Trash2, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useTasks, useUpdateTaskStatus, useDeleteTask } from "@/hooks/useTasks";
import { TASK_STATUS_OPTIONS, type TaskStatus } from "@/types/database";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "alle">("alle");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tasks, isLoading, error } = useTasks(
    statusFilter !== "alle" ? { status: statusFilter } : undefined,
  );

  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const openCount = tasks?.filter((t) => t.status === "offen").length ?? 0;
  const inProgressCount = tasks?.filter((t) => t.status === "in_bearbeitung").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Aufgaben"
        description={tasks ? `${openCount} offen · ${inProgressCount} in Bearbeitung` : undefined}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Aufgabe anlegen
          </Button>
        }
      />

      <div className="mb-4">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "alle")}
          className="sm:w-56"
        >
          <option value="alle">Alle Status</option>
          {TASK_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState label="Aufgaben werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && (!tasks || tasks.length === 0) && (
        <EmptyState
          icon={CheckSquare}
          title="Keine Aufgaben gefunden"
          description="Lege eine neue Aufgabe an."
          action={
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Erste Aufgabe anlegen
            </Button>
          }
        />
      )}

      {!isLoading && tasks && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={cn(
                "px-5 py-4 transition-colors",
                task.status === "erledigt" && "opacity-60",
              )}
            >
              <div className="flex items-start gap-4">
                {/* Erledigt-Toggle */}
                <button
                  onClick={() =>
                    updateStatus.mutate({
                      id: task.id,
                      status: task.status === "erledigt" ? "offen" : "erledigt",
                    })
                  }
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    task.status === "erledigt"
                      ? "border-status-verfuegbar bg-status-verfuegbar text-white"
                      : "border-border hover:border-accent",
                  )}
                >
                  {task.status === "erledigt" && <Check size={12} />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "font-medium text-ink",
                        task.status === "erledigt" && "line-through text-ink-muted",
                      )}
                    >
                      {task.title}
                    </p>
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>

                  {task.description && (
                    <p className="mt-1 text-sm text-ink-muted">{task.description}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    {task.assigned_to && (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {task.assigned_to}
                      </span>
                    )}
                    {task.job && (
                      <Link
                        to={`/jobs/${task.job_id}`}
                        className="flex items-center gap-1 hover:text-ink"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Briefcase size={12} />
                        {task.job.title}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {task.status !== "in_bearbeitung" && task.status !== "erledigt" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: task.id, status: "in_bearbeitung" })}
                      className="text-xs"
                    >
                      Starten
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`„${task.title}" wirklich löschen?`)) {
                        deleteTask.mutate(task.id);
                      }
                    }}
                    className="text-ink-faint hover:text-status-defekt"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
