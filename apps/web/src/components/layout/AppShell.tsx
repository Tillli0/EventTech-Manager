import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Logo } from "@/components/layout/Logo";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobiler Top-Header mit Logo (Desktop trägt das Logo in der Sidebar) */}
        <header className="flex items-center border-b border-border bg-bg-surface px-4 py-2.5 md:hidden">
          <Logo />
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
