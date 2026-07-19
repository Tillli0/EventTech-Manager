import {
  Package,
  Briefcase,
  Users,
  Calendar,
  ScanLine,
  CheckSquare,
  FileText,
  Receipt,
  Shield,
  BarChart3,
  Files,
  LayoutDashboard,
} from "lucide-react";
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

export interface NavGroup {
  /** Überschrift der Gruppe; ohne Titel wird sie ohne Kopfzeile gerendert. */
  title?: string;
  items: NavItem[];
}

/**
 * Navigation in Gruppen statt einer flachen Liste (PLAN-UI-NEUSCHNITT.md, K-C).
 *
 * Grund: Zehn gleichwertige Einträge zwingen zum Lesen jeder Zeile. Mit Anmietung
 * (Block B) und weiteren Bereichen würde die Liste weiter wachsen. Die Gruppen
 * folgen Tills Arbeitsalltag: erst die Arbeit, dann das Kaufmännische, dann die
 * Ablage.
 *
 * `Inventar` steht bewusst unter „Ablage": Seit der Neuausrichtung gibt es nur
 * noch ein kleines Rest-Inventar (entspricht E8/F6 der Neuausrichtung).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: "/", label: "Überblick", icon: LayoutDashboard }],
  },
  {
    title: "Arbeit",
    items: [
      { to: "/jobs", label: "Jobs", icon: Briefcase, area: "jobs" },
      { to: "/kalender", label: "Kalender", icon: Calendar, area: "kalender" },
      { to: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
    ],
  },
  {
    title: "Kaufmännisch",
    items: [
      { to: "/kunden", label: "Anfragen / Kunden", icon: Users, area: "kunden" },
      { to: "/angebote", label: "Angebote", icon: FileText, area: "angebote" },
      { to: "/rechnungen", label: "Rechnungen", icon: Receipt, area: "angebote" },
      { to: "/auswertungen", label: "Auswertungen", icon: BarChart3, area: "angebote" },
    ],
  },
  {
    title: "Ablage",
    items: [
      { to: "/dokumente", label: "Dokumente", icon: Files },
      { to: "/inventar", label: "Inventar", icon: Package, area: "inventar" },
    ],
  },
  {
    items: [{ to: "/admin", label: "Verwaltung", icon: Shield, managerOnly: true }],
  },
];

/** Flache Liste aller Einträge — für Stellen, die keine Gruppen brauchen. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const SCAN_NAV_ITEM: NavItem = { to: "/scan", label: "Scannen", icon: ScanLine, area: "inventar" };

/**
 * Kuratierte Auswahl für die mobile Fußleiste. „Überblick" ist hier bewusst dabei:
 * Die Startseite zeigt den nächsten Einsatz und ist damit unterwegs die wichtigste
 * Ansicht. Inventar ist dafür herausgefallen (Rest-Inventar, s. o.).
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Überblick", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase, area: "jobs" },
  { to: "/kalender", label: "Kalender", icon: Calendar, area: "kalender" },
  { to: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
];
