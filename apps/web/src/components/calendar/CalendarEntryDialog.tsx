import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { useCreateCalendarEntry, useDeleteCalendarEntry } from "@/hooks/useCalendar";
import type { CalendarEntry } from "@/types/database";
import { formatDateTime } from "@/lib/format";

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
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingEntry) return;
    if (prefillDate) {
      // Wenn eine konkrete Uhrzeit übergeben wurde (Klick in Wochen-/Tagesansicht), diese
      // übernehmen. Bei einem reinen Tagesklick (Monatsansicht, Uhrzeit 00:00) auf 10 Uhr
      // vorbelegen, da ein Termin um Mitternacht selten gewollt ist.
      const hasSpecificTime = prefillDate.getHours() !== 0 || prefillDate.getMinutes() !== 0;
      const startHour = hasSpecificTime ? prefillDate.getHours() : 10;
      const startMinute = hasSpecificTime ? prefillDate.getMinutes() : 0;
      setStartAt(toLocalDateTimeInput(prefillDate, startHour, startMinute));
      setEndAt(toLocalDateTimeInput(prefillDate, startHour + 1, startMinute));
    }
  }, [prefillDate, existingEntry]);

  function resetAndClose() {
    setTitle("");
    setStartAt("");
    setEndAt("");
    setNotes("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startAt || !endAt) return;

    await createEntry.mutateAsync({
      title: title.trim(),
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
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
            <p className="text-ink">
              {formatDateTime(existingEntry.start_at)} – {formatDateTime(existingEntry.end_at)}
            </p>
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
              <Link to={`/jobs/${existingEntry.job_id}`}>
                <Button variant="secondary">Zum Job</Button>
              </Link>
            ) : (
              <span />
            )}
            {existingEntry.source === "intern" && (
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={14} />
                Löschen
              </Button>
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
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start *">
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </FormField>
          <FormField label="Ende *">
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </FormField>
        </div>
        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={resetAndClose}>
            Abbrechen
          </Button>
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
