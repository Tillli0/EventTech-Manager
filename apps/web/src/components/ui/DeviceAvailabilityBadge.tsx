import { deviceBreakdown, type Device, type DeviceStatus } from "@/types/database";
import { DeviceStatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";

type DeviceLike = Pick<Device, "stock_quantity" | "defective_quantity" | "status">;

/**
 * Verfügbarkeits-Anzeige nach dem Modell „abgeleitete Verfügbarkeit".
 * - Einzelstück: klassisches Status-Badge (verfügbar/ausgeliehen/…), wobei
 *   „ausgeliehen" aus aktiven Jobs abgeleitet wird.
 * - Mengen-Gerät: Aufschlüsselung „X verfügbar · Y ausgeliehen · Z defekt".
 */
export function DeviceAvailabilityBadge({
  device,
  outNow,
  className,
}: {
  device: DeviceLike;
  /** Aktuell über aktive Jobs ausgegebene Stückzahl. */
  outNow: number;
  className?: string;
}) {
  if (device.stock_quantity <= 1) {
    const derived: DeviceStatus =
      outNow > 0 && device.status === "verfuegbar" ? "ausgeliehen" : device.status;
    return <DeviceStatusBadge status={derived} />;
  }

  const b = deviceBreakdown(device, outNow);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs", className)}>
      <Part dot="bg-status-verfuegbar" text="text-status-verfuegbar" label="verfügbar" value={b.available} />
      {b.out > 0 && (
        <Part dot="bg-status-ausgeliehen" text="text-status-ausgeliehen" label="ausgeliehen" value={b.out} />
      )}
      {b.defective > 0 && (
        <Part dot="bg-status-defekt" text="text-status-defekt" label="defekt" value={b.defective} />
      )}
    </span>
  );
}

function Part({ dot, text, label, value }: { dot: string; text: string; label: string; value: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {value} {label}
    </span>
  );
}
