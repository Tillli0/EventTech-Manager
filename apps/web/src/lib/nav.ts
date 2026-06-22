import { LayoutDashboard, Package, Briefcase, Users, Calendar, ScanLine, CheckSquare, FileText } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Package;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Überblick", icon: LayoutDashboard },
  { to: "/inventar", label: "Inventar", icon: Package },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/kunden", label: "Kunden", icon: Users },
  { to: "/angebote", label: "Angebote", icon: FileText },
  { to: "/kalender", label: "Kalender", icon: Calendar },
  { to: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
];

export const SCAN_NAV_ITEM: NavItem = { to: "/scan", label: "Scannen", icon: ScanLine };

/**
 * Eigene, kuratierte Auswahl für die mobile BottomNav (max. 4 Items + Scan-Button
 * in der Mitte = 5, sonst wird es auf kleinen Screens zu eng). "Aufgaben" ist hier
 * bewusst ausgelassen und bleibt über die Desktop-Sidebar bzw. Links im Dashboard
 * erreichbar.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Überblick", icon: LayoutDashboard },
  { to: "/inventar", label: "Inventar", icon: Package },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/kalender", label: "Kalender", icon: Calendar },
];
