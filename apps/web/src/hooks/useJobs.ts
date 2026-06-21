import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Job, JobStatus, PacklistItem, JobMilestone } from "@/types/database";
import { randomJobColor } from "@/types/database";

const JOBS_KEY = ["jobs"] as const;

export function useJobs() {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customer:customers(*)")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: [...JOBS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Job | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "*, customer:customers(*), packlist_items(*, device:devices(*, barcodes(*))), milestones:job_milestones(*)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Job;
    },
  });
}

interface CreateJobInput {
  title: string;
  customer_id: string | null;
  location?: string | null;
  start_date: string;
  end_date: string;
  notes?: string | null;
  /** Wird automatisch zufällig vorbelegt, falls nicht angegeben. */
  color?: string;
  /** Optional vorab geladener Kunde, um einen zweiten Request für den Kalendertitel zu sparen. */
  customerLabel?: string | null;
}

/**
 * Legt einen Job an und erzeugt automatisch einen passenden Kalendereintrag
 * (1:1 zu Job-Start/Ende, Titel = Kundenname, Fallback Job-Titel).
 * Die Job-Farbe wird, falls nicht explizit übergeben, zufällig aus der Palette gewählt.
 */
export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerLabel, color, ...input }: CreateJobInput) => {
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({ ...input, color: color ?? randomJobColor() })
        .select()
        .single();
      if (error) throw error;

      const { error: calendarError } = await supabase.from("calendar_entries").insert({
        job_id: job.id,
        title: customerLabel?.trim() || job.title,
        start_at: job.start_date,
        end_at: job.end_date,
        all_day: false,
        source: "intern",
      });
      // Der Job ist bereits angelegt; ein Kalenderfehler soll das nicht rückgängig machen,
      // wird aber sichtbar gemacht statt verschluckt.
      if (calendarError) throw calendarError;

      return job as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Job;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.id] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Job> & { id: string }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Job;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}

// ============================================================
// Packliste
// ============================================================

export function useAddPacklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      deviceId,
      quantity = 1,
    }: {
      jobId: string;
      deviceId: string;
      quantity?: number;
    }) => {
      const { data, error } = await supabase
        .from("packlist_items")
        .insert({ job_id: jobId, device_id: deviceId, quantity })
        .select("*, device:devices(*, barcodes(*))")
        .single();
      if (error) throw error;
      return data as PacklistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
    },
  });
}

export function useRemovePacklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("packlist_items").delete().eq("id", id);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
    },
  });
}

export function useMarkPacklistItemPickedUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { data, error } = await supabase
        .from("packlist_items")
        .update({ picked_up_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data, jobId };
    },
    onSuccess: async ({ jobId }, variables) => {
      // Gerätestatus auf "ausgeliehen" setzen
      const { data: item } = await supabase
        .from("packlist_items")
        .select("device_id")
        .eq("id", variables.id)
        .single();
      if (item) {
        await supabase.from("devices").update({ status: "ausgeliehen" }).eq("id", item.device_id);
      }
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useMarkPacklistItemReturned() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      isDamaged = false,
      damageNotes,
    }: {
      id: string;
      jobId: string;
      isDamaged?: boolean;
      damageNotes?: string;
    }) => {
      const { data: item, error } = await supabase
        .from("packlist_items")
        .update({
          returned_at: new Date().toISOString(),
          is_damaged_on_return: isDamaged,
          damage_notes: damageNotes ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("devices")
        .update({ status: isDamaged ? "defekt" : "verfuegbar" })
        .eq("id", item.device_id);

      return { item, jobId };
    },
    onSuccess: ({ jobId }) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

/**
 * Prüft, ob ein Gerät im angegebenen Zeitraum bereits in einem anderen
 * aktiven Job (Anfrage/Bestätigt/Läuft) verplant ist.
 */
export function useDeviceAvailability(
  deviceId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
  excludeJobId?: string,
) {
  return useQuery({
    queryKey: ["device-availability", deviceId, startDate, endDate, excludeJobId],
    enabled: !!deviceId && !!startDate && !!endDate,
    queryFn: async () => {
      let query = supabase
        .from("packlist_items")
        .select("job_id, jobs!inner(id, title, status, start_date, end_date)")
        .eq("device_id", deviceId)
        .in("jobs.status", ["anfrage", "bestaetigt", "laeuft"])
        .lt("jobs.start_date", endDate)
        .gt("jobs.end_date", startDate);

      if (excludeJobId) {
        query = query.neq("job_id", excludeJobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ============================================================
// Unterevents (Meilensteine) — z.B. Aufbau, Abbau, Eventstart
// ============================================================

export function useCreateJobMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, title, at }: { jobId: string; title: string; at: string }) => {
      const { data, error } = await supabase
        .from("job_milestones")
        .insert({ job_id: jobId, title, at })
        .select()
        .single();
      if (error) throw error;
      return data as JobMilestone;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}

export function useUpdateJobMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      ...fields
    }: { id: string; jobId: string } & Partial<Pick<JobMilestone, "title" | "at">>) => {
      const { data, error } = await supabase
        .from("job_milestones")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as JobMilestone;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}

export function useDeleteJobMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("job_milestones").delete().eq("id", id);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}
