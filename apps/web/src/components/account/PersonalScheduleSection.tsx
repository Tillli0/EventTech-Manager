import { useState } from "react";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { usePersonalBlocks, useCreatePersonalBlock, useDeletePersonalBlock } from "@/hooks/usePersonalBlocks";
import { PERSONAL_BLOCK_CATEGORY_LABELS, type PersonalBlockCategory } from "@/lib/personalSchedule";
import { formatDate } from "@/lib/format";

const CATEGORY_OPTIONS = Object.entries(PERSONAL_BLOCK_CATEGORY_LABELS) as [PersonalBlockCategory, string][];

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * „Meine Zeiten" (PLAN-MEIN-PLAN.md E-B): kein eigener Nav-Punkt, sondern hier im
 * Konto-Dialog. Zeigt/verwaltet die eigenen konkreten Blöcke (Köln-Schicht, Klausur,
 * Ferien, Urlaub, Krank, Sonstiges). Wöchentliche Regeln (Stundenplan) folgen als
 * eigener Schritt — hier bewusst nur die konkreten Termine (schneller Kern zuerst).
 */
export function PersonalScheduleSection() {
  const { data: blocks, isLoading } = usePersonalBlocks();
  const create = useCreatePersonalBlock();
  const remove = useDeletePersonalBlock();
  const toast = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [category, setCategory] = useState<PersonalBlockCategory>("koeln_schicht");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);

  const upcoming = (blocks ?? []).filter((b) => new Date(b.end_at) >= new Date(new Date().toDateString()));

  async function handleAdd() {
    if (!start || !end) {
      toast.error("Bitte Zeitraum angeben.");
      return;
    }
    try {
      await create.mutateAsync({
        category,
        title: title.trim() || null,
        start_at: new Date(start + "T00:00:00").toISOString(),
        end_at: new Date(end + "T23:59:59").toISOString(),
      });
      toast.success("Eingetragen.");
      setTitle("");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte nicht gespeichert werden.");
    }
  }

  async function handleDelete(id: string, label: string) {
    const ok = await confirm({ title: "Eintrag löschen", message: `„${label}" wird entfernt.`, confirmLabel: "Löschen", danger: true });
    if (!ok) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Entfernt.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <CalendarClock size={14} />
          Meine Zeiten
        </p>
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus size={14} />
          Eintragen
        </Button>
      </div>
      <p className="text-xs text-ink-faint">
        Nur für dich sichtbar — Köln-Schichten erscheinen im Kalender, alles andere
        (Schule, Klausur, Ferien, Urlaub, Krank) wirkt nur als Blocker, ohne dass jemand
        den Grund sieht.
      </p>

      {open && (
        <div className="space-y-3 rounded-md border border-border bg-bg-raised p-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Art">
              <Select value={category} onChange={(e) => setCategory(e.target.value as PersonalBlockCategory)}>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Titel (optional)">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Aufbau Beuchel" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Von">
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </FormField>
            <FormField label="Bis">
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={() => void handleAdd()} disabled={create.isPending}>
              {create.isPending ? "Speichert …" : "Speichern"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-ink-faint">Lädt …</p>
      ) : upcoming.length === 0 ? (
        <p className="text-xs text-ink-faint">Nichts Anstehendes eingetragen.</p>
      ) : (
        <ul className="space-y-1">
          {upcoming.map((b) => {
            const label = b.title?.trim() || PERSONAL_BLOCK_CATEGORY_LABELS[b.category];
            const range =
              toDateInputValue(b.start_at) === toDateInputValue(b.end_at)
                ? formatDate(b.start_at)
                : `${formatDate(b.start_at)} – ${formatDate(b.end_at)}`;
            return (
              <li key={b.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-bg-raised">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">
                    {PERSONAL_BLOCK_CATEGORY_LABELS[b.category]}
                    {b.title?.trim() ? ` · ${label}` : ""}
                  </p>
                  <p className="text-xs text-ink-faint">{range}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`„${label}" löschen`}
                  title="Löschen"
                  onClick={() => void handleDelete(b.id, label)}
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
