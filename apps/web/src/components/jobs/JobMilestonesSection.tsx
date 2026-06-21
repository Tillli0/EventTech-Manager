import { useState } from "react";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useCreateJobMilestone,
  useUpdateJobMilestone,
  useDeleteJobMilestone,
} from "@/hooks/useJobs";
import type { JobMilestone } from "@/types/database";
import { formatDateTime } from "@/lib/format";

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function JobMilestonesSection({
  jobId,
  milestones,
  defaultAt,
}: {
  jobId: string;
  milestones: JobMilestone[];
  /** Vorbelegung für neue Unterevents, z.B. Job-Start. */
  defaultAt: string;
}) {
  const createMilestone = useCreateJobMilestone();
  const updateMilestone = useUpdateJobMilestone();
  const deleteMilestone = useDeleteJobMilestone();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [at, setAt] = useState("");

  function openForm() {
    setTitle("");
    setAt(toLocalDateTimeInput(defaultAt));
    setShowForm(true);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !at) return;
    createMilestone.mutate({ jobId, title: title.trim(), at: new Date(at).toISOString() });
    setShowForm(false);
  }

  const sorted = [...milestones].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div>
      {sorted.length === 0 && !showForm && (
        <p className="mb-3 text-sm text-ink-faint">
          Keine Unterevents (z.B. Aufbau, Abbau) hinterlegt — optional.
        </p>
      )}

      {sorted.length > 0 && (
        <div className="mb-3 space-y-2">
          {sorted.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md border border-border bg-bg-raised px-3 py-2"
            >
              <CalendarClock size={14} className="shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                <Input
                  type="datetime-local"
                  value={toLocalDateTimeInput(m.at)}
                  onChange={(e) =>
                    e.target.value &&
                    updateMilestone.mutate({
                      id: m.id,
                      jobId,
                      at: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="mt-1 h-8 w-full max-w-[220px] text-xs"
                />
              </div>
              <p className="hidden text-xs text-ink-faint sm:block">{formatDateTime(m.at)}</p>
              <button
                onClick={() => deleteMilestone.mutate({ id: m.id, jobId })}
                className="shrink-0 text-ink-faint hover:text-status-defekt"
                aria-label="Unterevent löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-bg-raised p-3">
          <div className="min-w-[140px] flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Aufbau, Abbau, Eventstart"
              autoFocus
            />
          </div>
          <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="w-auto" />
          <Button type="submit" size="sm" disabled={!title.trim() || !at}>
            Hinzufügen
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
            Abbrechen
          </Button>
        </form>
      ) : (
        <Button variant="secondary" size="sm" onClick={openForm}>
          <Plus size={14} />
          Unterevent
        </Button>
      )}
    </div>
  );
}
