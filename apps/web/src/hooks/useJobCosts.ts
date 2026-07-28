import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JobAssignee, JobCost, JobCostType, Profile } from "@/types/database";
import { suggestCostFromAssignment } from "@/lib/jobCosts";

const JOB_COSTS_KEY = ["job-costs"] as const;
/** !job_costs_profile_id_fkey grenzt die Einbettung ein — seit Migration 0054 hat
 * job_costs zwei FKs auf profiles (profile_id, assignee_user_id), PostgREST braucht
 * sonst eine Auswahl (Fehler 42P17 / HTTP 300 "Multiple Choices"). */
const SELECT = "*, profile:profiles!job_costs_profile_id_fkey(id, full_name)";

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
 * Übernimmt für jede zugewiesene Person eine Personal-Kostenzeile aus ihrer
 * Zuweisung (Stunden aus start_at/end_at, Satz aus cost_settings) — P4/E2.
 *
 * Upsert auf (job_id, assignee_user_id) statt Insert: eine Zeile pro Person und
 * Job, egal wie oft der Knopf gedrückt wird (Doppelzähl-Falle). Handgetippte
 * Kostenzeilen (assignee_user_id = null) bleiben davon unberührt — sie kollidieren
 * mit dem partiellen Unique-Index nie und werden hier nie angefasst.
 */
export function useAdoptAssignedAsCosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      assignees,
      defaultHourlyRate,
    }: {
      jobId: string;
      assignees: (Pick<JobAssignee, "user_id" | "start_at" | "end_at"> & { profile?: Profile })[];
      defaultHourlyRate: number | null;
    }): Promise<number> => {
      if (assignees.length === 0) return 0;
      const rows = assignees.map((a) => {
        const suggestion = suggestCostFromAssignment(a, defaultHourlyRate);
        return {
          job_id: jobId,
          cost_type: "personal" as const,
          profile_id: a.user_id,
          assignee_user_id: a.user_id,
          description: a.profile?.full_name?.trim() || "Personal",
          cost_date: null,
          ...suggestion,
        };
      });
      const { error } = await supabase.from("job_costs").upsert(rows, { onConflict: "job_id,assignee_user_id" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_COSTS_KEY, "by-job", variables.jobId] });
    },
  });
}
