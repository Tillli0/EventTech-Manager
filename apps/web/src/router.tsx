import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth, RequireArea, RequireManager, RedirectIfAuthed } from "@/auth/guards";
import { LoadingState } from "@/components/ui/States";
import { RouteErrorPage } from "@/components/layout/RouteErrorPage";

// Seiten werden per Code-Splitting erst beim Aufruf geladen (kein 3,4-MB-Single-Bundle).
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const InventoryPage = lazy(() => import("@/pages/InventoryPage").then((m) => ({ default: m.InventoryPage })));
const DeviceDetailPage = lazy(() => import("@/pages/DeviceDetailPage").then((m) => ({ default: m.DeviceDetailPage })));
const JobsPage = lazy(() => import("@/pages/JobsPage").then((m) => ({ default: m.JobsPage })));
const JobDetailPage = lazy(() => import("@/pages/JobDetailPage").then((m) => ({ default: m.JobDetailPage })));
const JobPacklistPage = lazy(() => import("@/pages/JobPacklistPage").then((m) => ({ default: m.JobPacklistPage })));
const CustomersPage = lazy(() => import("@/pages/CustomersPage").then((m) => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import("@/pages/CustomerDetailPage").then((m) => ({ default: m.CustomerDetailPage })));
const OffersPage = lazy(() => import("@/pages/OffersPage").then((m) => ({ default: m.OffersPage })));
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const ScanPage = lazy(() => import("@/pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const TasksPage = lazy(() => import("@/pages/TasksPage").then((m) => ({ default: m.TasksPage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));

/** Suspense-Hülle für Routen außerhalb des AppShell (z.B. Login). */
function lazyRoute(node: ReactNode): ReactNode {
  return <Suspense fallback={<LoadingState label="Wird geladen …" />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <RedirectIfAuthed>{lazyRoute(<LoginPage />)}</RedirectIfAuthed>,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/",
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // AppShell umschließt den <Outlet/> bereits mit einer Suspense-Grenze.
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "inventar", element: <RequireArea area="inventar"><InventoryPage /></RequireArea> },
          { path: "inventar/:id", element: <RequireArea area="inventar"><DeviceDetailPage /></RequireArea> },
          { path: "jobs", element: <RequireArea area="jobs"><JobsPage /></RequireArea> },
          { path: "jobs/:id", element: <JobDetailPage /> },
          { path: "jobs/:id/packliste", element: <JobPacklistPage /> },
          { path: "kunden", element: <RequireArea area="kunden"><CustomersPage /></RequireArea> },
          { path: "kunden/:id", element: <RequireArea area="kunden"><CustomerDetailPage /></RequireArea> },
          { path: "angebote", element: <RequireArea area="angebote"><OffersPage /></RequireArea> },
          { path: "rechnungen", element: <RequireArea area="angebote"><InvoicesPage /></RequireArea> },
          { path: "kalender", element: <RequireArea area="kalender"><CalendarPage /></RequireArea> },
          { path: "scan", element: <RequireArea area="inventar"><ScanPage /></RequireArea> },
          { path: "aufgaben", element: <TasksPage /> },
          { path: "admin", element: <RequireManager><AdminPage /></RequireManager> },
        ],
      },
    ],
  },
]);
