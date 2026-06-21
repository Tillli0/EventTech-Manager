import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Download, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useCalendarEntries, useJobMilestonesInRange, detectCollisions } from "@/hooks/useCalendar";
import { MonthGrid, formatMonthLabel } from "@/components/calendar/MonthGrid";
import { CalendarEntryDialog } from "@/components/calendar/CalendarEntryDialog";
import { exportToIcs } from "@/lib/ics";
import type { CalendarEntry } from "@/types/database";

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [dialogState, setDialogState] = useState<{ entry?: CalendarEntry | null; prefillDate?: Date | null } | null>(
    null,
  );

  const rangeStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString();
  const rangeEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString();

  const { data: entries, isLoading, error } = useCalendarEntries(rangeStart, rangeEnd);
  const { data: milestones } = useJobMilestonesInRange(rangeStart, rangeEnd);

  const collidingIds = useMemo(() => (entries ? detectCollisions(entries) : new Set<string>()), [entries]);

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

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft size={18} />
          </Button>
          <p className="w-40 text-center text-sm font-medium capitalize text-ink">
            {formatMonthLabel(currentMonth)}
          </p>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight size={18} />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
          Heute
        </Button>
      </div>

      {collidingIds.size > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-status-defekt-bg px-3 py-2 text-sm text-status-defekt">
          <AlertTriangle size={14} />
          {collidingIds.size} Termine überlappen sich in diesem Monat.
        </div>
      )}

      {isLoading && <LoadingState label="Kalender wird geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && entries && (
        <MonthGrid
          currentMonth={currentMonth}
          entries={entries}
          milestones={milestones ?? []}
          collidingIds={collidingIds}
          onDayClick={(day) => setDialogState({ prefillDate: day })}
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
