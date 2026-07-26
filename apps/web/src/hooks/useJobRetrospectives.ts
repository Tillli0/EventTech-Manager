import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JobRetrospective } from "@/types/database";

const JOB_RETROSPECTIVES_KEY = ["job-retrospectives"] as const;

/** Der eigene Rückblick eines Jobs (höchstens einer — unique(job_id)). */
export function useRetrospectiveForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [...JOB_RETROSPECTIVES_KEY, "by-job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<JobRetrospective | null> => {
      if (!jobId) return null;
      const { data, error } = await supabase.from("job_retrospectives").select("*").eq("job_id", jobId).maybeSingle();
      if (error) throw error;
      return data as JobRetrospective | null;
    },
  });
}

export interface JobRetrospectiveInput {
  job_id: string;
  planned_hours: number | null;
  actual_hours: number | null;
  notes: string | null;
}

/** Legt den Rückblick an oder ersetzt ihn (unique(job_id) — höchstens einer je Job). */
export function useUpsertJobRetrospective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JobRetrospectiveInput): Promise<JobRetrospective> => {
      const { data, error } = await supabase
        .from("job_retrospectives")
        .upsert(input, { onConflict: "job_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as JobRetrospective;
    },
    onSuccess: (retro) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_RETROSPECTIVES_KEY, "by-job", retro.job_id] });
      queryClient.invalidateQueries({ queryKey: [...JOB_RETROSPECTIVES_KEY, "all-with-categories"] });
    },
  });
}

export interface RetrospectiveCandidate {
  jobId: string;
  jobTitle: string;
  jobStartDate: string;
  retrospective: Pick<JobRetrospective, "planned_hours" | "actual_hours" | "notes">;
  categoryIds: string[];
}

/**
 * Alle vorhandenen Rückblicke samt Kategorien der jeweiligen Packliste — Grundlage
 * für „Ähnliche frühere Jobs" (`lib/jobRetrospectives.ts`). RLS filtert über
 * `can_see_job` sowohl auf `job_retrospectives` als auch auf die genestete
 * `jobs`/`packlist_items`-Auswahl — keine zusätzliche Sichtbarkeits-Prüfung nötig.
 */
export function useRetrospectiveCandidates() {
  return useQuery({
    queryKey: [...JOB_RETROSPECTIVES_KEY, "all-with-categories"],
    queryFn: async (): Promise<RetrospectiveCandidate[]> => {
      const { data, error } = await supabase
        .from("job_retrospectives")
        .select(
          "planned_hours, actual_hours, notes, job:jobs(id, title, start_date, packlist_items(device:devices(category_id)))",
        );
      if (error) throw error;

      type Row = {
        planned_hours: number | null;
        actual_hours: number | null;
        notes: string | null;
        job: {
          id: string;
          title: string;
          start_date: string;
          packlist_items: { device: { category_id: string | null } | null }[] | null;
        } | null;
      };

      return (data as unknown as Row[])
        .filter((row): row is Row & { job: NonNullable<Row["job"]> } => !!row.job)
        .map((row) => ({
          jobId: row.job.id,
          jobTitle: row.job.title,
          jobStartDate: row.job.start_date,
          retrospective: { planned_hours: row.planned_hours, actual_hours: row.actual_hours, notes: row.notes },
          categoryIds: [
            ...new Set(
              (row.job.packlist_items ?? [])
                .map((item) => item.device?.category_id)
                .filter((id): id is string => !!id),
            ),
          ],
        }));
    },
  });
}
