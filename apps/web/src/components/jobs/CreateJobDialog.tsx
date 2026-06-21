import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Input";
import { useCreateJob } from "@/hooks/useJobs";
import { useCustomers } from "@/hooks/useCustomers";

export function CreateJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createJob = useCreateJob();
  const { data: customers } = useCustomers();

  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function reset() {
    setTitle("");
    setCustomerId("");
    setLocation("");
    setStartDate("");
    setEndDate("");
  }

  function customerLabel(c: { company_name: string | null; first_name: string | null; last_name: string | null }) {
    return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    const selectedCustomer = customers?.find((c) => c.id === customerId);

    await createJob.mutateAsync({
      title: title.trim(),
      customer_id: customerId || null,
      location: location.trim() || null,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      customerLabel: selectedCustomer ? customerLabel(selectedCustomer) : null,
    });

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

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start *">
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Ende *">
            <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </FormField>
        </div>

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
