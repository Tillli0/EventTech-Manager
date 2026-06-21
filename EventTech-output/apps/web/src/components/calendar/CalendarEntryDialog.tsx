import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { useCreateCalendarEntry, useDeleteCalendarEntry } from "@/hooks/useCalendar";
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

  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingEntry || !prefillDate) return;
    const hasSpecificTime = prefillDate.getHours() !== 0 || prefillDate.getMinutes() !== 0;
    const startHour = hasSpecificTime ? prefillDate.getHours() : 10;
    const startMinute = hasSpecificTime ? prefillDate.getMinutes() : 0;
    setStartAt(toLocalDateTimeInput(prefillDate, startHour, startMinute));
    setEndAt(toLocalDateTimeInput(prefillDate, startHour + 1, startMinute));
    setStartDate(toLocalDateInput(prefillDate));
    setEndDate(toLocalDateInput(prefillDate));
    // Klick in Monatsansicht (00:00) → ganztägig vorschlagen
    if (!hasSpecificTime) setAllDay(true);
  }, [prefillDate, existingEntry]);

  function resetAndClose() {
    setTitle(""); setAllDay(false);
    setStartAt(""); setEndAt("");
    setStartDate(""); setEndDate("");
    setNotes("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    let start: string, end: string;
    if (allDay) {
      if (!startDate || !endDate) return;
      start = new Date(startDate + "T00:00:00").toISOString();
      end = new Date(endDate + "T23:59:59").toISOString();
    } else {
      if (!startAt || !endAt) return;
      start = new Date(startAt).toISOString();
      end = new Date(endAt).toISOString();
    }

    await createEntry.mutateAsync({
      title: title.trim(),
      start_at: start,
      end_at: end,
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

        {allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Von *">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </FormField>
            <FormField label="Bis *">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </FormField>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start *">
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </FormField>
            <FormField label="Ende *">
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </FormField>
          </div>
        )}

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

function toLocalDateTimeInput(date: Date, hour: number, minute = 0): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
