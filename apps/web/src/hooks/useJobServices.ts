import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JobService, JobServiceStatus } from "@/types/database";

const JOB_SERVICES_KEY = ["job-services"] as const;
const SELECT = "*, supplier:suppliers(id, name, trade, phone)";

/** Fremdgewerke, die zu einem bestimmten Job koordiniert werden (P5). */
export function useJobServicesForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [...JOB_SERVICES_KEY, "by-job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<JobService[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("job_services")
        .select(SELECT)
        .eq("job_id", jobId)
        .order("on_site_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as JobService[];
    },
  });
}

export interface JobServiceInput {
  job_id: string;
  supplier_id: string;
  status: JobServiceStatus;
  on_site_at: string | null;
  notes: string | null;
}

export function useCreateJobService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JobServiceInput): Promise<JobService> => {
      const { data, error } = await supabase.from("job_services").insert(input).select(SELECT).single();
      if (error) throw error;
      return data as JobService;
    },
    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_SERVICES_KEY, "by-job", service.job_id] });
    },
  });
}

export interface UpdateJobServiceInput extends JobServiceInput {
  id: string;
}

export function useUpdateJobService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateJobServiceInput): Promise<JobService> => {
      const { id, ...fields } = input;
      const { data, error } = await supabase.from("job_services").update(fields).eq("id", id).select(SELECT).single();
      if (error) throw error;
      return data as JobService;
    },
    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_SERVICES_KEY, "by-job", service.job_id] });
    },
  });
}

export function useDeleteJobService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("job_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_SERVICES_KEY, "by-job", variables.jobId] });
    },
  });
}
