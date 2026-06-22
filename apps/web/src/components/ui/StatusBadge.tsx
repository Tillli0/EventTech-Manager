import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DeviceStatus, JobStatus, InquiryPipelineStatus, OfferStatus } from "@/types/database";
import {
  DEVICE_STATUS_OPTIONS,
  JOB_STATUS_OPTIONS,
  INQUIRY_PIPELINE_OPTIONS,
  OFFER_STATUS_OPTIONS,
} from "@/types/database";

const deviceDotClasses: Record<DeviceStatus, string> = {
  verfuegbar: "bg-status-verfuegbar",
  ausgeliehen: "bg-status-ausgeliehen",
  defekt: "bg-status-defekt",
  wartung: "bg-status-wartung",
};

const deviceBgClasses: Record<DeviceStatus, string> = {
  verfuegbar: "bg-status-verfuegbar-bg text-status-verfuegbar",
  ausgeliehen: "bg-status-ausgeliehen-bg text-status-ausgeliehen",
  defekt: "bg-status-defekt-bg text-status-defekt",
  wartung: "bg-status-wartung-bg text-status-wartung",
};

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const option = DEVICE_STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        deviceBgClasses[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", deviceDotClasses[status])} />
      {option?.label ?? status}
    </span>
  );
}

const jobDotClasses: Record<JobStatus, string> = {
  anfrage: "bg-job-anfrage",
  bestaetigt: "bg-job-bestaetigt",
  laeuft: "bg-job-laeuft",
  abgeschlossen: "bg-job-abgeschlossen",
  storniert: "bg-job-storniert",
};

const jobTextClasses: Record<JobStatus, string> = {
  anfrage: "text-job-anfrage",
  bestaetigt: "text-job-bestaetigt",
  laeuft: "text-job-laeuft",
  abgeschlossen: "text-job-abgeschlossen",
  storniert: "text-job-storniert",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const option = JOB_STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        "border-current/20",
        jobTextClasses[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", jobDotClasses[status])} />
      {option?.label ?? status}
    </span>
  );
}

export function InquiryStatusBadge({ status }: { status: InquiryPipelineStatus }) {
  const option = INQUIRY_PIPELINE_OPTIONS.find((o) => o.value === status);
  return (
    <span className="inline-flex items-center rounded-full bg-bg-raised px-2.5 py-1 text-xs font-medium text-ink-muted">
      {option?.label ?? status}
    </span>
  );
}

const offerTextClasses: Record<OfferStatus, string> = {
  entwurf: "text-ink-muted",
  gesendet: "text-status-wartung",
  angenommen: "text-status-verfuegbar",
  abgelehnt: "text-status-defekt",
};

const offerDotClasses: Record<OfferStatus, string> = {
  entwurf: "bg-ink-muted",
  gesendet: "bg-status-wartung",
  angenommen: "bg-status-verfuegbar",
  abgelehnt: "bg-status-defekt",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const option = OFFER_STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        "border-current/20",
        offerTextClasses[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", offerDotClasses[status])} />
      {option?.label ?? status}
    </span>
  );
}

/** Kleines Stamm­kunden-Abzeichen (Stern). Wird neben dem Kundennamen angezeigt. */
export function StammkundeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-status-wartung-bg px-2 py-0.5 text-xs font-medium text-status-wartung",
        className,
      )}
      title="Stammkunde"
    >
      <Star size={11} className="fill-current" />
      Stammkunde
    </span>
  );
}
