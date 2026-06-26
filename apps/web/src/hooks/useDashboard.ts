import { useMemo } from "react";
import { useJobs } from "@/hooks/useJobs";
import { useDevices } from "@/hooks/useDevices";
import { useTasks } from "@/hooks/useTasks";
import type { Job, Task } from "@/types/database";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardData {
  isLoading: boolean;
  error: Error | null;
  /** Jobs, die heute beginnen, laufen oder enden (Status nicht storniert/abgeschlossen). */
  todayJobs: Job[];
  /** Der nächste aktive Job (läuft gerade oder steht als nächstes an) — null, wenn keiner. */
  nextJob: Job | null;
  /** Anstehende Jobs in den nächsten 14 Tagen (nicht heute, nicht storniert/abgeschlossen). */
  upcomingJobs: Job[];
  deviceStatusCounts: Record<string, number>;
  totalDevices: number;
  /** Offene Aufgaben mit Fälligkeitsdatum heute oder in der Vergangenheit. */
  overdueTasks: Task[];
  /** Offene Aufgaben ohne Fälligkeitsdatum oder mit Fälligkeit in der Zukunft. */
  otherOpenTasks: Task[];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function useDashboard(): DashboardData {
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useJobs();
  const { data: devices, isLoading: devicesLoading, error: devicesError } = useDevices();
  const {
    data: openTasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks({ status: "offen" });

  const now = useMemo(() => new Date(), []);

  const { todayJobs, upcomingJobs, nextJob } = useMemo(() => {
    if (!jobs) return { todayJobs: [] as Job[], upcomingJobs: [] as Job[], nextJob: null as Job | null };

    const activeJobs = jobs.filter((j) => j.status !== "storniert" && j.status !== "abgeschlossen");
    const horizon = new Date(now.getTime() + 14 * DAY_MS);

    const today: Job[] = [];
    const upcoming: Job[] = [];

    for (const job of activeJobs) {
      const start = new Date(job.start_date);
      const end = new Date(job.end_date);

      const touchesToday = isSameDay(start, now) || isSameDay(end, now) || (start <= now && end >= now);
      if (touchesToday) {
        today.push(job);
        continue;
      }
      if (start > now && start <= horizon) {
        upcoming.push(job);
      }
    }

    // Nächster Job = frühester aktiver Job (nach start_date sortiert geladen),
    // der noch nicht vorbei ist (Ende ≥ jetzt) — ein heute laufender zählt mit.
    const next = activeJobs.find((j) => new Date(j.end_date) >= now) ?? null;

    return { todayJobs: today, upcomingJobs: upcoming, nextJob: next };
  }, [jobs, now]);

  const deviceStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    devices?.forEach((d) => {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    });
    return counts;
  }, [devices]);

  const { overdueTasks, otherOpenTasks } = useMemo(() => {
    if (!openTasks) return { overdueTasks: [] as Task[], otherOpenTasks: [] as Task[] };
    const overdue: Task[] = [];
    const other: Task[] = [];
    for (const task of openTasks) {
      if (task.due_date && new Date(task.due_date) <= now) {
        overdue.push(task);
      } else {
        other.push(task);
      }
    }
    return { overdueTasks: overdue, otherOpenTasks: other };
  }, [openTasks, now]);

  return {
    isLoading: jobsLoading || devicesLoading || tasksLoading,
    error: (jobsError ?? devicesError ?? tasksError) as Error | null,
    todayJobs,
    nextJob,
    upcomingJobs,
    deviceStatusCounts,
    totalDevices: devices?.length ?? 0,
    overdueTasks,
    otherOpenTasks,
  };
}
