import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const JOBS_KEY = ["jobs"] as const;

/**
 * Setzt die einem Job zugewiesenen Nutzer (ersetzt die bestehende Zuweisung
 * komplett durch die übergebene Liste). Zugewiesene Nutzer sehen „ihren" Job
 * auch ohne vollen Jobs-Bereich (siehe RLS in 0012).
 */
export function useSetJobAssignees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, userIds }: { jobId: string; userIds: string[] }) => {
      const { error: delError } = await supabase.from("job_assignees").delete().eq("job_id", jobId);
      if (delError) throw delError;
      if (userIds.length > 0) {
        const { error } = await supabase
          .from("job_assignees")
          .insert(userIds.map((user_id) => ({ job_id: jobId, user_id })));
        if (error) throw error;
      }
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}
