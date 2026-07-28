import { useState } from "react";
import { Users, Pencil, Check } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Avatar } from "@/components/ui/Avatar";
import { useSetJobAssignees, useUpdateJobAssignee } from "@/hooks/useJobAssignees";
import { useProfiles, profileLabel, assignableProfiles } from "@/hooks/useProfiles";
import { TeamAvailabilityHint } from "@/components/jobs/TeamAvailabilityHint";
import { formatDate, formatTime } from "@/lib/format";
import { toDate } from "@/lib/datetime";
import { cn } from "@/lib/cn";
import type { Job } from "@/types/database";

/**
 * Crew-Zuweisung eines Jobs — Auswahl (wer ist dabei) + optional Zeiten/Rolle
 * je Person (PLAN-EVENT-PLANUNG.md P4/E1). Zeiten/Rolle sind bewusst optional:
 * bei einem Drei-Mann-Team reicht oft "alle den ganzen Job über".
 */
export function JobAssigneesCard({ job, canEdit }: { job: Job; canEdit: boolean }) {
  const { data: allProfiles } = useProfiles();
  const profiles = assignableProfiles(allProfiles);
  const setAssignees = useSetJobAssignees();
  const assignedIds = (job.assignees ?? []).map((a) => a.user_id);

  function toggle(userId: string) {
    const next = assignedIds.includes(userId)
      ? assignedIds.filter((id) => id !== userId)
      : [...assignedIds, userId];
    setAssignees.mutate({ jobId: job.id, currentUserIds: assignedIds, userIds: next });
  }

  const assignedProfiles = (profiles ?? []).filter((p) => assignedIds.includes(p.id));

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Users size={14} />
          Zugewiesene Nutzer
        </h2>
      </CardHeader>
      <CardBody className="space-y-3">
        {canEdit ? (
          <>
            <div className="flex flex-wrap gap-2">
              {(profiles ?? []).map((p) => {
                const active = assignedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-all",
                      active
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-border text-ink-muted hover:-translate-y-0.5 hover:border-accent/40 hover:text-ink",
                    )}
                  >
                    <Avatar
                      label={profileLabel(p)}
                      size="xs"
                      className={active ? "bg-accent text-accent-on" : "bg-bg-raised text-ink-faint"}
                    />
                    {profileLabel(p)}
                  </button>
                );
              })}
            </div>

            {assignedProfiles.length > 0 && (
              <>
                <TeamAvailabilityHint
                  assignedProfiles={assignedProfiles}
                  start={job.start_date}
                  end={job.end_date}
                />
                <div className="space-y-1.5 border-t border-border pt-3">
                  <p className="text-xs font-medium text-ink-faint">Zeiten &amp; Rolle (optional)</p>
                  {(job.assignees ?? [])
                    .filter((a) => assignedIds.includes(a.user_id))
                    .map((a) => {
                      const profile = assignedProfiles.find((p) => p.id === a.user_id);
                      if (!profile) return null;
                      return <AssigneeTimesRow key={a.user_id} jobId={job.id} assignee={a} profileName={profileLabel(profile)} />;
                    })}
                </div>
              </>
            )}
          </>
        ) : assignedProfiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedProfiles.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-2 rounded-full bg-bg-raised py-1 pl-1 pr-3 text-xs text-ink-muted"
              >
                <Avatar label={profileLabel(p)} size="xs" />
                {profileLabel(p)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">Niemand zugewiesen.</p>
        )}
      </CardBody>
    </Card>
  );
}

function AssigneeTimesRow({
  jobId,
  assignee,
  profileName,
}: {
  jobId: string;
  assignee: { user_id: string; start_at: string | null; end_at: string | null; role: string | null };
  profileName: string;
}) {
  const updateAssignee = useUpdateJobAssignee();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(assignee.role ?? "");
  const [startAt, setStartAt] = useState<Date | null>(toDate(assignee.start_at));
  const [endAt, setEndAt] = useState<Date | null>(toDate(assignee.end_at));

  function save() {
    updateAssignee.mutate({
      jobId,
      userId: assignee.user_id,
      role: role.trim() || null,
      start_at: startAt ? startAt.toISOString() : null,
      end_at: endAt ? endAt.toISOString() : null,
    });
    setEditing(false);
  }

  if (!editing) {
    const hasDetails = assignee.role || assignee.start_at;
    return (
      <button
        type="button"
        onClick={() => {
          setRole(assignee.role ?? "");
          setStartAt(toDate(assignee.start_at));
          setEndAt(toDate(assignee.end_at));
          setEditing(true);
        }}
        className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-xs hover:border-accent/40"
      >
        <Avatar label={profileName} size="xs" />
        <span className="min-w-0 flex-1 truncate text-ink">{profileName}</span>
        {hasDetails ? (
          <span className="shrink-0 text-ink-muted">
            {assignee.role && <span className="mr-2">{assignee.role}</span>}
            {assignee.start_at && (
              <span className="tabular-nums">
                {formatDate(assignee.start_at)} · {formatTime(assignee.start_at)}
                {assignee.end_at && `–${formatTime(assignee.end_at)}`}
              </span>
            )}
          </span>
        ) : (
          <span className="shrink-0 text-ink-faint">Zeiten/Rolle eintragen</span>
        )}
        <Pencil size={12} className="shrink-0 text-ink-faint" />
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-bg-raised px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Avatar label={profileName} size="xs" />
        <span className="text-xs font-medium text-ink">{profileName}</span>
      </div>
      <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Rolle, z.B. Ton, Licht, Fahrer" />
      <div>
        <p className="mb-1 text-xs text-ink-faint">Beginn</p>
        <DateTimeField value={startAt} onChange={setStartAt} />
      </div>
      <div>
        <p className="mb-1 text-xs text-ink-faint">Ende</p>
        <DateTimeField value={endAt} onChange={setEndAt} min={startAt} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-on"
        >
          <Check size={12} />
          Speichern
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
