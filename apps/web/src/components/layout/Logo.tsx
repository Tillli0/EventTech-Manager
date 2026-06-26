import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * App-Logo (Zap-Marke + „EventTech / Manager"). Ist als Link auf die
 * Überblick-Startseite („/") gestaltet — ersetzt den früheren „Überblick"-
 * Navigationspunkt. Wird in der Desktop-Sidebar und im mobilen Top-Header genutzt.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("flex items-center gap-2.5 transition-opacity hover:opacity-80", className)}
      aria-label="Zum Überblick"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
        <Zap size={16} className="text-white" strokeWidth={2.5} />
      </span>
      <span>
        <span className="block text-sm font-semibold leading-tight text-ink">EventTech</span>
        <span className="block text-xs leading-tight text-ink-faint">Manager</span>
      </span>
    </Link>
  );
}
