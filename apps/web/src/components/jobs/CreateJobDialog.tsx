import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Label } from "@/components/ui/Input";
import { EventSchedulePicker } from "@/components/ui/EventSchedulePicker";
import { useCreateJob } from "@/hooks/useJobs";
import { useSetJobAssignees } from "@/hooks/useJobAssignees";
import { useProfiles, profileLabel } from "@/hooks/useProfiles";
import { useCustomers } from "@/hooks/useCustomers";
import { JobColorPicker } from "@/components/jobs/JobColorPicker";
import { randomJobColor } from "@/types/database";

export function CreateJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createJob = useCreateJob();
  const setAssignees = useSetJobAssignees();
  const { data: customers } = useCustomers();
  const { data: profiles } = useProfiles();

  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [color, setColor] = useState(() => randomJobColor());

  // Bei jedem Öffnen des Dialogs eine neue zufällige Farbe vorschlagen.
  useEffect(() => {
    if (open) setColor(randomJobColor());
  }, [open]);

  function reset() {
    setTitle("");
    setCustomerId("");
    setLocation("");
    setStartDate(null);
    setEndDate(null);
    setAssigneeIds([]);
    setColor(randomJobColor());
  }

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function customerLabel(c: { company_name: string | null; first_name: string | null; last_name: string | null }) {
    return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    const selectedCustomer = customers?.find((c) => c.id === customerId);

    const job = await createJob.mutateAsync({
      title: title.trim(),
      customer_id: customerId || null,
      location: location.trim() || null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      color,
      customerLabel: selectedCustomer ? customerLabel(selectedCustomer) : null,
    });

    if (assigneeIds.length > 0) {
      await setAssignees.mutateAsync({ jobId: job.id, userIds: assigneeIds });
    }

    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Neuen Job anlegen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel *">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Sommerfest 2026" required />
        </FormField>

        <FormField label="Kunde">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Kein Kunde zugeordnet</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {customerLabel(c)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Ort">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z.B. Gasthaus zur Linde, Kassel" />
        </FormField>

        <div>
          <Label>Farbe (Kalenderanzeige)</Label>
          <JobColorPicker value={color} onChange={setColor} />
        </div>

        <div>
          <Label>Zeitraum *</Label>
          <EventSchedulePicker onChange={(start, end) => { setStartDate(start); setEndDate(end); }} />
        </div>

        {profiles && profiles.length > 0 && (
          <div>
            <Label>Zugewiesene Nutzer</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {profiles.map((p) => {
                const active = assigneeIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleAssignee(p.id)}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                      (active
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-border text-ink-muted hover:border-accent/40 hover:text-ink")
                    }
                  >
                    {profileLabel(p)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={createJob.isPending}>
            {createJob.isPending ? "Wird gespeichert …" : "Job anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
