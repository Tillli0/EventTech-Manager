import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SUBRENTAL_COUNTING_STATUSES } from "@/lib/availability";
import type { Subrental, SubrentalItem, SubrentalLogistics, SubrentalStatus } from "@/types/database";

const SUBRENTALS_KEY = ["subrentals"] as const;
const SELECT = "*, supplier:suppliers(*), job:jobs(id, title, start_date, end_date), items:subrental_items(*)";

export function useSubrentals() {
  return useQuery({
    queryKey: SUBRENTALS_KEY,
    queryFn: async (): Promise<Subrental[]> => {
      const { data, error } = await supabase.from("subrentals").select(SELECT).order("start_date", { ascending: false });
      if (error) throw error;
      return data as Subrental[];
    },
  });
}

/** Anmiet-Vorgänge, die zu einem bestimmten Job gehören. */
export function useSubrentalsForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [...SUBRENTALS_KEY, "by-job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<Subrental[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("subrentals")
        .select(SELECT)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Subrental[];
    },
  });
}

export interface SubrentalItemInput {
  device_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
}

export interface CreateSubrentalInput {
  job_id: string;
  supplier_id: string;
  start_date: string;
  end_date: string;
  logistics: SubrentalLogistics;
  notes: string | null;
  items: SubrentalItemInput[];
}

export function useCreateSubrental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSubrentalInput): Promise<Subrental> => {
      const { items, ...fields } = input;
      const { data, error } = await supabase.from("subrentals").insert(fields).select().single();
      if (error) throw error;
      const subrental = data as Subrental;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("subrental_items").insert(
          items.map((item, index) => ({
            subrental_id: subrental.id,
            device_id: item.device_id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            sort_order: index,
          })),
        );
        if (itemsError) {
          await supabase.from("subrentals").delete().eq("id", subrental.id);
          throw itemsError;
        }
      }

      return subrental;
    },
    onSuccess: (subrental) => {
      queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBRENTALS_KEY, "by-job", subrental.job_id] });
    },
  });
}

export interface UpdateSubrentalInput extends Omit<CreateSubrentalInput, "job_id"> {
  id: string;
  job_id: string;
  status: SubrentalStatus;
}

/** Aktualisiert Kopfdaten + Status und ersetzt die Positionen komplett (wie bei Angeboten). */
export function useUpdateSubrental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSubrentalInput): Promise<Subrental> => {
      const { id, items, ...fields } = input;
      const { data, error } = await supabase.from("subrentals").update(fields).eq("id", id).select().single();
      if (error) throw error;
      const subrental = data as Subrental;

      const { error: delError } = await supabase.from("subrental_items").delete().eq("subrental_id", id);
      if (delError) throw delError;
      if (items.length > 0) {
        const { error: insError } = await supabase.from("subrental_items").insert(
          items.map((item, index) => ({
            subrental_id: id,
            device_id: item.device_id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            sort_order: index,
          })),
        );
        if (insError) throw insError;
      }

      return subrental;
    },
    onSuccess: (subrental) => {
      queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBRENTALS_KEY, "by-job", subrental.job_id] });
    },
  });
}

export function useDeleteSubrental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("subrentals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBRENTALS_KEY, "by-job", variables.jobId] });
    },
  });
}

/**
 * Anmiet-Zugänge je Gerät im Zeitraum (E3) — global, OHNE `excludeJobId`: anders als
 * bei Eigenbestand (der den eigenen Job ausschließt) soll eine für genau diesen Job
 * angelegte Anmietung auch für diesen Job als Zugang zählen. Nur Positionen MIT
 * `device_id` wirken (Freitext-Positionen decken keinen Katalog-Engpass), nur
 * `SUBRENTAL_COUNTING_STATUSES` (bestaetigt/uebernommen/zurueckgegeben) zählen.
 */
export function useSubrentalAdditionsMap(startDate: string | undefined, endDate: string | undefined) {
  return useQuery({
    queryKey: ["subrental-additions-map", startDate, endDate],
    enabled: !!startDate && !!endDate,
    queryFn: async (): Promise<Map<string, number>> => {
      // Reine Datums-Vergleiche (subrentals.start_date/end_date sind `date`, kein
      // Zeitanteil) — Tagesanteil abschneiden, sonst zählt ein gemeinsamer Randtag
      // je nach Uhrzeit-Koerzierung inkonsistent.
      const start = startDate!.slice(0, 10);
      const end = endDate!.slice(0, 10);

      const { data, error } = await supabase
        .from("subrental_items")
        .select("device_id, quantity, subrentals!inner(status, start_date, end_date)")
        .not("device_id", "is", null)
        .in("subrentals.status", [...SUBRENTAL_COUNTING_STATUSES])
        .lte("subrentals.start_date", end)
        .gte("subrentals.end_date", start);
      if (error) throw error;

      const map = new Map<string, number>();
      for (const row of data as unknown as { device_id: string | null; quantity: number }[]) {
        if (!row.device_id) continue;
        map.set(row.device_id, (map.get(row.device_id) ?? 0) + row.quantity);
      }
      return map;
    },
  });
}

export type { SubrentalItem };
