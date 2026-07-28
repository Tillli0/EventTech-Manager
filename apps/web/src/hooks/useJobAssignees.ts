import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { diffAssigneeIds } from "@/lib/jobAssignees";
import type { JobAssignee } from "@/types/database";

const JOBS_KEY = ["jobs"] as const;

/**
 * Setzt die einem Job zugewiesenen Nutzer — als DIFF, nicht als Löschen-und-
 * Neuanlegen (P4/E1). Grund: job_assignees trägt seit Migration 0053 Zeiten und
 * Rolle je Zuweisung; ein komplettes Ersetzen würde diese Werte bei jedem
 * Checkbox-Toggle für unveränderte Personen stillschweigend auf null zurück-
 * setzen. Reine Differenz-Logik in lib/jobAssignees.ts (getestet).
 */
export function useSetJobAssignees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      currentUserIds,
      userIds,
    }: {
      jobId: string;
      /** Aktuell zugewiesene Nutzer — Grundlage für den Diff, NICHT einfach aus dem Cache lesen. */
      currentUserIds: string[];
      userIds: string[];
    }) => {
      const { toAdd, toRemove } = diffAssigneeIds(currentUserIds, userIds);

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("job_assignees")
          .delete()
          .eq("job_id", jobId)
          .in("user_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("job_assignees")
          .insert(toAdd.map((user_id) => ({ job_id: jobId, user_id })));
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

/** Zeiten/Rolle einer bestehenden Zuweisung aktualisieren (Verbund-Schlüssel job_id+user_id). */
export function useUpdateJobAssignee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      userId,
      ...fields
    }: { jobId: string; userId: string } & Partial<Pick<JobAssignee, "start_at" | "end_at" | "role">>) => {
      const { error } = await supabase
        .from("job_assignees")
        .update(fields)
        .eq("job_id", jobId)
        .eq("user_id", userId);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}

/** "Wer macht was" — Crew-Zuweisung eines Programmpunkts setzen (gleiches Diff-Muster). */
export function useSetMilestoneAssignees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      milestoneId,
      jobId,
      currentUserIds,
      userIds,
    }: {
      milestoneId: string;
      /** Nur für die Cache-Invalidierung nach dem Speichern. */
      jobId: string;
      currentUserIds: string[];
      userIds: string[];
    }) => {
      const { toAdd, toRemove } = diffAssigneeIds(currentUserIds, userIds);

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("milestone_assignees")
          .delete()
          .eq("milestone_id", milestoneId)
          .in("user_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("milestone_assignees")
          .insert(toAdd.map((user_id) => ({ milestone_id: milestoneId, user_id })));
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
