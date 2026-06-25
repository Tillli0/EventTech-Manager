import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, MapPin } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Input";
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from "@/hooks/useLocations";
import type { Location } from "@/types/database";

const PRESET_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#84cc16",
];

export function ManageLocationsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: locations } = useLocations();
  const createLocation = useCreateLocation();
  const deleteLocation = useDeleteLocation();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    await createLocation.mutateAsync({ name: name.trim(), color });
    setName("");
  }

  async function handleDelete(id: string, locName: string) {
    if (!confirm(`Lagerort „${locName}" wirklich löschen? Geräte behalten ihren Eintrag, verlieren aber die Zuordnung.`)) return;
    await deleteLocation.mutateAsync(id);
  }

  const items = locations ?? [];

  return (
    <Dialog open={open} onClose={onClose} title="Lagerorte verwalten">
      <div className="space-y-5">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-ink">Neuer Lagerort</p>
          <FormField label="Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Lager A, Regal 3, Transporter …"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </FormField>
          <div>
            <p className="mb-2 text-xs text-ink-muted">Farbe</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "white" : "transparent",
                    boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!name.trim() || createLocation.isPending} className="w-full">
            <Plus size={15} />
            Lagerort anlegen
          </Button>
        </div>

        {items.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Bestehende Lagerorte</p>
            <div className="space-y-1.5">
              {items.map((loc) =>
                editingId === loc.id ? (
                  <EditLocationRow key={loc.id} location={loc} onDone={() => setEditingId(null)} />
                ) : (
                  <div key={loc.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: loc.color ?? "#6366f1" }} />
                    <span className="flex-1 text-sm text-ink">{loc.name}</span>
                    <button onClick={() => setEditingId(loc.id)} className="text-ink-faint transition-colors hover:text-accent" title="Bearbeiten">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(loc.id, loc.name)} className="text-ink-faint transition-colors hover:text-status-defekt" title="Löschen">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        ) : (
          <p className="flex flex-col items-center gap-2 py-4 text-center text-sm text-ink-faint">
            <MapPin size={20} />
            Noch keine Lagerorte angelegt.
          </p>
        )}

        <div className="flex justify-end border-t border-border pt-3">
          <Button variant="secondary" onClick={onClose}>Schließen</Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditLocationRow({ location, onDone }: { location: Location; onDone: () => void }) {
  const updateLocation = useUpdateLocation();
  const [name, setName] = useState(location.name);
  const [color, setColor] = useState(location.color ?? PRESET_COLORS[0]);

  async function handleSave() {
    if (!name.trim()) return;
    await updateLocation.mutateAsync({ id: location.id, name: name.trim(), color });
    onDone();
  }

  return (
    <div className="space-y-2.5 rounded-md border border-accent bg-accent-soft px-3 py-2.5">
      <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} autoFocus />
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: color === c ? "white" : "transparent",
              boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X size={13} />
          Abbrechen
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || updateLocation.isPending}>
          <Check size={13} />
          Speichern
        </Button>
      </div>
    </div>
  );
}
