import { Package, Briefcase, Users, Calendar, ScanLine, CheckSquare, FileText, Receipt, Shield, BarChart3, Files } from "lucide-react";
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
  { to: "/inventar", label: "Inventar", icon: Package, area: "inventar" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, area: "jobs" },
  { to: "/kunden", label: "Anfragen / Kunden", icon: Users, area: "kunden" },
  { to: "/angebote", label: "Angebote", icon: FileText, area: "angebote" },
  { to: "/rechnungen", label: "Rechnungen", icon: Receipt, area: "angebote" },
  { to: "/auswertungen", label: "Auswertungen", icon: BarChart3, area: "angebote" },
  { to: "/dokumente", label: "Dokumente", icon: Files },
  { to: "/kalender", label: "Kalender", icon: Calendar, area: "kalender" },
  { to: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
  { to: "/admin", label: "Verwaltung", icon: Shield, managerOnly: true },
];

export const SCAN_NAV_ITEM: NavItem = { to: "/scan", label: "Scannen", icon: ScanLine, area: "inventar" };

/**
 * Kuratierte Auswahl für die mobile BottomNav. Scannen ist hier bewusst NICHT
 * mehr enthalten (erreichbar über den „Scannen"-Knopf auf der Inventar-Seite);
 * dafür ist „Aufgaben" jetzt fester Bestandteil der unteren Leiste. „Überblick"
 * ist hier raus — die Startseite erreicht man über das Logo im Top-Header.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: "/inventar", label: "Inventar", icon: Package, area: "inventar" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, area: "jobs" },
  { to: "/kalender", label: "Kalender", icon: Calendar, area: "kalender" },
  { to: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
];
