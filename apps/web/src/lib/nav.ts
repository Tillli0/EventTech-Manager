import { Package, Briefcase, Users, Calendar, ScanLine, CheckSquare } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Package;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/inventar", label: "Inventar", icon: Package },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/kunden", label: "Kunden", icon: Users },
  { to: "/kalender", label: "Kalender", icon: Calendar },
  { to: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
];

export const SCAN_NAV_ITEM: NavItem = { to: "/scan", label: "Scannen", icon: ScanLine };
