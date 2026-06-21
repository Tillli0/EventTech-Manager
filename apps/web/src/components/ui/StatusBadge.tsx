import { cn } from "@/lib/cn";
import type { DeviceStatus, JobStatus, InquiryPipelineStatus } from "@/types/database";
import { DEVICE_STATUS_OPTIONS, JOB_STATUS_OPTIONS, INQUIRY_PIPELINE_OPTIONS } from "@/types/database";

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
