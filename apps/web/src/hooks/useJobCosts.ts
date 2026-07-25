import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JobCost, JobCostType } from "@/types/database";

const JOB_COSTS_KEY = ["job-costs"] as const;
const SELECT = "*, profile:profiles(id, full_name)";

/** Alle Kosten-Positionen (für die Auswertungen-Seite — Deckungsbeitrag über alle Jobs). */
export function useJobCosts() {
  return useQuery({
    queryKey: JOB_COSTS_KEY,
    queryFn: async (): Promise<JobCost[]> => {
      const { data, error } = await supabase.from("job_costs").select(SELECT);
      if (error) throw error;
      return data as JobCost[];
    },
  });
}

/** Kosten-Positionen eines Jobs (Bereich 'anmietung', wie subrentals). */
export function useJobCostsForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [...JOB_COSTS_KEY, "by-job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<JobCost[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("job_costs")
        .select(SELECT)
        .eq("job_id", jobId)
        .order("cost_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JobCost[];
    },
  });
}

export interface JobCostInput {
  job_id: string;
  cost_type: JobCostType;
  profile_id: string | null;
  description: string;
  hours: number | null;
  hourly_rate: number | null;
  amount: number;
  cost_date: string | null;
}

export function useCreateJobCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JobCostInput): Promise<JobCost> => {
      const { data, error } = await supabase.from("job_costs").insert(input).select(SELECT).single();
      if (error) throw error;
      return data as JobCost;
    },
    onSuccess: (cost) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_COSTS_KEY, "by-job", cost.job_id] });
    },
  });
}

export interface UpdateJobCostInput extends JobCostInput {
  id: string;
}

export function useUpdateJobCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateJobCostInput): Promise<JobCost> => {
      const { id, ...fields } = input;
      const { data, error } = await supabase.from("job_costs").update(fields).eq("id", id).select(SELECT).single();
      if (error) throw error;
      return data as JobCost;
    },
    onSuccess: (cost) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_COSTS_KEY, "by-job", cost.job_id] });
    },
  });
}

export function useDeleteJobCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("job_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_COSTS_KEY, "by-job", variables.jobId] });
    },
  });
}

/**
 * Legt für jeden zugewiesenen Nutzer, der noch keine Personal-Kostenzeile hat,
 * eine leere Zeile an (Komfort — Namen nicht erneut abtippen, Stunden/Satz trägt
 * man danach pro Zeile ein).
 */
export function useAdoptAssignedAsCosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      profiles,
      existing,
    }: {
      jobId: string;
      profiles: { id: string; full_name: string | null }[];
      existing: JobCost[];
    }): Promise<number> => {
      const existingProfileIds = new Set(existing.filter((c) => c.profile_id).map((c) => c.profile_id));
      const toInsert = profiles.filter((p) => !existingProfileIds.has(p.id));
      if (toInsert.length === 0) return 0;
      const { error } = await supabase.from("job_costs").insert(
        toInsert.map((p) => ({
          job_id: jobId,
          cost_type: "personal" as const,
          profile_id: p.id,
          description: p.full_name?.trim() || "Personal",
          hours: null,
          hourly_rate: null,
          amount: 0,
          cost_date: null,
        })),
      );
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_COSTS_KEY, "by-job", variables.jobId] });
    },
  });
}
