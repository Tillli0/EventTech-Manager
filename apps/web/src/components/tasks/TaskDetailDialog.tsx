import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase, Calendar, Check, ChevronDown, GripVertical,
  List, Plus, StickyNote, Trash2, X,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/ui/TaskBadges";
import {
  useTask, useUpdateTask, useDeleteTask, useUpdateTaskStatus,
  useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem, useReorderChecklistItems,
} from "@/hooks/useTasks";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, type TaskStatus, type TaskPriority, type TaskChecklistItem } from "@/types/database";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailDialog({ taskId, onClose }: Props) {
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateStatus = useUpdateTaskStatus();
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const reorderItems = useReorderChecklistItems();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [status, setStatus] = useState<TaskStatus>("offen");
  const [dueDate, setDueDate] = useState("");
  const [contentType, setContentType] = useState<"notes" | "list">("notes");

  // Checkliste
  const [newItemText, setNewItemText] = useState("");
  const [localItems, setLocalItems] = useState<TaskChecklistItem[]>([]);
  const dragIdx = useRef<number | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date ?? "");
    setContentType(task.content_type ?? "notes");
    setLocalItems(task.checklist_items ? [...task.checklist_items] : []);
  }, [task]);

  async function handleSave() {
    if (!task || !title.trim()) return;
    await updateTask.mutateAsync({
      id: task.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      due_date: dueDate || null,
      content_type: contentType,
    });
    setEditing(false);
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm(`„${task.title}" wirklich löschen?`)) return;
    await deleteTask.mutateAsync(task.id);
    onClose();
  }

  async function handleAddItem() {
    if (!task || !newItemText.trim()) return;
    const sortOrder = localItems.length;
    await createItem.mutateAsync({ taskId: task.id, text: newItemText.trim(), sortOrder });
    setNewItemText("");
  }

  async function handleToggleItem(item: TaskChecklistItem) {
    if (!task) return;
    await updateItem.mutateAsync({ id: item.id, taskId: task.id, checked: !item.checked });
  }

  async function handleDeleteItem(item: TaskChecklistItem) {
    if (!task) return;
    await deleteItem.mutateAsync({ id: item.id, taskId: task.id });
  }

  // Drag-to-reorder
  function onDragStart(idx: number) { dragIdx.current = idx; }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const reordered = [...localItems];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(idx, 0, moved);
    dragIdx.current = idx;
    setLocalItems(reordered);
  }
  async function onDragEnd() {
    if (!task) return;
    dragIdx.current = null;
    const withOrder = localItems.map((item, i) => ({ id: item.id, sort_order: i }));
    await reorderItems.mutateAsync({ taskId: task.id, items: withOrder });
  }

  if (!taskId) return null;

  return (
    <Dialog open={!!taskId} onClose={onClose} title={isLoading ? "Aufgabe …" : (task?.title ?? "Aufgabe")}>
      {isLoading && <p className="text-sm text-ink-muted py-4 text-center">Wird geladen …</p>}

      {task && !editing && (
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <TaskPriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-ink-faint">
                <Calendar size={12} />{formatDate(task.due_date)}
              </span>
            )}
            {task.job && (
              <Link
                to={`/jobs/${task.job_id}`}
                onClick={onClose}
                className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
              >
                <Briefcase size={12} />{task.job.title}
              </Link>
            )}
          </div>

          {/* Schnell-Status */}
          <div className="flex gap-1.5">
            {TASK_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateStatus.mutate({ id: task.id, status: opt.value })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors border",
                  task.status === opt.value
                    ? "border-accent bg-accent text-white"
                    : "border-border text-ink-muted hover:text-ink",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Inhalt: Notizen oder Checkliste */}
          {task.content_type === "notes" ? (
            <div>
              {task.description ? (
                <p className="text-sm text-ink whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-sm text-ink-faint italic">Keine Beschreibung.</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {localItems.length === 0 && (
                <p className="text-sm text-ink-faint italic">Noch keine Einträge.</p>
              )}
              {localItems.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDragEnd={onDragEnd}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-bg-raised group"
                >
                  <span className="cursor-grab text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity touch-none">
                    <GripVertical size={14} />
                  </span>
                  <button
                    onClick={() => handleToggleItem(item)}
                    className={cn(
                      "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                      item.checked
                        ? "border-status-verfuegbar bg-status-verfuegbar text-white"
                        : "border-border hover:border-accent",
                    )}
                    style={{ height: 18, width: 18 }}
                  >
                    {item.checked && <Check size={11} />}
                  </button>
                  <span className={cn("flex-1 text-sm", item.checked && "line-through text-ink-faint")}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-status-defekt transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              {/* Neuer Eintrag */}
              <div className="flex items-center gap-2 pt-1">
                <span style={{ width: 14 }} />
                <span style={{ width: 18 }} className="shrink-0" />
                <input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="Neuer Eintrag …"
                  className="flex-1 bg-transparent text-sm text-ink-muted outline-none placeholder:text-ink-faint"
                />
                {newItemText && (
                  <button onClick={handleAddItem} className="text-accent">
                    <Plus size={15} />
                  </button>
                )}
              </div>
              {/* Fortschritt */}
              {localItems.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs text-ink-faint mb-1">
                    <span>{localItems.filter((i) => i.checked).length} / {localItems.length}</span>
                    <span>{Math.round((localItems.filter((i) => i.checked).length / localItems.length) * 100)}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-status-verfuegbar transition-all"
                      style={{ width: `${(localItems.filter((i) => i.checked).length / localItems.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between border-t border-border pt-4">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>Bearbeiten</Button>
              <Button variant="danger" onClick={handleDelete}><Trash2 size={14} /></Button>
            </div>
            <Button variant="ghost" onClick={onClose}>Schließen</Button>
          </div>
        </div>
      )}

      {task && editing && (
        <div className="space-y-4">
          <FormField label="Titel *">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </FormField>

          {/* Typ: Notizen oder Liste */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContentType("notes")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                contentType === "notes" ? "border-accent bg-accent/5 text-accent" : "border-border text-ink-muted hover:text-ink",
              )}
            >
              <StickyNote size={15} />Notizen
            </button>
            <button
              type="button"
              onClick={() => setContentType("list")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                contentType === "list" ? "border-accent bg-accent/5 text-accent" : "border-border text-ink-muted hover:text-ink",
              )}
            >
              <List size={15} />Checkliste
            </button>
          </div>

          {contentType === "notes" && (
            <FormField label="Beschreibung">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Priorität">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {TASK_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Fällig am">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!title.trim() || updateTask.isPending}>
              {updateTask.isPending ? "Wird gespeichert …" : "Speichern"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
