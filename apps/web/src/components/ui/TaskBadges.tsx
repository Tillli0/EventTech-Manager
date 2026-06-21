import { cn } from "@/lib/cn";
import type { TaskStatus, TaskPriority } from "@/types/database";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/types/database";

const statusClasses: Record<TaskStatus, string> = {
  offen: "bg-bg-raised text-ink-muted",
  in_bearbeitung: "bg-status-wartung-bg text-status-wartung",
  erledigt: "bg-status-verfuegbar-bg text-status-verfuegbar",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const option = TASK_STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        statusClasses[status],
      )}
    >
      {option?.label ?? status}
    </span>
  );
}

const priorityClasses: Record<TaskPriority, string> = {
  niedrig: "text-ink-faint",
  normal: "text-ink-muted",
  hoch: "text-status-wartung",
  dringend: "text-status-defekt font-semibold",
};

const priorityDot: Record<TaskPriority, string> = {
  niedrig: "bg-ink-faint",
  normal: "bg-ink-muted",
  hoch: "bg-status-wartung",
  dringend: "bg-status-defekt",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const option = TASK_PRIORITY_OPTIONS.find((o) => o.value === priority);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", priorityClasses[priority])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot[priority])} />
      {option?.label ?? priority}
    </span>
  );
}
