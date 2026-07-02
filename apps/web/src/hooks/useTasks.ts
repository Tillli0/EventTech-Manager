import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Task, TaskStatus, TaskPriority, TaskContentType, TaskChecklistItem } from "@/types/database";

const TASKS_KEY = ["tasks"] as const;

export function useTasks(filters?: { status?: TaskStatus; jobId?: string }) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: async (): Promise<Task[]> => {
      let query = supabase
        .from("tasks")
        .select("*, job:jobs(id, title, color), assigned_user:profiles!assigned_user_id(id, full_name), checklist_items:task_checklist_items(*)")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.jobId) query = query.eq("job_id", filters.jobId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Task | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("tasks")
        .select("*, job:jobs(id, title, color), assigned_user:profiles!assigned_user_id(id, full_name), checklist_items:task_checklist_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      // Checklist-Items nach sort_order sortieren
      if (data.checklist_items) {
        data.checklist_items.sort((a: TaskChecklistItem, b: TaskChecklistItem) => a.sort_order - b.sort_order);
      }
      return data as Task;
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
        .select("*, checklist_items:task_checklist_items(*)")
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
  content_type?: TaskContentType;
  priority?: TaskPriority;
  assigned_to?: string | null;
  assigned_user_id?: string | null;
  due_date?: string | null;
  job_id?: string | null;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ content_type: "notes", ...input })
        .select("*, job:jobs(id, title, color)")
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Task> & { id: string }) => {
      // Join-Felder nicht mitschicken — das sind keine Spalten
      const { checklist_items: _c, job: _j, assigned_user: _a, ...updateFields } = fields;
      const { data, error } = await supabase
        .from("tasks")
        .update(updateFields)
        .eq("id", id)
        .select("*, job:jobs(id, title, color)")
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, task.id] });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

// ── Checklisten ────────────────────────────────────────────────────────────

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, text, sortOrder }: { taskId: string; text: string; sortOrder: number }) => {
      const { data, error } = await supabase
        .from("task_checklist_items")
        .insert({ task_id: taskId, text, sort_order: sortOrder })
        .select()
        .single();
      if (error) throw error;
      return data as TaskChecklistItem;
    },
    onSuccess: (item) => queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, item.task_id] }),
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId, ...fields }: Partial<TaskChecklistItem> & { id: string; taskId: string }) => {
      const { data, error } = await supabase
        .from("task_checklist_items")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, taskId } as TaskChecklistItem & { taskId: string };
    },
    onSuccess: (item) => queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, item.task_id] }),
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from("task_checklist_items").delete().eq("id", id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, taskId] }),
  });
}

export function useReorderChecklistItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, items }: { taskId: string; items: { id: string; sort_order: number }[] }) => {
      const updates = items.map((item) =>
        supabase.from("task_checklist_items").update({ sort_order: item.sort_order }).eq("id", item.id),
      );
      await Promise.all(updates);
      return taskId;
    },
    onSuccess: (taskId) => queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, taskId] }),
  });
}
