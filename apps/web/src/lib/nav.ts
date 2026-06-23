import { LayoutDashboard, Package, Briefcase, Users, Calendar, ScanLine, CheckSquare, FileText, Shield } from "lucide-react";
import type { AppArea } from "@/types/database";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Package;
  /** Bereich, der für die Sichtbarkeit nötig ist. Fehlt er, ist der Eintrag immer sichtbar. */
  area?: AppArea;
  /** Nur für Admin oder Verwaltung sichtbar. */
  managerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Überblick", icon: LayoutDashboard },
  { to: "/inventar", label: "Inventar", icon: Package, area: "inventar" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, area: "jobs" },
  { to: "/kunden", label: "Kunden", icon: Users, area: "kunden" },
  { to: "/angebote", label: "Angebote", icon: FileText, area: "angebote" },
  { to: "/kalender", label: "Kalender", icon: Calendar, area: "kalender" },
  { to: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
  { to: "/admin", label: "Verwaltung", icon: Shield, managerOnly: true },
];

export const SCAN_NAV_ITEM: NavItem = { to: "/scan", label: "Scannen", icon: ScanLine, area: "inventar" };

/**
 * Eigene, kuratierte Auswahl für die mobile BottomNav (max. 4 Items + Scan-Button
 * in der Mitte = 5, sonst wird es auf kleinen Screens zu eng). "Aufgaben" ist hier
 * bewusst ausgelassen und bleibt über die Desktop-Sidebar bzw. Links im Dashboard
 * erreichbar.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Überblick", icon: LayoutDashboard },
  { to: "/inventar", label: "Inventar", icon: Package, area: "inventar" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, area: "jobs" },
  { to: "/kalender", label: "Kalender", icon: Calendar, area: "kalender" },
];
