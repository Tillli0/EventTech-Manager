import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useDeviceAvailability } from "@/hooks/useJobs";
import { formatDate } from "@/lib/format";

/**
 * Zeigt eine Warnung, wenn ein Gerät im Zeitraum des aktuellen Jobs bereits in
 * anderen aktiven Jobs verplant ist UND die Summe dieser fremden Buchungen
 * zusammen mit der eigenen gewünschten Menge den Lagerbestand übersteigt.
 * Bei Mengen-Geräten (z.B. 20 Kabel) ist gleichzeitige Mehrfachbuchung also
 * kein Problem, solange insgesamt genug Bestand vorhanden ist.
 * Rendert nichts, solange kein echter Konflikt vorliegt.
 */
export function DeviceAvailabilityWarning({
  deviceId,
  startDate,
  endDate,
  excludeJobId,
  stockQuantity = 1,
  myQuantity = 1,
}: {
  deviceId: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  excludeJobId?: string;
  /** Gesamtbestand des Geräts (devices.stock_quantity). */
  stockQuantity?: number;
  /** Eigene gewünschte Menge auf diesem Job (packlist_items.quantity). */
  myQuantity?: number;
}) {
  const { data: bookings } = useDeviceAvailability(deviceId, startDate, endDate, excludeJobId);

  if (!bookings || bookings.length === 0) return null;

  const otherQuantity = bookings.reduce((sum, b) => sum + b.quantity, 0);
  const hasConflict = otherQuantity + myQuantity > stockQuantity;
  if (!hasConflict) return null;

  const shortage = otherQuantity + myQuantity - stockQuantity;

  return (
    <div className="mt-2 space-y-1">
      {stockQuantity > 1 && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-status-defekt">
          <AlertTriangle size={13} className="shrink-0" />
          Bestand reicht nicht: {otherQuantity + myQuantity} von {stockQuantity} benötigt (Engpass: {shortage})
        </p>
      )}
      {bookings.map((booking) => {
        const job = booking.jobs;
        if (!job) return null;
        return (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="flex items-start gap-1.5 rounded-md bg-status-wartung-bg px-2.5 py-1.5 text-xs text-status-wartung transition-colors hover:opacity-80"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              {stockQuantity > 1 ? `${booking.quantity}× ` : ""}
              bereits verplant für „{job.title}" ({formatDate(job.start_date)} – {formatDate(job.end_date)})
            </span>
          </Link>
        );
      })}
    </div>
  );
}
