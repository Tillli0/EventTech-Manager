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
import { ChevronLeft, ChevronRight, Plus, Download, AlertTriangle, CalendarPlus, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useCalendarEntries, useJobMilestonesInRange, detectCollisions } from "@/hooks/useCalendar";
import { usePersonalBlocks, usePersonalRecurringBlocks } from "@/hooks/usePersonalBlocks";
import { resolvePersonalBlocks, isVisibleBlockCategory } from "@/lib/personalSchedule";
import { MonthGrid, formatMonthLabel } from "@/components/calendar/MonthGrid";
import { WeekView, formatWeekLabel } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { AgendaView } from "@/components/calendar/AgendaView";
import { MiniMonth } from "@/components/calendar/MiniMonth";
import { CalendarEntryDialog } from "@/components/calendar/CalendarEntryDialog";
import { CalendarSubscribeDialog } from "@/components/calendar/CalendarSubscribeDialog";
import { exportToIcs } from "@/lib/ics";
import type { CalendarEntry } from "@/types/database";

type ViewMode = "month" | "week" | "day" | "agenda";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "month", label: "Monat" },
  { value: "week", label: "Woche" },
  { value: "day", label: "Tag" },
  { value: "agenda", label: "Agenda" },
];

export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [dialogState, setDialogState] = useState<{ entry?: CalendarEntry | null; prefillDate?: Date | null } | null>(
    null,
  );
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [showPersonal, setShowPersonal] = useState(true);

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
    if (view === "agenda") {
      // Agenda zeigt die kommenden ~60 Tage ab dem gewählten Tag.
      return {
        rangeStart: startOfDay(currentDate).toISOString(),
        rangeEnd: endOfDay(addDays(currentDate, 60)).toISOString(),
      };
    }
    return {
      rangeStart: startOfDay(currentDate).toISOString(),
      rangeEnd: endOfDay(currentDate).toISOString(),
    };
  }, [view, currentDate]);

  const { data: entries, isLoading, error } = useCalendarEntries(rangeStart, rangeEnd);
  const { data: milestones, error: milestonesError } = useJobMilestonesInRange(rangeStart, rangeEnd);
  const { data: personalBlocks } = usePersonalBlocks();
  const { data: personalRecurring } = usePersonalRecurringBlocks();

  const collidingIds = useMemo(() => (entries ? detectCollisions(entries) : new Set<string>()), [entries]);

  // Persönliche Ebene (PLAN-UI-NEUSCHNITT.md U4): Köln-Schichten sind sichtbarer Inhalt,
  // alles andere (Schule, Klausur, Ferien, Urlaub, Krank) wirkt nur gedämpft als Blocker —
  // nie als eigene Karte. RLS liefert ohnehin ausschließlich die eigenen Blöcke.
  const resolvedPersonal = useMemo(() => {
    if (!showPersonal) return [];
    return resolvePersonalBlocks(personalBlocks ?? [], personalRecurring ?? [], new Date(rangeStart), new Date(rangeEnd));
  }, [showPersonal, personalBlocks, personalRecurring, rangeStart, rangeEnd]);
  const personalVisible = useMemo(() => resolvedPersonal.filter((b) => isVisibleBlockCategory(b.category)), [resolvedPersonal]);
  const personalBlockers = useMemo(() => resolvedPersonal.filter((b) => !isVisibleBlockCategory(b.category)), [resolvedPersonal]);

  function goToPrevious() {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else if (view === "agenda") setCurrentDate((d) => subDays(d, 30));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function goToNext() {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else if (view === "agenda") setCurrentDate((d) => addDays(d, 30));
    else setCurrentDate((d) => addDays(d, 1));
  }

  const periodLabel =
    view === "month"
      ? formatMonthLabel(currentDate)
      : view === "week"
        ? formatWeekLabel(currentDate)
        : view === "agenda"
          ? `Ab ${format(currentDate, "d. MMMM yyyy", { locale: de })}`
          : format(currentDate, "EEEE, d. MMMM yyyy", { locale: de });

  return (
    <div>
      <PageHeader
        title="Kalender"
        actions={
          <>
            <Button variant="secondary" onClick={() => setSubscribeOpen(true)}>
              <CalendarPlus size={16} />
              Abonnieren
            </Button>
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

        <div className="flex items-center gap-2">
          <Button
            variant={showPersonal ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowPersonal((v) => !v)}
            title="Köln-Schichten anzeigen, Schule/Klausur/Ferien/Urlaub/Krank als Blocker"
          >
            <User size={14} />
            Meine Zeiten
          </Button>
          <Tabs options={VIEW_OPTIONS} value={view} onChange={setView} size="sm" />
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

      {!isLoading && entries && (
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-4">
          {/* Mini-Monat zum schnellen Springen (nur auf großen Bildschirmen) */}
          <div className="mb-4 hidden lg:mb-0 lg:block">
            <MiniMonth selectedDate={currentDate} onPick={(day) => setCurrentDate(day)} />
          </div>

          <div className="min-w-0">
            {view === "month" && (
              <MonthGrid
                currentMonth={currentDate}
                entries={entries}
                milestones={milestones ?? []}
                collidingIds={collidingIds}
                personalVisible={personalVisible}
                personalBlockers={personalBlockers}
                onDayClick={(day) => setDialogState({ prefillDate: day })}
                onEntryClick={(entry) => setDialogState({ entry })}
                onMilestoneClick={(milestone) => navigate(`/jobs/${milestone.job_id}`)}
              />
            )}

            {view === "week" && (
              <WeekView
                currentDate={currentDate}
                entries={entries}
                milestones={milestones ?? []}
                collidingIds={collidingIds}
                personalVisible={personalVisible}
                personalBlockers={personalBlockers}
                onSlotClick={(slot) => setDialogState({ prefillDate: slot })}
                onEntryClick={(entry) => setDialogState({ entry })}
                onMilestoneClick={(milestone) => navigate(`/jobs/${milestone.job_id}`)}
              />
            )}

            {view === "day" && (
              <DayView
                currentDate={currentDate}
                entries={entries}
                milestones={milestones ?? []}
                collidingIds={collidingIds}
                personalVisible={personalVisible}
                personalBlockers={personalBlockers}
                onSlotClick={(slot) => setDialogState({ prefillDate: slot })}
                onEntryClick={(entry) => setDialogState({ entry })}
                onMilestoneClick={(milestone) => navigate(`/jobs/${milestone.job_id}`)}
              />
            )}

            {view === "agenda" && (
              <AgendaView
                fromDate={currentDate}
                entries={entries}
                milestones={milestones ?? []}
                personalItems={resolvedPersonal}
                onEntryClick={(entry) => setDialogState({ entry })}
                onMilestoneClick={(milestone) => navigate(`/jobs/${milestone.job_id}`)}
              />
            )}
          </div>
        </div>
      )}

      <CalendarEntryDialog
        open={!!dialogState}
        onClose={() => setDialogState(null)}
        existingEntry={dialogState?.entry}
        prefillDate={dialogState?.prefillDate}
      />

      <CalendarSubscribeDialog open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </div>
  );
}
