import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { InventoryPage } from "@/pages/InventoryPage";
import { DeviceDetailPage } from "@/pages/DeviceDetailPage";
import { JobsPage } from "@/pages/JobsPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { ScanPage } from "@/pages/ScanPage";
import { TasksPage } from "@/pages/TasksPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/inventar" replace /> },
      { path: "inventar", element: <InventoryPage /> },
      { path: "inventar/:id", element: <DeviceDetailPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "jobs/:id", element: <JobDetailPage /> },
      { path: "kunden", element: <CustomersPage /> },
      { path: "kunden/:id", element: <CustomerDetailPage /> },
      { path: "kalender", element: <CalendarPage /> },
      { path: "scan", element: <ScanPage /> },
      { path: "aufgaben", element: <TasksPage /> },
    ],
  },
]);
