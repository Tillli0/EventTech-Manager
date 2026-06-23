import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ScanLine, Zap, LogOut, Settings } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/auth/AuthProvider";
import { AccountDialog } from "@/components/account/AccountDialog";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const { profile, user, isAdmin, isManager, hasArea, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const visibleItems = NAV_ITEMS.filter(
    (item) => (!item.managerOnly || isManager) && (!item.area || hasArea(item.area)),
  );
  const displayName = profile?.full_name || user?.email || "Angemeldet";

  return (
    <aside className="hidden w-60 flex-col border-r border-border bg-bg-surface md:flex">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-ink">EventTech</p>
          <p className="text-xs leading-tight text-ink-faint">Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-md py-2.5 pl-4 pr-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-soft text-ink"
                      : "text-ink-muted hover:bg-bg-raised hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-colors",
                        isActive ? "bg-accent" : "bg-transparent group-hover:bg-border",
                      )}
                    />
                    <item.icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        {hasArea("inventar") && (
          <NavLink
            to="/scan"
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-white"
                  : "border border-border bg-bg-raised text-ink hover:border-accent/50",
              )
            }
          >
            <ScanLine size={16} />
            Barcode scannen
          </NavLink>
        )}

        <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
          <button
            onClick={() => setAccountOpen(true)}
            className="min-w-0 flex-1 rounded-md text-left transition-colors hover:opacity-80"
            title="Mein Konto (Name & Passwort)"
          >
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
            <p className="text-xs text-ink-faint">
              {isAdmin ? "Administrator" : profile?.role === "verwaltung" ? "Verwaltung" : "Mitarbeiter"}
            </p>
          </button>
          <button
            onClick={() => setAccountOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-bg-raised hover:text-ink"
            title="Mein Konto"
            aria-label="Mein Konto"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => signOut()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-bg-raised hover:text-ink"
            title="Abmelden"
            aria-label="Abmelden"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
    </aside>
  );
}
