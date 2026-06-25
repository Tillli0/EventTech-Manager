import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DeviceHistory, DeviceHistoryEventType } from "@/types/database";

const HISTORY_SELECT =
  "*, job:jobs(id, title), from_location:locations!from_location_id(*), to_location:locations!to_location_id(*)";

/** Verlauf eines Geräts (neueste zuerst). */
export function useDeviceHistory(deviceId: string | undefined) {
  return useQuery({
    queryKey: ["device-history", deviceId],
    enabled: !!deviceId,
    queryFn: async (): Promise<DeviceHistory[]> => {
      const { data, error } = await supabase
        .from("device_history")
        .select(HISTORY_SELECT)
        .eq("device_id", deviceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeviceHistory[];
    },
  });
}

/** Verlauf aller Geräte eines Jobs (Ausgaben/Rückgaben dieses Jobs). */
export function useJobDeviceHistory(jobId: string | undefined) {
  return useQuery({
    queryKey: ["device-history", "job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<DeviceHistory[]> => {
      const { data, error } = await supabase
        .from("device_history")
        .select(`${HISTORY_SELECT}, device:devices(id, name)`)
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeviceHistory[];
    },
  });
}

export interface DeviceHistoryInput {
  device_id: string;
  event_type: DeviceHistoryEventType;
  job_id?: string | null;
  quantity?: number | null;
  from_location_id?: string | null;
  to_location_id?: string | null;
  note?: string | null;
}

/**
 * Schreibt einen History-Eintrag. Bewusst „best effort": Ein Fehler beim Protokoll
 * darf den eigentlichen Vorgang (Ausgabe/Rückgabe/Statuswechsel) nicht scheitern
 * lassen — wir loggen ihn nur. created_by wird per DB-Default (auth.uid()) gesetzt.
 */
export async function recordDeviceHistory(entry: DeviceHistoryInput): Promise<void> {
  const { error } = await supabase.from("device_history").insert(entry);
  if (error) console.error("device_history-Eintrag fehlgeschlagen:", error);
}
