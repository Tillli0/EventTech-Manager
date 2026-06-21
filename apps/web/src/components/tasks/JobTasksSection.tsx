import { useState } from "react";
import { Plus, Calendar, User, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useJobTasks, useUpdateTaskStatus, useDeleteTask } from "@/hooks/useTasks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

interface JobTasksSectionProps {
  jobId: string;
  jobTitle: string;
}

export function JobTasksSection({ jobId, jobTitle }: JobTasksSectionProps) {
  const { data: tasks, isLoading } = useJobTasks(jobId);
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {tasks ? `${tasks.filter((t) => t.status !== "erledigt").length} offen` : "…"}
        </p>
        <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} />
          Aufgabe
        </Button>
      </div>

      {isLoading && <p className="text-sm text-ink-faint">Wird geladen …</p>}

      {!isLoading && tasks && tasks.length === 0 && (
        <p className="text-sm text-ink-faint">Noch keine Aufgaben für diesen Job.</p>
      )}

      {tasks && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 rounded-md border border-border bg-bg-raised px-3 py-2.5",
                task.status === "erledigt" && "opacity-60",
              )}
            >
              <button
                onClick={() =>
                  updateStatus.mutate({
                    id: task.id,
                    status: task.status === "erledigt" ? "offen" : "erledigt",
                  })
                }
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  task.status === "erledigt"
                    ? "border-status-verfuegbar bg-status-verfuegbar text-white"
                    : "border-border hover:border-accent",
                )}
              >
                {task.status === "erledigt" && <Check size={10} />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p
                    className={cn(
                      "text-sm font-medium text-ink",
                      task.status === "erledigt" && "line-through text-ink-muted",
                    )}
                  >
                    {task.title}
                  </p>
                  <TaskPriorityBadge priority={task.priority} />
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
                  <TaskStatusBadge status={task.status} />
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDate(task.due_date)}
                    </span>
                  )}
                  {task.assigned_to && (
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {task.assigned_to}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm(`„${task.title}" wirklich löschen?`)) {
                    deleteTask.mutate(task.id);
                  }
                }}
                className="shrink-0 text-ink-faint hover:text-status-defekt"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        prefillJobId={jobId}
        prefillJobTitle={jobTitle}
      />
    </div>
  );
}
