import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CalendarEntry, JobMilestone } from "@/types/database";

const CALENDAR_KEY = ["calendar"] as const;

export function useCalendarEntries(rangeStart: string, rangeEnd: string) {
  return useQuery({
    queryKey: [...CALENDAR_KEY, rangeStart, rangeEnd],
    queryFn: async (): Promise<CalendarEntry[]> => {
      const { data, error } = await supabase
        .from("calendar_entries")
        .select("*, job:jobs(*, customer:customers(*))")
        .lt("start_at", rangeEnd)
        .gt("end_at", rangeStart)
        .order("start_at", { ascending: true });
      if (error) throw error;
      // Termine von Jobs im Papierkorb ausblenden (interne Termine ohne Job bleiben).
      return (data as CalendarEntry[]).filter((e) => !e.job || !e.job.deleted_at);
    },
  });
}

interface CreateCalendarEntryInput {
  title: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  job_id?: string | null;
  notes?: string | null;
}

export function useCreateCalendarEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCalendarEntryInput) => {
      const { data, error } = await supabase
        .from("calendar_entries")
        .insert({ ...input, source: "intern" })
        .select()
        .single();
      if (error) throw error;
      return data as CalendarEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
    },
  });
}

export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<CalendarEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from("calendar_entries")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CalendarEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
    },
  });
}

export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
    },
  });
}

/**
 * Lädt alle Job-Unterevents (Meilensteine wie Aufbau/Abbau) im sichtbaren
 * Kalenderzeitraum, inkl. Job-Farbe und -Titel für die Darstellung als Punkt.
 */
export function useJobMilestonesInRange(rangeStart: string, rangeEnd: string) {
  return useQuery({
    queryKey: ["job-milestones", rangeStart, rangeEnd],
    queryFn: async (): Promise<(JobMilestone & { job: { id: string; title: string; color: string } })[]> => {
      const { data, error } = await supabase
        .from("job_milestones")
        // !inner + Filter: Zeitplan-Termine von Jobs im Papierkorb ausblenden.
        .select("*, job:jobs!inner(id, title, color, deleted_at)")
        .is("job.deleted_at", null)
        .gte("at", rangeStart)
        .lte("at", rangeEnd)
        .order("at", { ascending: true });
      if (error) throw error;
      return data as (JobMilestone & { job: { id: string; title: string; color: string } })[];
    },
  });
}

/**
 * Erkennt Kollisionen: mehrere Kalendereinträge, die sich zeitlich überlappen.
 */
export function detectCollisions(entries: CalendarEntry[]): Set<string> {
  const collidingIds = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      const aStart = new Date(a.start_at).getTime();
      const aEnd = new Date(a.end_at).getTime();
      const bStart = new Date(b.start_at).getTime();
      const bEnd = new Date(b.end_at).getTime();
      if (aStart < bEnd && bStart < aEnd) {
        collidingIds.add(a.id);
        collidingIds.add(b.id);
      }
    }
  }
  return collidingIds;
}
