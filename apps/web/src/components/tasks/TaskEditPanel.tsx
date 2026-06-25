import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlignLeft, Briefcase, CalendarDays, Check, CircleDot, Flag, GripVertical, ListChecks, Plus, Settings, Trash2, X,
} from "lucide-react";
import { Select } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateField";
import { Popover } from "@/components/ui/Popover";
import { formatDate } from "@/lib/format";
import {
  useTask, useUpdateTask, useDeleteTask, useUpdateTaskStatus,
  useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem, useReorderChecklistItems,
} from "@/hooks/useTasks";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, type TaskStatus, type TaskPriority, type TaskChecklistItem } from "@/types/database";
import { cn } from "@/lib/cn";

interface Props {
  taskId: string;
  /** Wird nach erfolgreichem Löschen aufgerufen (z.B. um die Aufklappung zu schließen). */
  onDeleted?: () => void;
}

type SaveState = "idle" | "saving" | "saved";

const AUTOSAVE_DELAY = 600;

/**
 * Voller Aufgaben-Editor im Google-Tasks-Stil — ohne Popup-Rahmen, damit er
 * direkt inline in der Liste aufgeklappt werden kann. Oben runde Checkbox +
 * randloser Titel, darunter Icon-Zeilen für Details, Datum, Priorität, Status
 * und Unteraufgaben. Alles speichert automatisch.
 */
export function TaskEditPanel({ taskId, onDeleted }: Props) {
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateStatus = useUpdateTaskStatus();
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const reorderItems = useReorderChecklistItems();

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [status, setStatus] = useState<TaskStatus>("offen");
  const [dueDate, setDueDate] = useState("");

  const [newItemText, setNewItemText] = useState("");
  const [localItems, setLocalItems] = useState<TaskChecklistItem[]>([]);
  const dragIdx = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Aktuelle Textwerte für ein „Flush" beim Zuklappen/Unmount.
  const latest = useRef({ title: "", description: "", dueDate: "" });
  latest.current = { title, description, dueDate };

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date ?? "");
    setLocalItems(task.checklist_items ? [...task.checklist_items] : []);
    setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    setLocalItems(task.checklist_items ? [...task.checklist_items] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.checklist_items]);

  // Beim Verlassen (Zuklappen) ausstehende Textänderung noch speichern.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        updateTask.mutate({
          id: taskId,
          title: latest.current.title,
          description: latest.current.description.trim() || null,
          due_date: latest.current.dueDate || null,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function queueAutosave(fields: Partial<{ title: string; description: string | null; due_date: string | null }>) {
    if (!task) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      await updateTask.mutateAsync({ id: task.id, ...fields });
      debounceRef.current = null;
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

  async function handleDelete() {
    if (!task) return;
    if (!confirm(`„${task.title}" wirklich löschen?`)) return;
    await deleteTask.mutateAsync(task.id);
    onDeleted?.();
  }

  function toggleDone() {
    if (!task) return;
    const next: TaskStatus = status === "erledigt" ? "offen" : "erledigt";
    setStatus(next);
    updateStatus.mutate({ id: task.id, status: next });
  }

  // content_type automatisch pflegen, damit die Listenansicht den Fortschritt zeigt.
  function syncContentType(itemCount: number) {
    if (!task) return;
    const want = itemCount > 0 ? "list" : "notes";
    if ((task.content_type ?? "notes") !== want) saveImmediately({ content_type: want });
  }

  async function handleAddItem() {
    if (!task || !newItemText.trim()) return;
    await createItem.mutateAsync({ taskId: task.id, text: newItemText.trim(), sortOrder: localItems.length });
    setNewItemText("");
    syncContentType(localItems.length + 1);
  }
  async function handleToggleItem(item: TaskChecklistItem) {
    if (!task) return;
    await updateItem.mutateAsync({ id: item.id, taskId: task.id, checked: !item.checked });
  }
  async function handleDeleteItem(item: TaskChecklistItem) {
    if (!task) return;
    await deleteItem.mutateAsync({ id: item.id, taskId: task.id });
    syncContentType(localItems.length - 1);
  }

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
    await reorderItems.mutateAsync({ taskId: task.id, items: localItems.map((it, i) => ({ id: it.id, sort_order: i })) });
  }

  if (isLoading || !task) {
    return <p className="py-3 text-center text-sm text-ink-muted">Wird geladen …</p>;
  }

  const done = status === "erledigt";
  const checkedCount = localItems.filter((i) => i.checked).length;

  return (
    <div className="space-y-1">
      {/* Titel-Zeile: runde Checkbox + randloser Titel + Löschen */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggleDone}
          className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            done ? "border-status-verfuegbar bg-status-verfuegbar text-white" : "border-ink-faint hover:border-accent",
          )}
          aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        >
          <Check size={12} className={done ? "" : "opacity-0"} />
        </button>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); queueAutosave({ title: e.target.value }); }}
          placeholder="Titel"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-ink-faint",
            done && "text-ink-muted line-through",
          )}
        />

        {/* Einstellungen (Datum, Priorität, Status) im Zahnrad-Popover */}
        <div className="mt-0.5 shrink-0">
          <Popover
            align="right"
            trigger={
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-bg-raised hover:text-ink"
                aria-label="Einstellungen"
                title="Datum, Priorität, Status"
              >
                <Settings size={16} />
              </span>
            }
          >
            <div className="space-y-3">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <CalendarDays size={13} /> Fällig am
                </p>
                <DateInput
                  value={dueDate}
                  onChange={(v) => { setDueDate(v); queueAutosave({ due_date: v || null }); }}
                  placeholder="Datum hinzufügen"
                />
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <Flag size={13} /> Priorität
                </p>
                <Select
                  value={priority}
                  onChange={(e) => { setPriority(e.target.value as TaskPriority); saveImmediately({ priority: e.target.value as TaskPriority }); }}
                  className="h-9 w-full"
                >
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <CircleDot size={13} /> Status
                </p>
                <div className="flex gap-1.5">
                  {TASK_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setStatus(opt.value); updateStatus.mutate({ id: task.id, status: opt.value }); }}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        status === opt.value ? "border-accent bg-accent text-white" : "border-border text-ink-muted hover:text-ink",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Popover>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="mt-1 shrink-0 text-ink-faint transition-colors hover:text-status-defekt"
          aria-label="Aufgabe löschen"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Dezenter Fälligkeits-Hinweis, damit das Datum nicht komplett im Zahnrad verschwindet */}
      {dueDate && (
        <div className="flex items-center gap-1.5 pl-8 text-xs text-ink-muted">
          <CalendarDays size={12} />
          {formatDate(dueDate)}
        </div>
      )}

      {/* Details (Notizen) */}
      <Row icon={<AlignLeft size={16} />} align="start">
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); queueAutosave({ description: e.target.value.trim() || null }); }}
          placeholder="Details hinzufügen"
          rows={2}
          className="w-full resize-none bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      </Row>

      {/* Job-Bezug (nur Anzeige) */}
      {task.job && (
        <Row icon={<Briefcase size={16} style={{ color: task.job.color }} />}>
          <Link to={`/jobs/${task.job_id}`} className="flex items-center gap-2 text-sm text-accent hover:underline">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: task.job.color }}
              aria-hidden
            />
            {task.job.title}
          </Link>
        </Row>
      )}

      {/* Unteraufgaben (Checkliste) */}
      <div className="flex gap-3 pt-2">
        <span className="mt-1.5 shrink-0 text-ink-faint"><ListChecks size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Unteraufgaben</p>
            {localItems.length > 0 && (
              <span className="text-xs text-ink-faint">{checkedCount}/{localItems.length}</span>
            )}
          </div>

          <div className="space-y-0.5">
            {localItems.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-bg-raised"
              >
                <span className="cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical size={13} />
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleItem(item)}
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
                    item.checked ? "border-status-verfuegbar bg-status-verfuegbar text-white" : "border-ink-faint hover:border-accent",
                  )}
                >
                  {item.checked && <Check size={11} />}
                </button>
                <span className={cn("flex-1 text-sm text-ink", item.checked && "text-ink-faint line-through")}>{item.text}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item)}
                  className="text-ink-faint opacity-0 transition-all hover:text-status-defekt group-hover:opacity-100"
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            {/* Neue Unteraufgabe */}
            <div className="flex items-center gap-2 px-1 py-1">
              <span className="w-[13px] shrink-0" />
              <Plus size={16} className="shrink-0 text-ink-faint" />
              <input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="Unteraufgabe hinzufügen"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>

          {localItems.length > 0 && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-status-verfuegbar transition-all"
                style={{ width: `${(checkedCount / localItems.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Fußzeile: Speichern-Status */}
      <div className="flex items-center justify-end gap-2 pt-2 text-xs text-ink-faint">
        {saveState === "saving" ? "Speichert …" : saveState === "saved" ? "Gespeichert" : ""}
      </div>
    </div>
  );
}

/** Icon-Zeile im Google-Stil: kleines graues Icon links, Feld rechts. */
function Row({ icon, children, align = "center" }: { icon: React.ReactNode; children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <div className={cn("flex gap-3", align === "center" ? "items-center" : "items-start")}>
      <span className={cn("shrink-0 text-ink-faint", align === "start" && "mt-2")}>{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
