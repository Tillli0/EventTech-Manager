import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AppArea, Profile, UserAreaAccess } from "@/types/database";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  areaAccess: UserAreaAccess[];
  isAdmin: boolean;
  /** Admin ODER Verwaltung — darf Rechte/Zuweisungen/Sichtmodi verwalten und sieht alle Bereiche. */
  isManager: boolean;
  /** Darf der Nutzer den Bereich sehen? */
  hasArea: (area: AppArea) => boolean;
  /** Darf der Nutzer im Bereich bearbeiten? */
  canEdit: (area: AppArea) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Rechte/Profil neu laden (z.B. nachdem der Admin etwas geändert hat). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [areaAccess, setAreaAccess] = useState<UserAreaAccess[]>([]);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setAreaAccess([]);
      return;
    }
    const [{ data: profileData }, { data: accessData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_area_access").select("*").eq("user_id", userId),
    ]);
    setProfile((profileData as Profile) ?? null);
    setAreaAccess((accessData as UserAreaAccess[]) ?? []);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "admin" || profile?.role === "verwaltung";

  const hasArea = useCallback(
    (area: AppArea) => isManager || areaAccess.some((a) => a.area === area),
    [isManager, areaAccess],
  );

  const canEdit = useCallback(
    (area: AppArea) => isManager || areaAccess.some((a) => a.area === area && a.can_edit),
    [isManager, areaAccess],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAreaAccess([]);
  }, []);

  const refresh = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        profile,
        areaAccess,
        isAdmin,
        isManager,
        hasArea,
        canEdit,
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von <AuthProvider> verwendet werden.");
  return ctx;
}
