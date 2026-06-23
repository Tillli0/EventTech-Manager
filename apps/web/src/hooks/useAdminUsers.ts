import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AppArea, JobViewMode, Profile, UserAreaAccess, UserRole } from "@/types/database";

const ADMIN_USERS_KEY = ["admin-users"] as const;

export interface AdminUser extends Profile {
  access: UserAreaAccess[];
}

/** Alle Nutzer inkl. ihrer Bereichszugriffe (nur für Admins sinnvoll/erlaubt). */
export function useAdminUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: async (): Promise<AdminUser[]> => {
      const [{ data: profiles, error: pErr }, { data: access, error: aErr }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("user_area_access").select("*"),
      ]);
      if (pErr) throw pErr;
      if (aErr) throw aErr;
      const accessList = (access as UserAreaAccess[]) ?? [];
      return (profiles as Profile[]).map((p) => ({
        ...p,
        access: accessList.filter((a) => a.user_id === p.id),
      }));
    },
  });
}

interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  areas: { area: AppArea; can_edit: boolean }[];
}

async function invokeAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    // Edge-Function-Fehlertext (JSON { error }) durchreichen, falls vorhanden.
    const message = (data as { error?: string } | null)?.error ?? error.message;
    throw new Error(message);
  }
  if (data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => invokeAdmin({ action: "create", ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => invokeAdmin({ action: "delete", user_id: userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      invokeAdmin({ action: "reset_password", user_id: userId, password }),
  });
}

/** Rolle eines Nutzers ändern (direkt; RLS erlaubt das nur Admins). */
export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}

/**
 * Sichtmodus eines Nutzers setzen (eigene/zugewiesene/alle). RLS lässt das nur
 * Admin/Verwaltung zu. Aktualisiert auch die Jobliste, falls es der eigene Modus ist.
 */
export function useSetJobViewMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, mode }: { userId: string; mode: JobViewMode }) => {
      const { error } = await supabase.from("profiles").update({ job_view_mode: mode }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/**
 * Bereichszugriff eines Nutzers setzen. `state`:
 *  - "none": Zugriff entfernen (Zeile löschen)
 *  - "view": sichtbar, nicht bearbeitbar
 *  - "edit": sichtbar und bearbeitbar
 */
export function useSetAreaAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      area,
      state,
    }: {
      userId: string;
      area: AppArea;
      state: "none" | "view" | "edit";
    }) => {
      if (state === "none") {
        const { error } = await supabase
          .from("user_area_access")
          .delete()
          .eq("user_id", userId)
          .eq("area", area);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("user_area_access")
        .upsert({ user_id: userId, area, can_edit: state === "edit" }, { onConflict: "user_id,area" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}
