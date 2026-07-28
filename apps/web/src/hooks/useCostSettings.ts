import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CostSettings } from "@/types/database";

const COST_SETTINGS_KEY = ["cost-settings"] as const;

/** Kalkulations-Voreinstellungen (aktuell: Standard-Stundensatz) — Bereich 'anmietung',
 * siehe Migration 0054 für die Begründung gegen company_settings. */
export function useCostSettings() {
  return useQuery({
    queryKey: COST_SETTINGS_KEY,
    queryFn: async (): Promise<CostSettings | null> => {
      const { data, error } = await supabase.from("cost_settings").select("*").eq("id", true).maybeSingle();
      if (error) throw error;
      return data as CostSettings | null;
    },
  });
}

export function useUpdateCostSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fields: { default_hourly_rate: number | null }) => {
      const { data, error } = await supabase
        .from("cost_settings")
        .upsert({ id: true, ...fields })
        .select()
        .single();
      if (error) throw error;
      return data as CostSettings;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COST_SETTINGS_KEY }),
  });
}
