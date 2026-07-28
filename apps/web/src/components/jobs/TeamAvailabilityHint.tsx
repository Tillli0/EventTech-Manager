import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useTeamBusyRanges } from "@/hooks/usePersonalBlocks";
import { rangesOverlap } from "@/lib/availability";
import { profileLabel } from "@/hooks/useProfiles";
import type { Profile } from "@/types/database";

/**
 * Team-Verfügbarkeit beim Zuweisen (PLAN-MEIN-PLAN.md M5, löst ROADMAP P4.1):
 * "Max ist am 14.09. nicht verfügbar" — ohne Grund. Nutzt bewusst nur
 * (user_id, start_at, end_at) aus `personal_busy_ranges` (E-G) — welche Kategorie
 * oder welcher Titel dahintersteckt, bleibt Max' Privatsache. Der Name der
 * zugewiesenen Person ist dagegen kein Geheimnis (sie ist im Team ohnehin
 * sichtbar) und wird hier zur Zuordnung verwendet.
 */
export function TeamAvailabilityHint({
  assignedProfiles,
  start,
  end,
}: {
  assignedProfiles: Profile[];
  start: string;
  end: string;
}) {
  const { data: busyRanges } = useTeamBusyRanges(start, end);

  const conflicts = useMemo(() => {
    if (!busyRanges || busyRanges.length === 0) return [];
    const assignedIds = new Set(assignedProfiles.map((p) => p.id));
    const relevant = busyRanges.filter(
      (r) => assignedIds.has(r.user_id) && rangesOverlap(r.start_at, r.end_at, start, end),
    );
    const byUser = new Map<string, Profile>();
    for (const r of relevant) {
      const profile = assignedProfiles.find((p) => p.id === r.user_id);
      if (profile) byUser.set(profile.id, profile);
    }
    return [...byUser.values()];
  }, [busyRanges, assignedProfiles, start, end]);

  if (conflicts.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-status-wartung/40 bg-status-wartung/10 px-3 py-2 text-xs text-status-wartung">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <p>
        {conflicts.map((p) => profileLabel(p)).join(", ")}{" "}
        {conflicts.length === 1 ? "ist" : "sind"} in diesem Zeitraum eigentlich nicht verfügbar
        (ohne Angabe des Grundes).
      </p>
    </div>
  );
}
