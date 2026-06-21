import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckSquare, Calendar, Briefcase, Trash2, Check, List } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { useTasks, useUpdateTaskStatus, useDeleteTask } from "@/hooks/useTasks";
import { TASK_STATUS_OPTIONS, type TaskStatus } from "@/types/database";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "alle">("alle");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
              <Plus size={16} />Erste Aufgabe anlegen
            </Button>
          }
        />
      )}

      {!isLoading && tasks && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => {
            const checklistItems = task.checklist_items ?? [];
            const checkedCount = checklistItems.filter((i) => i.checked).length;
            const totalCount = checklistItems.length;

            return (
              <Card
                key={task.id}
                className={cn(
                  "px-5 py-4 transition-colors cursor-pointer hover:bg-bg-raised",
                  task.status === "erledigt" && "opacity-60",
                )}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Erledigt-Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStatus.mutate({
                        id: task.id,
                        status: task.status === "erledigt" ? "offen" : "erledigt",
                      });
                    }}
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
                      <p className={cn("font-medium text-ink", task.status === "erledigt" && "line-through text-ink-muted")}>
                        {task.title}
                      </p>
                      {task.content_type === "list" && (
                        <span className="flex items-center gap-1 text-xs text-ink-faint">
                          <List size={11} />
                          {totalCount > 0 ? `${checkedCount}/${totalCount}` : "Liste"}
                        </span>
                      )}
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>

                    {task.content_type === "notes" && task.description && (
                      <p className="mt-1 text-sm text-ink-muted line-clamp-1">{task.description}</p>
                    )}

                    {task.content_type === "list" && totalCount > 0 && (
                      <div className="mt-2 h-1 w-full max-w-xs rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-status-verfuegbar transition-all"
                          style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                        />
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />{formatDate(task.due_date)}
                        </span>
                      )}
                      {task.job && (
                        <Link
                          to={`/jobs/${task.job_id}`}
                          className="flex items-center gap-1 hover:text-ink"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Briefcase size={12} />{task.job.title}
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
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
            );
          })}
        </div>
      )}

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <TaskDetailDialog taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
