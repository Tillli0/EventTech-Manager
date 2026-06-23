import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Label } from "@/components/ui/Input";
import { DateRangeField } from "@/components/ui/DateRangeField";
import { CalendarClock } from "lucide-react";
import { useCreateCalendarEntry, useDeleteCalendarEntry } from "@/hooks/useCalendar";
import { useJob } from "@/hooks/useJobs";
import type { CalendarEntry } from "@/types/database";
import { formatDateTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

interface CalendarEntryDialogProps {
  open: boolean;
  onClose: () => void;
  existingEntry?: CalendarEntry | null;
  prefillDate?: Date | null;
}

export function CalendarEntryDialog({ open, onClose, existingEntry, prefillDate }: CalendarEntryDialogProps) {
  const createEntry = useCreateCalendarEntry();
  const deleteEntry = useDeleteCalendarEntry();
  // Bei einem Termin, der zu einem Job gehört: dessen Zeitplan mitladen, damit
  // man direkt aus dem Kalender heraus den Programmablauf sieht.
  const { data: jobDetail } = useJob(existingEntry?.job_id ?? undefined);

  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingEntry || !prefillDate) return;
    const hasSpecificTime = prefillDate.getHours() !== 0 || prefillDate.getMinutes() !== 0;
    const s = new Date(prefillDate);
    if (!hasSpecificTime) s.setHours(10, 0, 0, 0);
    const e = new Date(s);
    e.setHours(s.getHours() + 1);
    setStart(s);
    setEnd(e);
    // Klick in Monatsansicht (00:00) → ganztägig vorschlagen
    if (!hasSpecificTime) setAllDay(true);
  }, [prefillDate, existingEntry]);

  function resetAndClose() {
    setTitle(""); setAllDay(false);
    setStart(null); setEnd(null);
    setNotes("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start || !end) return;

    const startIso = (allDay ? startOfDay(start) : start).toISOString();
    const endIso = (allDay ? endOfDay(end) : end).toISOString();

    await createEntry.mutateAsync({
      title: title.trim(),
      start_at: startIso,
      end_at: endIso,
      all_day: allDay,
      notes: notes.trim() || null,
    });
    resetAndClose();
  }

  async function handleDelete() {
    if (!existingEntry) return;
    if (!confirm(`„${existingEntry.title}" wirklich löschen?`)) return;
    await deleteEntry.mutateAsync(existingEntry.id);
    onClose();
  }

  if (existingEntry) {
    return (
      <Dialog open={open} onClose={onClose} title={existingEntry.title}>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-ink-faint">Zeitraum</p>
            {existingEntry.all_day ? (
              <p className="text-ink">
                {formatDate(existingEntry.start_at)}
                {existingEntry.start_at.slice(0, 10) !== existingEntry.end_at.slice(0, 10) &&
                  ` – ${formatDate(existingEntry.end_at)}`}
                <span className="ml-2 rounded bg-bg-raised px-1.5 py-0.5 text-xs text-ink-muted">Ganztägig</span>
              </p>
            ) : (
              <p className="text-ink">
                {formatDateTime(existingEntry.start_at)} – {formatDateTime(existingEntry.end_at)}
              </p>
            )}
          </div>
          {existingEntry.job?.location && (
            <div>
              <p className="text-xs text-ink-faint">Ort</p>
              <p className="text-ink">{existingEntry.job.location}</p>
            </div>
          )}
          {existingEntry.notes && (
            <div>
              <p className="text-xs text-ink-faint">Notizen</p>
              <p className="text-ink">{existingEntry.notes}</p>
            </div>
          )}
          {/* Zeitplan des zugehörigen Jobs (Aufbau/Soundcheck/Abbau …) */}
          {jobDetail?.milestones && jobDetail.milestones.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                <CalendarClock size={13} />
                Zeitplan
              </p>
              <ul className="space-y-1.5">
                {[...jobDetail.milestones]
                  .sort((a, b) => a.at.localeCompare(b.at))
                  .map((m) => (
                    <li key={m.id} className="flex items-baseline gap-2 text-sm">
                      <span className="w-28 shrink-0 tabular-nums text-ink-muted">{formatDateTime(m.at)}</span>
                      <span className="text-ink">{m.title}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {existingEntry.source !== "intern" && (
            <p className="text-xs text-ink-faint">
              Synchronisiert über {existingEntry.source === "google" ? "Google Calendar" : "iCal"}
            </p>
          )}
          <div className="flex justify-between border-t border-border pt-4">
            {existingEntry.job_id ? (
              <Link to={`/jobs/${existingEntry.job_id}`}><Button variant="secondary">Zum Job</Button></Link>
            ) : <span />}
            {existingEntry.source === "intern" && (
              <Button variant="danger" onClick={handleDelete}><Trash2 size={14} />Löschen</Button>
            )}
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={resetAndClose} title="Termin anlegen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel *">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </FormField>

        {/* Ganztägig-Toggle */}
        <button
          type="button"
          onClick={() => setAllDay((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors text-left",
            allDay ? "border-accent bg-accent/5 text-accent" : "border-border bg-bg-raised text-ink-muted hover:text-ink",
          )}
        >
          <span className={cn("flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", allDay ? "bg-accent" : "bg-border")}>
            <span className={cn("h-4 w-4 rounded-full bg-white shadow transition-transform", allDay ? "translate-x-4" : "translate-x-0.5")} />
          </span>
          <span className="font-medium">Ganztägig</span>
        </button>

        <div>
          <Label>Zeitraum *</Label>
          <DateRangeField
            key={`${prefillDate?.getTime() ?? "new"}-${allDay}`}
            allDay={allDay}
            initialStart={start}
            initialEnd={end}
            onChange={(s, e) => { setStart(s); setEnd(e); }}
          />
        </div>

        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={resetAndClose}>Abbrechen</Button>
          <Button type="submit" disabled={createEntry.isPending}>
            {createEntry.isPending ? "Wird gespeichert …" : "Termin anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
