import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Mail,
  Phone,
  Building2,
  Calendar,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  Clock,
} from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  useWebsiteLeads,
  useAcceptLead,
  useUpdateWebsiteLeadStatus,
  findCustomerByContact,
} from "@/hooks/useWebsiteLeads";
import type { Customer, WebsiteLead, WebsiteLeadStatus } from "@/types/database";
import { formatDate, initials } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

const STATUS_META: Record<
  WebsiteLeadStatus,
  { label: string; badge: string; accent: string; icon: typeof Globe }
> = {
  neu: { label: "Neu", badge: "bg-accent/15 text-accent", accent: "#6366F1", icon: Sparkles },
  akzeptiert: {
    label: "Akzeptiert",
    badge: "bg-status-verfuegbar/15 text-status-verfuegbar",
    accent: "#22C55E",
    icon: CheckCircle2,
  },
  verworfen: { label: "Verworfen", badge: "bg-bg-raised text-ink-faint", accent: "#3A3F4B", icon: X },
};

type LeadFilter = WebsiteLeadStatus | "alle";

function customerLabel(c: Customer): string {
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Kunde";
}

export function WebsiteLeadsView() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("kunden");
  const navigate = useNavigate();
  const { data: leads, isLoading, error } = useWebsiteLeads();
  const accept = useAcceptLead();
  const updateStatus = useUpdateWebsiteLeadStatus();
  const toast = useToast();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<LeadFilter>("neu");

  const counts = useMemo(() => {
    const c = { neu: 0, akzeptiert: 0, verworfen: 0 };
    leads?.forEach((l) => (c[l.status] += 1));
    return c;
  }, [leads]);

  const filtered = useMemo(
    () => (filter === "alle" ? leads : leads?.filter((l) => l.status === filter)) ?? [],
    [leads, filter],
  );

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

  // Dubletten-Erkennung: existiert schon ein Kunde mit gleicher Mail/Telefon, fragen,
  // ob dieser verwendet werden soll. Rückgabe = zu verwendender Bestandskunde oder null.
  async function resolveDuplicate(lead: WebsiteLead): Promise<Customer | null> {
    const existing = await findCustomerByContact(lead.email, lead.phone);
    if (!existing) return null;
    const useExisting = await confirm({
      title: "Kunde existiert bereits",
      message: `Es gibt bereits einen Kunden mit diesen Kontaktdaten: „${customerLabel(existing)}". Diesen verwenden statt einen neuen anzulegen?`,
      confirmLabel: "Bestehenden verwenden",
      cancelLabel: "Neuen anlegen",
    });
    return useExisting ? existing : null;
  }

  async function handleAccept(lead: WebsiteLead) {
    const ok = await confirm({
      title: "Anfrage akzeptieren?",
      message: `„${lead.name}" wird als Kunde übernommen und daraus automatisch ein Job (Status „Anfrage") erstellt.`,
      confirmLabel: "Akzeptieren & Job anlegen",
    });
    if (!ok) return;
    setBusyId(lead.id);
    try {
      const existingCustomer = await resolveDuplicate(lead);
      const { job } = await accept.mutateAsync({ lead, existingCustomer });
      toast.success("Anfrage akzeptiert – Job wurde erstellt.");
      navigate(`/jobs/${job.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte nicht akzeptiert werden.");
    } finally {
      setBusyId(null);
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

  async function handleRestore(lead: WebsiteLead) {
    try {
      await updateStatus.mutateAsync({ id: lead.id, status: "neu" });
      toast.success("Anfrage wiederhergestellt.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte nicht wiederhergestellt werden.");
    }
  }

  const filterOptions: { value: LeadFilter; label: string; count: number }[] = [
    { value: "neu", label: "Neu", count: counts.neu },
    { value: "akzeptiert", label: "Akzeptiert", count: counts.akzeptiert },
    { value: "verworfen", label: "Verworfen", count: counts.verworfen },
    { value: "alle", label: "Alle", count: leads.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-md bg-bg-raised p-1 w-fit">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              filter === opt.value ? "bg-bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {opt.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                filter === opt.value ? "bg-accent/15 text-accent" : "bg-bg-surface text-ink-faint",
              )}
            >
              {opt.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-faint">Keine Anfragen in dieser Ansicht.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const meta = STATUS_META[lead.status];
            const StatusIcon = meta.icon;
            const busy = busyId === lead.id && accept.isPending;
            return (
              <div
                key={lead.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-bg-surface transition-colors hover:border-accent/30"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: meta.accent }}
                  aria-hidden
                />
                <div className="p-4 pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: meta.accent }}
                      >
                        {initials(lead.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">{lead.name}</p>
                          <span
                            className={cn(
                              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              meta.badge,
                            )}
                          >
                            <StatusIcon size={12} />
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
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-accent">
                              <Mail size={13} />
                              {lead.email}
                            </a>
                          )}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-accent">
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
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                      <Clock size={12} />
                      {formatDate(lead.created_at)}
                    </span>
                  </div>

                  {lead.message && (
                    <p className="mt-3 whitespace-pre-wrap rounded-lg bg-bg-raised px-3 py-2 text-sm text-ink-muted">
                      {lead.message}
                    </p>
                  )}

                  {mayEdit && lead.status === "neu" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleAccept(lead)} disabled={busy}>
                        <CheckCircle2 size={15} />
                        {busy ? "Wird angelegt …" : "Akzeptieren & Job anlegen"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDiscard(lead)} disabled={busy}>
                        <X size={15} />
                        Verwerfen
                      </Button>
                    </div>
                  )}

                  {mayEdit && lead.status === "verworfen" && (
                    <div className="mt-3">
                      <Button size="sm" variant="ghost" onClick={() => handleRestore(lead)}>
                        <RotateCcw size={15} />
                        Wiederherstellen
                      </Button>
                    </div>
                  )}

                  {lead.status === "akzeptiert" && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-status-verfuegbar">
                      <CheckCircle2 size={13} />
                      Als Kunde übernommen und Job erstellt.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
