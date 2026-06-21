import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, FormField } from "@/components/ui/Input";
import { useCreateTask } from "@/hooks/useTasks";
import { TASK_PRIORITY_OPTIONS } from "@/types/database";
import type { TaskPriority } from "@/types/database";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  prefillJobId?: string | null;
  prefillJobTitle?: string | null;
}

export function CreateTaskDialog({ open, onClose, prefillJobId, prefillJobTitle }: CreateTaskDialogProps) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit() {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assigned_to: assignedTo.trim() || null,
      due_date: dueDate || null,
      job_id: prefillJobId ?? null,
    });
    setTitle("");
    setDescription("");
    setPriority("normal");
    setAssignedTo("");
    setDueDate("");
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

        <FormField label="Beschreibung">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional …"
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priorität">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Fällig am">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Zugewiesen an">
          <Input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Name des Teammitglieds"
          />
        </FormField>

        {prefillJobTitle && (
          <div className="rounded-md bg-bg-raised px-3 py-2 text-sm text-ink-muted">
            Verknüpft mit Job: <span className="font-medium text-ink">{prefillJobTitle}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending}>
            Anlegen
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
