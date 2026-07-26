import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { usePersonalBlocks, usePersonalRecurringBlocks } from "@/hooks/usePersonalBlocks";
import { resolvePersonalBlocks, describeResolvedBlock } from "@/lib/personalSchedule";

/**
 * „Kann ich das überhaupt?"-Check: sobald ein Zeitraum gewählt ist, prüft diese
 * Komponente die EIGENEN Zeiten (Schule/Klausur/Köln-Schicht/Urlaub/Krank) auf
 * Überschneidung — bevor man zusagt, nicht danach. Nutzt strikt user-eigene RLS
 * (`personal_blocks`/`personal_recurring_blocks`, Migration 0039): kein Bereichs-
 * Recht nötig, jeder sieht ohnehin nur seine eigenen Zeilen.
 */
export function SelfAvailabilityHint({ start, end }: { start: Date | null; end: Date | null }) {
  const { data: blocks } = usePersonalBlocks();
  const { data: recurring } = usePersonalRecurringBlocks();

  const overlapping = useMemo(() => {
    if (!start || !end || !blocks || !recurring) return [];
    return resolvePersonalBlocks(blocks, recurring, start, end);
  }, [blocks, recurring, start, end]);

  if (overlapping.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-status-wartung/40 bg-status-wartung/10 px-3 py-2 text-xs text-status-wartung">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Du hast in diesem Zeitraum eigene Termine:</p>
        <p>{overlapping.map(describeResolvedBlock).join(" · ")}</p>
      </div>
    </div>
  );
}
