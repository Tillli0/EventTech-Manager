import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JobMilestone, JobTemplate } from "@/types/database";
import { applyTemplateOffsets, deriveTemplateItemsFromMilestones } from "@/lib/jobTemplates";

const JOB_TEMPLATES_KEY = ["job-templates"] as const;
const SELECT = "*, items:job_template_items(*)";

export function useJobTemplates() {
  return useQuery({
    queryKey: JOB_TEMPLATES_KEY,
    queryFn: async (): Promise<JobTemplate[]> => {
      const { data, error } = await supabase.from("job_templates").select(SELECT).order("name", { ascending: true });
      if (error) throw error;
      return data as JobTemplate[];
    },
  });
}

export interface TemplateItemInput {
  title: string;
  offset_minutes: number;
  duration_minutes: number | null;
  notes: string | null;
}

export interface CreateJobTemplateInput {
  name: string;
  description: string | null;
  items: TemplateItemInput[];
}

export function useCreateJobTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateJobTemplateInput): Promise<JobTemplate> => {
      const { items, ...fields } = input;
      const { data, error } = await supabase.from("job_templates").insert(fields).select().single();
      if (error) throw error;
      const template = data as JobTemplate;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("job_template_items").insert(
          items.map((item, index) => ({ ...item, template_id: template.id, sort_order: index })),
        );
        if (itemsError) {
          await supabase.from("job_templates").delete().eq("id", template.id);
          throw itemsError;
        }
      }
      return template;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOB_TEMPLATES_KEY }),
  });
}

export function useDeleteJobTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOB_TEMPLATES_KEY }),
  });
}

/** "Aus diesem Job eine Vorlage machen" — Programmpunkte in Offsets zum Job-Start umrechnen. */
export function useCreateTemplateFromJob() {
  const createTemplate = useCreateJobTemplate();
  return useMutation({
    mutationFn: async ({
      name,
      jobStartDate,
      milestones,
    }: {
      name: string;
      jobStartDate: Date;
      milestones: Pick<JobMilestone, "title" | "at" | "end_at" | "notes">[];
    }): Promise<JobTemplate> => {
      const items = deriveTemplateItemsFromMilestones(milestones, jobStartDate);
      return createTemplate.mutateAsync({ name, description: null, items });
    },
  });
}

/** Wendet eine Vorlage auf einen Job an — legt die berechneten Programmpunkte direkt an. */
export function useApplyTemplateToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      jobStartDate,
      items,
    }: {
      jobId: string;
      jobStartDate: Date;
      items: TemplateItemInput[];
    }): Promise<number> => {
      const milestones = applyTemplateOffsets(items, jobStartDate);
      if (milestones.length === 0) return 0;
      const { error } = await supabase
        .from("job_milestones")
        .insert(milestones.map((m) => ({ ...m, job_id: jobId })));
      if (error) throw error;
      return milestones.length;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", variables.jobId] });
    },
  });
}
