import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import type { PersonalBlock, PersonalBlockCategory, PersonalRecurringBlock } from "@/lib/personalSchedule";

// Persönliche Zeitachse (PLAN-MEIN-PLAN.md M1). RLS ist strikt user_id = auth.uid()
// (siehe Migration 0039) — jeder Nutzer sieht ausschließlich seine eigenen Zeilen,
// die Query filtert zusätzlich client-seitig auf die eigene ID (Komfort, kein Schutz —
// der Schutz sitzt in der DB).

const PERSONAL_BLOCKS_KEY = ["personal-blocks"] as const;
const PERSONAL_RECURRING_KEY = ["personal-recurring-blocks"] as const;

export function usePersonalBlocks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...PERSONAL_BLOCKS_KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PersonalBlock[]> => {
      const { data, error } = await supabase
        .from("personal_blocks")
        .select("*")
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as PersonalBlock[];
    },
  });
}

export function usePersonalRecurringBlocks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...PERSONAL_RECURRING_KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PersonalRecurringBlock[]> => {
      const { data, error } = await supabase
        .from("personal_recurring_blocks")
        .select("*")
        .order("weekday", { ascending: true });
      if (error) throw error;
      return data as PersonalRecurringBlock[];
    },
  });
}

interface CreatePersonalBlockInput {
  category: PersonalBlockCategory;
  title?: string | null;
  start_at: string;
  end_at: string;
  notes?: string | null;
}

export function useCreatePersonalBlock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreatePersonalBlockInput) => {
      if (!user) throw new Error("Nicht angemeldet.");
      const { error } = await supabase.from("personal_blocks").insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAL_BLOCKS_KEY });
    },
  });
}

export function useDeletePersonalBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAL_BLOCKS_KEY });
    },
  });
}
