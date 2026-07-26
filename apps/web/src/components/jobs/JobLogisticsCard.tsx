import { useMemo } from "react";
import { AlertTriangle, Truck } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useSubrentalsForJob } from "@/hooks/useSubrentals";
import { buildLogisticsTimeline } from "@/lib/subrentalLogistics";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";

/**
 * Logistik-Faden: wann muss was wo abgeholt/zurückgebracht werden — über alle
 * Anmiet-Vorgänge dieses Jobs hinweg, chronologisch. Ohne eigenes Datenmodell,
 * reine Ableitung aus den Vorgängen (`lib/subrentalLogistics.ts`).
 */
export function JobLogisticsCard({ jobId }: { jobId: string }) {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("anmietung");
  const { data: subrentals } = useSubrentalsForJob(jobId);
  const events = useMemo(() => buildLogisticsTimeline(subrentals ?? []), [subrentals]);

  // Ohne Bereich 'anmietung' liefert RLS ohnehin leer — Karte bleibt dann unsichtbar
  // statt fälschlich "keine Termine" zu suggerieren (Muster JobSubrentalsCard).
  if (!mayEdit && events.length === 0) return null;
  if (events.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Truck size={15} />
          Logistik-Faden
        </h2>
      </CardHeader>
      <CardBody>
        <ol className="space-y-2">
          {events.map((event) => (
            <li key={`${event.subrentalId}-${event.type}`} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-ink">
                  <span className="font-mono text-xs text-ink-muted">{formatDate(event.date)}</span>{" "}
                  {event.label}
                </p>
                {event.isWeekend && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-status-wartung">
                    <AlertTriangle size={12} />
                    Fällt aufs Wochenende — vorher klären, ob der Partner da erreichbar ist.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
