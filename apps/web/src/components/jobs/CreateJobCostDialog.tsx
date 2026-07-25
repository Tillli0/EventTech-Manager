import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateField";
import { useProfiles, assignableProfiles, profileLabel } from "@/hooks/useProfiles";
import { useCreateJobCost, useUpdateJobCost } from "@/hooks/useJobCosts";
import { JOB_COST_TYPE_LABELS } from "@/types/database";
import type { JobCost, JobCostType } from "@/types/database";

const COST_TYPES = Object.keys(JOB_COST_TYPE_LABELS) as JobCostType[];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function CreateJobCostDialog({
  open,
  onClose,
  jobId,
  editCost,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  editCost?: JobCost;
}) {
  const { data: allProfiles } = useProfiles();
  const profiles = assignableProfiles(allProfiles);
  const createCost = useCreateJobCost();
  const updateCost = useUpdateJobCost();
  const isEdit = !!editCost;

  const [costType, setCostType] = useState<JobCostType>("personal");
  const [profileId, setProfileId] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [amount, setAmount] = useState("");
  const [costDate, setCostDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editCost) {
      setCostType(editCost.cost_type);
      setProfileId(editCost.profile_id ?? "");
      setDescription(editCost.description);
      setHours(editCost.hours != null ? String(editCost.hours) : "");
      setHourlyRate(editCost.hourly_rate != null ? String(editCost.hourly_rate) : "");
      setAmount(String(editCost.amount));
      setCostDate(editCost.cost_date ?? "");
    } else {
      setCostType("personal");
      setProfileId("");
      setDescription("");
      setHours("");
      setHourlyRate("");
      setAmount("");
      setCostDate("");
    }
    setFormError(null);
  }, [open, editCost]);

  // Stunden×Satz-Rechner: solange beide Werte gesetzt sind, ist der Betrag daraus
  // abgeleitet (read-only) — für Pauschalkosten ohne Stunden bleibt er frei editierbar.
  const hoursNum = hours.trim() === "" ? null : parseFloat(hours);
  const rateNum = hourlyRate.trim() === "" ? null : parseFloat(hourlyRate);
  const isComputed = hoursNum != null && !isNaN(hoursNum) && rateNum != null && !isNaN(rateNum);

  useEffect(() => {
    if (isComputed) setAmount(String(round2(hoursNum! * rateNum!)));
  }, [hoursNum, rateNum, isComputed]);

  function handleProfileChange(id: string) {
    setProfileId(id);
    if (!description.trim() && id) {
      const p = profiles.find((p) => p.id === id);
      if (p) setDescription(profileLabel(p));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!description.trim()) {
      setFormError("Bitte eine Bezeichnung angeben.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setFormError("Bitte einen gültigen Betrag angeben.");
      return;
    }

    const input = {
      job_id: jobId,
      cost_type: costType,
      profile_id: profileId || null,
      description: description.trim(),
      hours: hoursNum,
      hourly_rate: rateNum,
      amount: amountNum,
      cost_date: costDate || null,
    };

    try {
      if (editCost) {
        await updateCost.mutateAsync({ id: editCost.id, ...input });
      } else {
        await createCost.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kostenposition konnte nicht gespeichert werden.");
    }
  }

  const isPending = createCost.isPending || updateCost.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Kostenposition bearbeiten" : "Kostenposition hinzufügen"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Typ">
            <Select value={costType} onChange={(e) => setCostType(e.target.value as JobCostType)}>
              {COST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {JOB_COST_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Person (optional)">
            <Select value={profileId} onChange={(e) => handleProfileChange(e.target.value)}>
              <option value="">— keine —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {profileLabel(p)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Bezeichnung *">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z.B. Aufbau/Abbau" />
        </FormField>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Stunden">
            <Input
              type="number"
              min={0}
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="—"
            />
          </FormField>
          <FormField label="Satz/Std.">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="—"
            />
          </FormField>
          <FormField label="Betrag (netto) *">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={isComputed}
              className={isComputed ? "bg-bg-raised text-ink-muted" : undefined}
            />
          </FormField>
        </div>
        {isComputed && <p className="text-xs text-ink-faint">Betrag = Stunden × Satz, wird automatisch berechnet.</p>}

        <FormField label="Datum (optional)">
          <DateInput value={costDate} onChange={setCostDate} placeholder="Datum" />
        </FormField>

        {formError && (
          <div className="rounded-md border border-status-defekt/40 bg-status-defekt/10 px-3 py-2 text-sm text-status-defekt">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Wird gespeichert …" : isEdit ? "Änderungen speichern" : "Speichern"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
