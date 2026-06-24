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

/**
 * Profile, die man einem Job zuweisen kann: ohne Administrator, und Verwaltung
 * vor den normalen Mitarbeitern (danach alphabetisch).
 */
export function assignableProfiles(profiles: Profile[] | undefined): Profile[] {
  const roleOrder: Record<string, number> = { verwaltung: 0, mitarbeiter: 1 };
  return (profiles ?? [])
    .filter((p) => p.role !== "admin")
    .sort((a, b) => {
      const ra = roleOrder[a.role] ?? 9;
      const rb = roleOrder[b.role] ?? 9;
      if (ra !== rb) return ra - rb;
      return profileLabel(a).localeCompare(profileLabel(b), "de");
    });
}
