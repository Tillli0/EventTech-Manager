import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import type { AppArea } from "@/types/database";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-bg text-sm text-ink-muted">
      <Loader2 size={18} className="animate-spin" />
      Wird geladen …
    </div>
  );
}

/** Schützt das gesamte App-Layout: ohne Session → Login. */
export function RequireAuth() {
  const { loading, session } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Leitet bereits eingeloggte Nutzer von /login weg auf den Überblick. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-20 text-center">
      <Lock size={32} className="mb-3 text-ink-faint" strokeWidth={1.5} />
      <p className="text-sm font-medium text-ink">Kein Zugriff auf diesen Bereich</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">
        Für diesen Bereich fehlt dir die Freigabe. Wende dich an einen Administrator, wenn du Zugriff brauchst.
      </p>
    </div>
  );
}

/** Gibt den Bereich nur frei, wenn der Nutzer ihn sehen darf. */
export function RequireArea({ area, children }: { area: AppArea; children: ReactNode }) {
  const { hasArea } = useAuth();
  if (!hasArea(area)) return <NoAccess />;
  return <>{children}</>;
}

/** Nur für Admins (z.B. Account-Verwaltung). */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <NoAccess />;
  return <>{children}</>;
}

/** Für Admin oder Verwaltung (Rechte-/Zuweisungs-/Sichtmodus-Verwaltung). */
export function RequireManager({ children }: { children: ReactNode }) {
  const { isManager } = useAuth();
  if (!isManager) return <NoAccess />;
  return <>{children}</>;
}
