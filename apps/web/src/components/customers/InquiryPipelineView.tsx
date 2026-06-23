import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useInquiries, useUpdateInquiryStatus } from "@/hooks/useCustomers";
import { INQUIRY_PIPELINE_OPTIONS, type InquiryPipelineStatus, type CustomerInquiry } from "@/types/database";
import { formatDate, formatCurrency } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

export function InquiryPipelineView() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("kunden");
  const { data: inquiries, isLoading, error } = useInquiries();
  const updateStatus = useUpdateInquiryStatus();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<InquiryPipelineStatus, CustomerInquiry[]> = {
      neu: [],
      in_bearbeitung: [],
      angebot_gesendet: [],
      gewonnen: [],
      verloren: [],
    };
    inquiries?.forEach((inq) => map[inq.pipeline_status].push(inq));
    return map;
  }, [inquiries]);

  if (isLoading) return <LoadingState label="Anfragen werden geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!inquiries || inquiries.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Noch keine Anfragen"
        description="Anfragen erscheinen hier, sobald sie einem Kunden zugeordnet werden."
      />
    );
  }

  return (
    <div className="grid gap-3 overflow-x-auto pb-4 sm:grid-cols-3 lg:grid-cols-5">
      {INQUIRY_PIPELINE_OPTIONS.map((column) => (
        <div
          key={column.value}
          className="flex min-w-[220px] flex-col rounded-lg bg-bg-surface"
          onDragOver={(e) => mayEdit && e.preventDefault()}
          onDrop={() => {
            if (mayEdit && draggedId) {
              updateStatus.mutate({ id: draggedId, pipeline_status: column.value });
              setDraggedId(null);
            }
          }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{column.label}</p>
            <span className="rounded-full bg-bg-raised px-1.5 py-0.5 text-xs text-ink-faint">
              {grouped[column.value].length}
            </span>
          </div>
          <div className="flex-1 space-y-2 p-2">
            {grouped[column.value].map((inquiry) => (
              <Link
                key={inquiry.id}
                to={`/kunden/${inquiry.customer_id}`}
                draggable={mayEdit}
                onDragStart={() => mayEdit && setDraggedId(inquiry.id)}
                className={cn(
                  "block rounded-md border border-border bg-bg-raised px-3 py-2.5",
                  mayEdit && "cursor-grab active:cursor-grabbing",
                  "hover:border-accent/40",
                )}
              >
                <p className="text-sm font-medium text-ink">{inquiry.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {inquiry.customer?.company_name ||
                    [inquiry.customer?.first_name, inquiry.customer?.last_name].filter(Boolean).join(" ")}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
                  <span>{inquiry.event_date ? formatDate(inquiry.event_date) : "—"}</span>
                  <span className="font-mono">{formatCurrency(inquiry.budget_estimate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
