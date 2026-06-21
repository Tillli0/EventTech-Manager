import { NavLink } from "react-router-dom";
import { BOTTOM_NAV_ITEMS, SCAN_NAV_ITEM } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const items = [...BOTTOM_NAV_ITEMS.slice(0, 2), SCAN_NAV_ITEM, ...BOTTOM_NAV_ITEMS.slice(2)];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-surface md:hidden">
      <ul className="flex items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isScan = item.to === "/scan";
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    isActive ? "text-accent" : "text-ink-faint",
                  )
                }
              >
                {({ isActive }) =>
                  isScan ? (
                    <div className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg">
                      <item.icon size={20} />
                    </div>
                  ) : (
                    <>
                      <item.icon size={20} strokeWidth={isActive ? 2.25 : 2} />
                      {item.label}
                    </>
                  )
                }
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
