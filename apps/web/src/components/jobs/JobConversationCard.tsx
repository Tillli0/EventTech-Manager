import { useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useJobNotesForJob, useCreateJobNote, useDeleteJobNote } from "@/hooks/useJobNotes";
import { profileLabel } from "@/hooks/useProfiles";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import type { JobNote } from "@/types/database";

/** Gesprächsverlauf am Job (P6) — mehrere datierte Einträge mit Verfasser, nie überschrieben, nur gelöscht. */
export function JobConversationCard({ jobId, mayEdit }: { jobId: string; mayEdit: boolean }) {
  const { hasArea } = useAuth();
  const mayView = hasArea("jobs");
  const { data: notes } = useJobNotesForJob(jobId);
  const createNote = useCreateJobNote();
  const deleteNote = useDeleteJobNote();
  const confirm = useConfirm();
  const [draft, setDraft] = useState("");

  if (!mayView) return null;

  async function handleAdd() {
    if (!draft.trim()) return;
    await createNote.mutateAsync({ jobId, body: draft.trim() });
    setDraft("");
  }

  async function handleDelete(note: JobNote) {
    const ok = await confirm({
      title: "Eintrag löschen",
      message: "Diesen Eintrag im Gesprächsverlauf wirklich löschen?",
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    await deleteNote.mutateAsync({ id: note.id, jobId });
  }

  const entries = notes ?? [];

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <MessageSquare size={14} />
          Gesprächsverlauf
        </h2>
      </CardHeader>
      <CardBody className="space-y-3">
        {mayEdit && (
          <div className="flex items-start gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="z.B. Kunde ruft an: Bühne soll doch nach links …"
              rows={2}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAdd} disabled={!draft.trim() || createNote.isPending}>
              Hinzufügen
            </Button>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <MessageSquare size={14} />
            Noch keine Einträge.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((note) => (
              <div key={note.id} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-ink">{note.body}</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {note.author ? profileLabel(note.author) : "—"} · {formatDateTime(note.created_at)}
                  </p>
                </div>
                {mayEdit && (
                  <button
                    onClick={() => handleDelete(note)}
                    className="shrink-0 rounded p-1.5 text-ink-faint transition-colors hover:text-status-defekt"
                    title="Löschen"
                    aria-label="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
