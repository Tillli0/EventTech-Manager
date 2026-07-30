import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JobNote } from "@/types/database";

const JOB_NOTES_KEY = ["job-notes"] as const;
const SELECT = "*, author:profiles(id, full_name)";

/** Gesprächsverlauf eines Jobs (P6) — absteigend, neueste zuerst. */
export function useJobNotesForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [...JOB_NOTES_KEY, "by-job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<JobNote[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("job_notes")
        .select(SELECT)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JobNote[];
    },
  });
}

export function useCreateJobNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, body }: { jobId: string; body: string }): Promise<JobNote> => {
      const { data, error } = await supabase
        .from("job_notes")
        .insert({ job_id: jobId, body })
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as JobNote;
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_NOTES_KEY, "by-job", note.job_id] });
    },
  });
}

export function useDeleteJobNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("job_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOB_NOTES_KEY, "by-job", variables.jobId] });
    },
  });
}
