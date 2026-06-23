import { useNow } from "@/hooks/useNow";

/**
 * Rote "Jetzt"-Linie (aktuelle Uhrzeit) im Stundenraster — das ikonische
 * Google-Calendar-Element. Positioniert sich absolut im umgebenden relativen
 * Container und aktualisiert sich minütlich. Außerhalb des sichtbaren
 * Stundenbereichs wird nichts gerendert.
 */
export function NowLine({
  startHour,
  endHour,
  hourHeight,
  showDot = true,
}: {
  startHour: number;
  endHour: number;
  hourHeight: number;
  showDot?: boolean;
}) {
  const now = useNow();
  const min = now.getHours() * 60 + now.getMinutes();
  if (min < startHour * 60 || min > (endHour + 1) * 60) return null;

  const top = ((min - startHour * 60) / 60) * hourHeight;

  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top }}>
      {showDot && (
        <span className="absolute -left-[5px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-status-defekt" />
      )}
      <div className="h-[2px] w-full bg-status-defekt" />
    </div>
  );
}
