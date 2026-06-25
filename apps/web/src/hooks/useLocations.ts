import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Location } from "@/types/database";

const LOCATIONS_KEY = ["locations"] as const;

export function useLocations() {
  return useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string | null }) => {
      const { data: existing } = await supabase
        .from("locations")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextSort = (existing?.[0]?.sort_order ?? 0) + 1;
      const { data, error } = await supabase
        .from("locations")
        .insert({ name: name.trim(), color: color ?? null, sort_order: nextSort })
        .select()
        .single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY }),
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string | null }) => {
      const fields: Record<string, unknown> = {};
      if (name !== undefined) fields.name = name.trim();
      if (color !== undefined) fields.color = color;
      const { data, error } = await supabase
        .from("locations")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
