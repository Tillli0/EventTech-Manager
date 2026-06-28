import { NavLink } from "react-router-dom";
import { BOTTOM_NAV_ITEMS, SCAN_NAV_ITEM } from "@/lib/nav";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const { hasArea } = useAuth();
  const items = BOTTOM_NAV_ITEMS.filter((item) => !item.area || hasArea(item.area));
  const showScan = !SCAN_NAV_ITEM.area || hasArea(SCAN_NAV_ITEM.area);

  // Scan-Knopf mittig: Einträge in zwei Hälften teilen, Scan dazwischen.
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-surface md:hidden">
      <ul className="flex items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {left.map((item) => (
          <BottomNavLink key={item.to} to={item.to} label={item.label} Icon={item.icon} />
        ))}

        {showScan && (
          <li className="flex flex-1 justify-center">
            <NavLink to={SCAN_NAV_ITEM.to} className="flex flex-col items-center gap-1 py-1.5">
              {({ isActive }) => (
                <>
                  {/* Hervorgehobener, leicht angehobener Scan-Knopf (FAB-Stil) */}
                  <span
                    className={cn(
                      "-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-bg-surface transition-colors",
                      isActive ? "bg-accent-hover" : "bg-accent",
                    )}
                  >
                    <SCAN_NAV_ITEM.icon size={24} strokeWidth={2.25} />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      isActive ? "text-accent" : "text-ink-faint",
                    )}
                  >
                    {SCAN_NAV_ITEM.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        )}

        {right.map((item) => (
          <BottomNavLink key={item.to} to={item.to} label={item.label} Icon={item.icon} />
        ))}
      </ul>
    </nav>
  );
}

function BottomNavLink({ to, label, Icon }: { to: string; label: string; Icon: typeof SCAN_NAV_ITEM.icon }) {
  return (
    <li className="flex-1">
      <NavLink to={to} end={to === "/"} className="flex flex-col items-center gap-1 py-1.5">
        {({ isActive }) => (
          <>
            {/* Aktives Icon in runder Akzent-Pille (Material-You-Stil) */}
            <span
              className={cn(
                "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                isActive ? "bg-accent-soft text-accent" : "text-ink-faint",
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.25 : 2} />
            </span>
            <span
              className={cn(
                "text-[11px] font-medium transition-colors",
                isActive ? "text-accent" : "text-ink-faint",
              )}
            >
              {label}
            </span>
          </>
        )}
      </NavLink>
    </li>
  );
}
