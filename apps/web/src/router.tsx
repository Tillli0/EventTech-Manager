import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { DeviceDetailPage } from "@/pages/DeviceDetailPage";
import { JobsPage } from "@/pages/JobsPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { OffersPage } from "@/pages/OffersPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { ScanPage } from "@/pages/ScanPage";
import { TasksPage } from "@/pages/TasksPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "inventar", element: <InventoryPage /> },
      { path: "inventar/:id", element: <DeviceDetailPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "jobs/:id", element: <JobDetailPage /> },
      { path: "kunden", element: <CustomersPage /> },
      { path: "kunden/:id", element: <CustomerDetailPage /> },
      { path: "angebote", element: <OffersPage /> },
      { path: "kalender", element: <CalendarPage /> },
      { path: "scan", element: <ScanPage /> },
      { path: "aufgaben", element: <TasksPage /> },
    ],
  },
]);
