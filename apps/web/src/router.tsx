import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth, RequireArea, RequireManager, RedirectIfAuthed } from "@/auth/guards";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { DeviceDetailPage } from "@/pages/DeviceDetailPage";
import { JobsPage } from "@/pages/JobsPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { JobPacklistPage } from "@/pages/JobPacklistPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { OffersPage } from "@/pages/OffersPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { ScanPage } from "@/pages/ScanPage";
import { TasksPage } from "@/pages/TasksPage";
import { AdminPage } from "@/pages/AdminPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
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
          { path: "kalender", element: <RequireArea area="kalender"><CalendarPage /></RequireArea> },
          { path: "scan", element: <RequireArea area="inventar"><ScanPage /></RequireArea> },
          { path: "aufgaben", element: <TasksPage /> },
          { path: "admin", element: <RequireManager><AdminPage /></RequireManager> },
        ],
      },
    ],
  },
]);
