import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

const PROFILES_KEY = ["profiles"] as const;

/** Alle Nutzerprofile (für Zuweisungs-Dropdowns). Jeder Eingeloggte darf Namen lesen. */
export function useProfiles() {
  return useQuery({
    queryKey: PROFILES_KEY,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

/** Anzeigename eines Profils (Name, sonst „—"). */
export function profileLabel(profile: Pick<Profile, "full_name"> | null | undefined): string {
  return profile?.full_name?.trim() || "—";
}
