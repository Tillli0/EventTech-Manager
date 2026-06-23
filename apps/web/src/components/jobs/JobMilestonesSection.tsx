import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateTimeField } from "@/components/ui/DateTimeField";
import {
  useCreateJobMilestone,
  useUpdateJobMilestone,
  useDeleteJobMilestone,
} from "@/hooks/useJobs";
import type { JobMilestone } from "@/types/database";
import { toDate } from "@/lib/datetime";
import { formatTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function JobMilestonesSection({
  jobId,
  milestones,
  defaultAt,
}: {
  jobId: string;
  milestones: JobMilestone[];
  /** Vorbelegung für neue Programmpunkte, z.B. Job-Start. */
  defaultAt: string;
}) {
  const createMilestone = useCreateJobMilestone();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [at, setAt] = useState<Date | null>(null);

  function openForm() {
    setTitle("");
    setAt(toDate(defaultAt));
    setShowForm(true);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !at) return;
    createMilestone.mutate({ jobId, title: title.trim(), at: at.toISOString() });
    setShowForm(false);
  }

  const sorted = [...milestones].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div>
      {sorted.length === 0 && !showForm && (
        <p className="mb-3 text-sm text-ink-faint">
          Noch kein Zeitplan — füge Programmpunkte wie Aufbau, Soundcheck oder Eventstart hinzu.
        </p>
      )}

      {sorted.length > 0 && (
        <ol className="mb-3 space-y-1.5">
          {sorted.map((m, i) => (
            <MilestoneRow key={m.id} index={i} milestone={m} jobId={jobId} />
          ))}
        </ol>
      )}

      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-2 rounded-md border border-border bg-bg-raised p-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Aufbau, Soundcheck, Eventstart, Abbau"
            autoFocus
          />
          <DateTimeField value={at} onChange={setAt} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!title.trim() || !at}>
              Hinzufügen
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" size="sm" onClick={openForm}>
          <Plus size={14} />
          Programmpunkt
        </Button>
      )}
    </div>
  );
}

/** Eine Zeitplan-Zeile: kompakt „Nr · Datum · Uhrzeit · Titel" in einer Zeile,
 * per Stift-Knopf inline bearbeitbar (Titel + Zeitpunkt). */
function MilestoneRow({ index, milestone, jobId }: { index: number; milestone: JobMilestone; jobId: string }) {
  const updateMilestone = useUpdateJobMilestone();
  const deleteMilestone = useDeleteJobMilestone();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [at, setAt] = useState<Date | null>(toDate(milestone.at));

  function save() {
    if (!title.trim() || !at) return;
    updateMilestone.mutate({ id: milestone.id, jobId, title: title.trim(), at: at.toISOString() });
    setEditing(false);
  }

  function cancel() {
    setTitle(milestone.title);
    setAt(toDate(milestone.at));
    setEditing(false);
  }

  return (
    <li className="rounded-md border border-border bg-bg-raised">
      {/* Anzeige: alles in einer Zeile */}
      <div className={cn("flex items-center gap-2 px-3 py-2", editing && "border-b border-border")}>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[0.65rem] font-semibold text-accent">
          {index + 1}
        </span>
        <span className="shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-ink-muted">
          {formatDate(milestone.at)} · {formatTime(milestone.at)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{milestone.title}</span>
        <button
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 text-ink-faint hover:text-ink"
          aria-label="Programmpunkt bearbeiten"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => deleteMilestone.mutate({ id: milestone.id, jobId })}
          className="shrink-0 text-ink-faint hover:text-status-defekt"
          aria-label="Programmpunkt löschen"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Bearbeiten: Titel + Zeitpunkt */}
      {editing && (
        <div className="space-y-2 px-3 py-2.5">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bezeichnung" autoFocus />
          <DateTimeField value={at} onChange={setAt} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!title.trim() || !at}>
              <Check size={14} />
              Speichern
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel}>
              <X size={14} />
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
