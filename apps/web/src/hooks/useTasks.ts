import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Task, TaskStatus, TaskPriority } from "@/types/database";

const TASKS_KEY = ["tasks"] as const;

export function useTasks(filters?: { status?: TaskStatus; jobId?: string }) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: async (): Promise<Task[]> => {
      let query = supabase
        .from("tasks")
        .select("*, job:jobs(id, title)")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.jobId) {
        query = query.eq("job_id", filters.jobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useJobTasks(jobId: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, "job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<Task[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("job_id", jobId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  job_id?: string | null;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(input)
        .select("*, job:jobs(id, title)")
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(fields)
        .eq("id", id)
        .select("*, job:jobs(id, title)")
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}
