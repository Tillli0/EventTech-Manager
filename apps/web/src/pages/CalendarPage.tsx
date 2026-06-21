import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Download, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useCalendarEntries, useJobMilestonesInRange, detectCollisions } from "@/hooks/useCalendar";
import { MonthGrid, formatMonthLabel } from "@/components/calendar/MonthGrid";
import { WeekView, formatWeekLabel } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { CalendarEntryDialog } from "@/components/calendar/CalendarEntryDialog";
import { exportToIcs } from "@/lib/ics";
import { cn } from "@/lib/cn";
import type { CalendarEntry } from "@/types/database";

type ViewMode = "month" | "week" | "day";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "month", label: "Monat" },
  { value: "week", label: "Woche" },
  { value: "day", label: "Tag" },
];

export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [dialogState, setDialogState] = useState<{ entry?: CalendarEntry | null; prefillDate?: Date | null } | null>(
    null,
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "month") {
      return {
        rangeStart: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }).toISOString(),
        rangeEnd: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }).toISOString(),
      };
    }
    if (view === "week") {
      return {
        rangeStart: startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString(),
        rangeEnd: endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString(),
      };
    }
    return {
      rangeStart: startOfDay(currentDate).toISOString(),
      rangeEnd: endOfDay(currentDate).toISOString(),
    };
  }, [view, currentDate]);

  const { data: entries, isLoading, error } = useCalendarEntries(rangeStart, rangeEnd);
  const { data: milestones, error: milestonesError } = useJobMilestonesInRange(rangeStart, rangeEnd);

  const collidingIds = useMemo(() => (entries ? detectCollisions(entries) : new Set<string>()), [entries]);

  function goToPrevious() {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function goToNext() {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  const periodLabel =
    view === "month"
      ? formatMonthLabel(currentDate)
      : view === "week"
        ? formatWeekLabel(currentDate)
        : format(currentDate, "EEEE, d. MMMM yyyy", { locale: de });

  return (
    <div>
      <PageHeader
        title="Kalender"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => entries && exportToIcs(entries)}
              disabled={!entries || entries.length === 0}
            >
              <Download size={16} />
              iCal-Export
            </Button>
            <Button onClick={() => setDialogState({ prefillDate: new Date() })}>
              <Plus size={16} />
              Termin
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPrevious}>
            <ChevronLeft size={18} />
          </Button>
          <p className="min-w-[180px] text-center text-sm font-medium capitalize text-ink sm:min-w-[220px]">
            {periodLabel}
          </p>
          <Button variant="ghost" size="icon" onClick={goToNext}>
            <ChevronRight size={18} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Heute
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border bg-bg-raised p-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === opt.value ? "bg-accent text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {collidingIds.size > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-status-defekt-bg px-3 py-2 text-sm text-status-defekt">
          <AlertTriangle size={14} />
          {collidingIds.size} Termine überlappen sich in diesem Zeitraum.
        </div>
      )}

      {isLoading && <LoadingState label="Kalender wird geladen …" />}
      {error && <ErrorState message={error.message} />}
      {milestonesError && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-status-defekt-bg px-3 py-2 text-sm text-status-defekt">
          <AlertTriangle size={14} />
          Unterevents konnten nicht geladen werden: {milestonesError.message}
        </div>
      )}

      {!isLoading && entries && view === "month" && (
        <MonthGrid
          currentMonth={currentDate}
          entries={entries}
          milestones={milestones ?? []}
          collidingIds={collidingIds}
          onDayClick={(day) => setDialogState({ prefillDate: day })}
          onEntryClick={(entry) => setDialogState({ entry })}
          onMilestoneClick={(milestone) => navigate(`/jobs/${milestone.job_id}`)}
        />
      )}

      {!isLoading && entries && view === "week" && (
        <WeekView
          currentDate={currentDate}
          entries={entries}
          milestones={milestones ?? []}
          collidingIds={collidingIds}
          onSlotClick={(slot) => setDialogState({ prefillDate: slot })}
          onEntryClick={(entry) => setDialogState({ entry })}
          onMilestoneClick={(milestone) => navigate(`/jobs/${milestone.job_id}`)}
        />
      )}

      {!isLoading && entries && view === "day" && (
        <DayView
          currentDate={currentDate}
          entries={entries}
          milestones={milestones ?? []}
          collidingIds={collidingIds}
          onSlotClick={(slot) => setDialogState({ prefillDate: slot })}
          onEntryClick={(entry) => setDialogState({ entry })}
          onMilestoneClick={(milestone) => navigate(`/jobs/${milestone.job_id}`)}
        />
      )}

      <CalendarEntryDialog
        open={!!dialogState}
        onClose={() => setDialogState(null)}
        existingEntry={dialogState?.entry}
        prefillDate={dialogState?.prefillDate}
      />
    </div>
  );
}
