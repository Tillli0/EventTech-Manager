import { NavLink } from "react-router-dom";
import { BOTTOM_NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const { hasArea } = useAuth();
  const items = BOTTOM_NAV_ITEMS.filter((item) => !item.area || hasArea(item.area));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-surface md:hidden">
      <ul className="flex items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className="flex flex-col items-center gap-1 py-1.5"
            >
              {({ isActive }) => (
                <>
                  {/* Aktives Icon in runder Akzent-Pille (Material-You-Stil) */}
                  <span
                    className={cn(
                      "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-accent-soft text-accent" : "text-ink-faint",
                    )}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.25 : 2} />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      isActive ? "text-accent" : "text-ink-faint",
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
