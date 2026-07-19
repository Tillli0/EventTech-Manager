import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ScanLine, LogOut, Settings } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/auth/AuthProvider";
import { useNewWebsiteLeadCount } from "@/hooks/useWebsiteLeads";
import { AccountDialog } from "@/components/account/AccountDialog";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const { profile, user, isAdmin, isManager, hasArea, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const newLeads = useNewWebsiteLeadCount();
  // Erst je Eintrag filtern, dann leere Gruppen wegwerfen — sonst bliebe bei einem
  // Mitarbeiter ohne kaufmännische Rechte eine Überschrift ohne Inhalt stehen.
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => (!item.managerOnly || isManager) && (!item.area || hasArea(item.area)),
    ),
  })).filter((group) => group.items.length > 0);
  const displayName = profile?.full_name || user?.email || "Angemeldet";

  return (
    <aside className="hidden w-60 flex-col border-r border-border bg-bg-surface md:flex">
      <div className="border-b border-border px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group, i) => (
          <div key={group.title ?? `gruppe-${i}`} className={cn(i > 0 && "mt-5")}>
            {group.title && (
              <p className="px-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
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
                        {item.to === "/kunden" && newLeads > 0 && (
                          <span
                            className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-on"
                            title={`${newLeads} neue Website-Anfrage${newLeads === 1 ? "" : "n"}`}
                          >
                            {newLeads}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        {hasArea("inventar") && (
          <NavLink
            to="/scan"
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-on"
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
