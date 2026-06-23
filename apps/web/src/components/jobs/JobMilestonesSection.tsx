import { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
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
  const updateMilestone = useUpdateJobMilestone();
  const deleteMilestone = useDeleteJobMilestone();

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

  // Mehrtägiger Zeitplan? Dann pro Punkt auch das Datum zeigen, sonst nur Uhrzeit.
  const spansMultipleDays =
    sorted.length > 1 && sorted[0].at.slice(0, 10) !== sorted[sorted.length - 1].at.slice(0, 10);

  return (
    <div>
      {sorted.length === 0 && !showForm && (
        <p className="mb-3 text-sm text-ink-faint">
          Noch kein Zeitplan — füge Programmpunkte wie Aufbau, Soundcheck oder Eventstart hinzu.
        </p>
      )}

      {sorted.length > 0 && (
        <ol className="mb-3 space-y-0">
          {sorted.map((m, i) => (
            <li key={m.id} className="relative flex gap-3 pb-3 last:pb-0">
              {/* Zeitstrahl */}
              <div className="flex flex-col items-center">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[0.65rem] font-semibold text-accent">
                  {i + 1}
                </span>
                {i < sorted.length - 1 && <span className="w-px flex-1 bg-border" />}
              </div>

              <div className="min-w-0 flex-1 rounded-md border border-border bg-bg-raised px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{m.title}</p>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted">
                    <Clock size={12} />
                    {spansMultipleDays && `${formatDate(m.at)} · `}
                    {formatTime(m.at)}
                  </span>
                  <button
                    onClick={() => deleteMilestone.mutate({ id: m.id, jobId })}
                    className="shrink-0 text-ink-faint hover:text-status-defekt"
                    aria-label="Programmpunkt löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <DateTimeField
                  className="mt-2"
                  value={toDate(m.at)}
                  onChange={(d) => updateMilestone.mutate({ id: m.id, jobId, at: d.toISOString() })}
                />
              </div>
            </li>
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
