import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase, Check, GripVertical,
  List, Lock, Plus, Settings2, StickyNote, Trash2, Unlock, X,
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
import { cn } from "@/lib/cn";

interface Props {
  taskId: string | null;
  onClose: () => void;
}

type SaveState = "idle" | "saving" | "saved";
type ViewMode = "content" | "settings";

const AUTOSAVE_DELAY = 600;

export function TaskDetailDialog({ taskId, onClose }: Props) {
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateStatus = useUpdateTaskStatus();
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const reorderItems = useReorderChecklistItems();

  // "content" = der eigentliche Arbeitsbereich (Text oder Checkliste).
  // "settings" = Titel/Status/Priorität/Fälligkeit/Typ — über das Zahnrad erreichbar.
  const [viewMode, setViewMode] = useState<ViewMode>("content");
  // Sperrt nur den Inhaltsbereich (Content-View). Zahnrad bleibt davon unabhängig erreichbar.
  const [locked, setLocked] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date ?? "");
    setContentType(task.content_type ?? "notes");
    setLocalItems(task.checklist_items ? [...task.checklist_items] : []);
    setLocked(false);
    setViewMode("content");
    setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // Checklisten-Änderungen vom Server (z.B. nach Hinzufügen/Löschen) übernehmen,
  // ohne den oben stehenden Reset-Effekt erneut auszulösen.
  useEffect(() => {
    if (!task) return;
    setLocalItems(task.checklist_items ? [...task.checklist_items] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.checklist_items]);

  function queueAutosave(fields: Partial<{ title: string; description: string | null; due_date: string | null }>) {
    if (!task) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      await updateTask.mutateAsync({ id: task.id, ...fields });
      setSaveState("saved");
    }, AUTOSAVE_DELAY);
  }

  async function saveImmediately(fields: Partial<{ priority: TaskPriority; content_type: "notes" | "list" }>) {
    if (!task) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    await updateTask.mutateAsync({ id: task.id, ...fields });
    setSaveState("saved");
  }

  // ── Settings-Mode-Felder (Titel, Fälligkeit) ────────────────────────────
  function handleTitleChange(value: string) {
    setTitle(value);
    queueAutosave({ title: value });
  }
  function handleDueDateChange(value: string) {
    setDueDate(value);
    queueAutosave({ due_date: value || null });
  }
  function handlePriorityChange(value: TaskPriority) {
    setPriority(value);
    saveImmediately({ priority: value });
  }
  function handleContentTypeChange(value: "notes" | "list") {
    setContentType(value);
    saveImmediately({ content_type: value });
  }

  // ── Content-Mode-Feld (Notizen-Text) ────────────────────────────────────
  function handleDescriptionChange(value: string) {
    if (locked) return;
    setDescription(value);
    queueAutosave({ description: value.trim() || null });
  }

  // Ausstehenden Debounce-Timer beim Wechsel/Unmount aufräumen
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [taskId]);

  function handleClose() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      if (task) {
        updateTask.mutate({ id: task.id, title, description: description.trim() || null, due_date: dueDate || null });
      }
    }
    onClose();
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm(`„${task.title}" wirklich löschen?`)) return;
    await deleteTask.mutateAsync(task.id);
    onClose();
  }

  async function handleAddItem() {
    if (!task || !newItemText.trim() || locked) return;
    const sortOrder = localItems.length;
    await createItem.mutateAsync({ taskId: task.id, text: newItemText.trim(), sortOrder });
    setNewItemText("");
  }

  // Abhaken bleibt auch im Lock-Modus möglich — reines Erledigt-Markieren ist
  // Alltagsnutzung, kein inhaltliches Bearbeiten. Text/Reihenfolge/Löschen bleiben gesperrt.
  async function handleToggleItem(item: TaskChecklistItem) {
    if (!task) return;
    await updateItem.mutateAsync({ id: item.id, taskId: task.id, checked: !item.checked });
  }

  async function handleDeleteItem(item: TaskChecklistItem) {
    if (!task || locked) return;
    await deleteItem.mutateAsync({ id: item.id, taskId: task.id });
  }

  function onDragStart(idx: number) {
    if (locked) return;
    dragIdx.current = idx;
  }
  function onDragOver(e: React.DragEvent, idx: number) {
    if (locked) return;
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const reordered = [...localItems];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(idx, 0, moved);
    dragIdx.current = idx;
    setLocalItems(reordered);
  }
  async function onDragEnd() {
    if (!task || locked) return;
    dragIdx.current = null;
    const withOrder = localItems.map((item, i) => ({ id: item.id, sort_order: i }));
    await reorderItems.mutateAsync({ taskId: task.id, items: withOrder });
  }

  if (!taskId) return null;

  return (
    <Dialog open={!!taskId} onClose={handleClose} title={isLoading ? "Aufgabe …" : (task?.title ?? "Aufgabe")}>
      {isLoading && <p className="text-sm text-ink-muted py-4 text-center">Wird geladen …</p>}

      {task && (
        <div className="space-y-4">
          {/* Kopfzeile: links Kontext, rechts Zahnrad (Einstellungen) + Lock (Inhalt sperren) */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TaskPriorityBadge priority={priority} />
              <TaskStatusBadge status={status} />
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
            <div className="flex shrink-0 items-center gap-2">
              {viewMode === "content" && !locked && (
                <span className="w-16 text-right text-xs text-ink-faint">
                  {saveState === "saving" ? "Speichert …" : saveState === "saved" ? "Gespeichert" : ""}
                </span>
              )}
              <button
                type="button"
                onClick={() => setLocked((v) => !v)}
                title={locked ? "Inhalt entsperren" : "Inhalt sperren (nur Lesen)"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                  locked ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:text-ink hover:bg-bg-raised",
                )}
              >
                {locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setViewMode((v) => (v === "settings" ? "content" : "settings"))}
                title="Einstellungen (Titel, Status, Priorität, Fälligkeit, Typ)"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                  viewMode === "settings" ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:text-ink hover:bg-bg-raised",
                )}
              >
                <Settings2 size={14} />
              </button>
            </div>
          </div>

          {viewMode === "settings" ? (
            <div className="space-y-4">
              <FormField label="Titel">
                <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} required autoFocus />
              </FormField>

              {/* Schnell-Status */}
              <div className="flex gap-1.5">
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatus(opt.value);
                      updateStatus.mutate({ id: task.id, status: opt.value });
                    }}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      status === opt.value
                        ? "border-accent bg-accent text-white"
                        : "border-border text-ink-muted hover:text-ink",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Typ: Notizen oder Liste */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleContentTypeChange("notes")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors",
                    contentType === "notes" ? "border-accent bg-accent/5 text-accent" : "border-border text-ink-muted hover:text-ink",
                  )}
                >
                  <StickyNote size={15} />Notizen
                </button>
                <button
                  type="button"
                  onClick={() => handleContentTypeChange("list")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors",
                    contentType === "list" ? "border-accent bg-accent/5 text-accent" : "border-border text-ink-muted hover:text-ink",
                  )}
                >
                  <List size={15} />Checkliste
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Priorität">
                  <Select value={priority} onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}>
                    {TASK_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Fällig am">
                  <Input type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)} />
                </FormField>
              </div>

              <div className="flex justify-between border-t border-border pt-4">
                <Button variant="danger" onClick={handleDelete}><Trash2 size={14} />Löschen</Button>
                <Button variant="secondary" onClick={() => setViewMode("content")}>Zum Inhalt</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reiner Inhaltsbereich: Text oder Checkliste */}
              {contentType === "notes" ? (
                <Textarea
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  disabled={locked}
                  rows={8}
                  placeholder={locked ? "Keine Beschreibung." : "Beschreibung eingeben …"}
                  className="text-sm"
                  autoFocus
                />
              ) : (
                <div className="space-y-0.5">
                  {localItems.length === 0 && (
                    <p className="text-sm italic text-ink-faint">Noch keine Einträge.</p>
                  )}
                  {localItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable={!locked}
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={(e) => onDragOver(e, idx)}
                      onDragEnd={onDragEnd}
                      className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-bg-raised"
                    >
                      <span
                        className={cn(
                          "touch-none text-ink-faint transition-opacity",
                          locked ? "opacity-0" : "cursor-grab opacity-0 group-hover:opacity-100",
                        )}
                      >
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
                      <span className={cn("flex-1 text-sm", item.checked && "text-ink-faint line-through")}>
                        {item.text}
                      </span>
                      {!locked && (
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="text-ink-faint opacity-0 transition-all hover:text-status-defekt group-hover:opacity-100"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!locked && (
                    <div className="flex items-center gap-2 px-1 pt-1.5">
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
                  )}
                  {localItems.length > 0 && (
                    <div className="pt-2">
                      <div className="mb-1 flex items-center justify-between text-xs text-ink-faint">
                        <span>{localItems.filter((i) => i.checked).length} / {localItems.length}</span>
                        <span>{Math.round((localItems.filter((i) => i.checked).length / localItems.length) * 100)}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-status-verfuegbar transition-all"
                          style={{ width: `${(localItems.filter((i) => i.checked).length / localItems.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end border-t border-border pt-4">
                <Button variant="ghost" onClick={handleClose}>Schließen</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
