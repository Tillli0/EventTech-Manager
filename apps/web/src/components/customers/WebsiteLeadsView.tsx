import { useState } from "react";
import { Globe, Mail, Phone, Building2, Calendar, UserPlus, CalendarPlus, X } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import {
  useWebsiteLeads,
  useConvertLeadToCustomer,
  useCreateCustomerFromLead,
  useUpdateWebsiteLeadStatus,
} from "@/hooks/useWebsiteLeads";
import type { WebsiteLead, WebsiteLeadStatus } from "@/types/database";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

const STATUS_META: Record<WebsiteLeadStatus, { label: string; cls: string }> = {
  neu: { label: "Neu", cls: "bg-accent/15 text-accent" },
  bearbeitet: { label: "Bearbeitet", cls: "bg-status-verfuegbar/15 text-status-verfuegbar" },
  verworfen: { label: "Verworfen", cls: "bg-bg-raised text-ink-faint" },
};

export function WebsiteLeadsView() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("kunden");
  const { data: leads, isLoading, error } = useWebsiteLeads();
  const convert = useConvertLeadToCustomer();
  const createForJob = useCreateCustomerFromLead();
  const updateStatus = useUpdateWebsiteLeadStatus();
  const toast = useToast();
  const confirm = useConfirm();
  // Lead, für den gerade der vorbefüllte Job-Dialog offen ist (inkl. frisch angelegtem Kunden).
  const [jobDialog, setJobDialog] = useState<{ lead: WebsiteLead; customerId: string } | null>(null);

  if (isLoading) return <LoadingState label="Website-Anfragen werden geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!leads || leads.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="Noch keine Website-Anfragen"
        description="Einsendungen des Kontaktformulars auf der Website erscheinen hier."
      />
    );
  }

  async function handleConvert(lead: WebsiteLead) {
    const ok = await confirm({
      title: "Zu Kunde machen?",
      message: `„${lead.name}" wird als Kunde angelegt und es entsteht eine Anfrage-Karte in der Pipeline.`,
      confirmLabel: "Anlegen",
    });
    if (!ok) return;
    try {
      await convert.mutateAsync(lead);
      toast.success("Kunde und Anfrage angelegt.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte nicht angelegt werden.");
    }
  }

  async function handleMakeJob(lead: WebsiteLead) {
    const ok = await confirm({
      title: "Zu Job machen?",
      message: `„${lead.name}" wird als Kunde angelegt; anschließend öffnet sich der Job-Dialog vorbefüllt mit den Anfrage-Daten.`,
      confirmLabel: "Weiter",
    });
    if (!ok) return;
    try {
      const customer = await createForJob.mutateAsync(lead);
      setJobDialog({ lead, customerId: customer.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte nicht angelegt werden.");
    }
  }

  async function handleDiscard(lead: WebsiteLead) {
    const ok = await confirm({
      title: "Anfrage verwerfen?",
      message: `Die Anfrage von „${lead.name}" wird als verworfen markiert.`,
      confirmLabel: "Verwerfen",
      danger: true,
    });
    if (!ok) return;
    try {
      await updateStatus.mutateAsync({ id: lead.id, status: "verworfen" });
      toast.success("Anfrage verworfen.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte nicht verworfen werden.");
    }
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const meta = STATUS_META[lead.status];
        return (
          <div key={lead.id} className="rounded-lg border border-border bg-bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{lead.name}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", meta.cls)}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  {lead.company && (
                    <span className="flex items-center gap-1">
                      <Building2 size={13} />
                      {lead.company}
                    </span>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-ink">
                      <Mail size={13} />
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-ink">
                      <Phone size={13} />
                      {lead.phone}
                    </a>
                  )}
                  {(lead.event_date || lead.event_type) && (
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {[lead.event_type, lead.event_date ? formatDate(lead.event_date) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-ink-faint">{formatDate(lead.created_at)}</span>
            </div>

            {lead.message && (
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-bg-raised px-3 py-2 text-sm text-ink-muted">
                {lead.message}
              </p>
            )}

            {mayEdit && lead.status === "neu" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handleConvert(lead)} disabled={convert.isPending}>
                  <UserPlus size={15} />
                  Zu Kunde machen
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleMakeJob(lead)}
                  disabled={createForJob.isPending}
                >
                  <CalendarPlus size={15} />
                  Zu Job machen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDiscard(lead)}>
                  <X size={15} />
                  Verwerfen
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {jobDialog && (
        <CreateJobDialog
          open
          onClose={() => setJobDialog(null)}
          initialCustomerId={jobDialog.customerId}
          initialTitle={jobDialog.lead.event_type || "Website-Anfrage"}
          initialStart={jobDialog.lead.event_date ? new Date(jobDialog.lead.event_date) : null}
          initialEnd={jobDialog.lead.event_date ? new Date(jobDialog.lead.event_date) : null}
          initialNotes={jobDialog.lead.message}
          onCreated={() => toast.success("Job aus Anfrage angelegt.")}
        />
      )}
    </div>
  );
}
