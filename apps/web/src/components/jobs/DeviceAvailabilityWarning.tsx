import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useDeviceAvailability } from "@/hooks/useJobs";
import { formatDate } from "@/lib/format";

/**
 * Zeigt eine Warnung, wenn ein Gerät im Zeitraum des aktuellen Jobs
 * bereits in einem anderen aktiven Job (Anfrage/Bestätigt/Läuft) verplant ist.
 * Rendert nichts, solange keine Kollision vorliegt.
 */
export function DeviceAvailabilityWarning({
  deviceId,
  startDate,
  endDate,
  excludeJobId,
}: {
  deviceId: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  excludeJobId?: string;
}) {
  const { data: conflicts } = useDeviceAvailability(deviceId, startDate, endDate, excludeJobId);

  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {conflicts.map((conflict) => {
        const job = (
          conflict as unknown as {
            job_id: string;
            jobs: { id: string; title: string; start_date: string; end_date: string };
          }
        ).jobs;
        if (!job) return null;
        return (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="flex items-start gap-1.5 rounded-md bg-status-wartung-bg px-2.5 py-1.5 text-xs text-status-wartung transition-colors hover:opacity-80"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Bereits verplant für „{job.title}" ({formatDate(job.start_date)} – {formatDate(job.end_date)})
            </span>
          </Link>
        );
      })}
    </div>
  );
}
