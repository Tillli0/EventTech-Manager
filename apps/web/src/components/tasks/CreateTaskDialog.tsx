import { useState } from "react";
import { List, StickyNote } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, FormField, Label } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateField";
import { useCreateTask } from "@/hooks/useTasks";
import { useProfiles, profileLabel, assignableProfiles } from "@/hooks/useProfiles";
import { TASK_PRIORITY_OPTIONS } from "@/types/database";
import type { TaskPriority, TaskContentType } from "@/types/database";
import { cn } from "@/lib/cn";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  prefillJobId?: string | null;
  prefillJobTitle?: string | null;
}

export function CreateTaskDialog({ open, onClose, prefillJobId, prefillJobTitle }: CreateTaskDialogProps) {
  const createTask = useCreateTask();
  const { data: allProfiles } = useProfiles();
  const profiles = assignableProfiles(allProfiles);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<TaskContentType>("notes");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  async function handleSubmit() {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title: title.trim(),
      content_type: contentType,
      description: contentType === "notes" ? (description.trim() || null) : null,
      priority,
      due_date: dueDate || null,
      job_id: prefillJobId ?? null,
      assigned_user_id: assignedUserId || null,
    });
    setTitle(""); setContentType("notes"); setDescription("");
    setPriority("normal"); setDueDate(""); setAssignedUserId("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Aufgabe anlegen">
      <div className="space-y-4">
        <FormField label="Titel *">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Kabel prüfen vor Aufbau"
            autoFocus
          />
        </FormField>

        {/* Typ-Auswahl */}
        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">Aufgabentyp</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContentType("notes")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                contentType === "notes"
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-border text-ink-muted hover:text-ink",
              )}
            >
              <StickyNote size={15} />Notizen
            </button>
            <button
              type="button"
              onClick={() => setContentType("list")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                contentType === "list"
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-border text-ink-muted hover:text-ink",
              )}
            >
              <List size={15} />Checkliste
            </button>
          </div>
        </div>

        {contentType === "notes" && (
          <FormField label="Beschreibung">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional …"
              rows={3}
            />
          </FormField>
        )}

        {contentType === "list" && (
          <p className="rounded-md bg-bg-raised px-3 py-2 text-xs text-ink-muted">
            Checklisten-Einträge kannst du nach dem Anlegen in der Detailansicht hinzufügen.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priorität">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Fällig am">
            <DateInput value={dueDate} onChange={setDueDate} placeholder="Datum wählen" />
          </FormField>
        </div>

        <div>
          <Label>Zuweisen an</Label>
          {profiles.length === 0 ? (
            <p className="mt-1 text-sm text-ink-faint">Keine Nutzer verfügbar.</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-2">
              {profiles.map((p) => {
                const active = assignedUserId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAssignedUserId(active ? "" : p.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-border text-ink-muted hover:border-accent/40 hover:text-ink",
                    )}
                  >
                    {profileLabel(p)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {prefillJobTitle && (
          <div className="rounded-md bg-bg-raised px-3 py-2 text-sm text-ink-muted">
            Verknüpft mit Job: <span className="font-medium text-ink">{prefillJobTitle}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending}>
            Anlegen
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
