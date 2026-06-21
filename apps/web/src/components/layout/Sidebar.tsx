import { NavLink } from "react-router-dom";
import { ScanLine, Zap } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function Sidebar() {
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
          {NAV_ITEMS.map((item) => (
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

      <div className="border-t border-border p-3">
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
      </div>
    </aside>
  );
}
