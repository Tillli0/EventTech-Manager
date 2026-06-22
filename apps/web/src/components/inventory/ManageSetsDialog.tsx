import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Search, Boxes } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { useDevices } from "@/hooks/useDevices";
import { useDeviceSets, useCreateDeviceSet, useUpdateDeviceSet, useDeleteDeviceSet } from "@/hooks/useDeviceSets";
import type { DeviceSet } from "@/types/database";

export function ManageSetsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: sets } = useDeviceSets();
  const deleteSet = useDeleteDeviceSet();

  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingSet, setEditingSet] = useState<DeviceSet | null>(null);

  function handleClose() {
    setMode("list");
    setEditingSet(null);
    onClose();
  }

  async function handleDelete(set: DeviceSet) {
    if (!confirm(`Set „${set.name}" wirklich löschen? Geräte selbst bleiben erhalten.`)) return;
    await deleteSet.mutateAsync(set.id);
  }

  if (mode === "create" || mode === "edit") {
    return (
      <Dialog open={open} onClose={handleClose} title={mode === "create" ? "Neues Set anlegen" : `Set bearbeiten — ${editingSet?.name}`} maxWidth="max-w-xl">
        <SetEditor
          existingSet={mode === "edit" ? editingSet : null}
          onDone={() => {
            setMode("list");
            setEditingSet(null);
          }}
          onCancel={() => {
            setMode("list");
            setEditingSet(null);
          }}
        />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Sets verwalten" maxWidth="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Ein Set ist eine feste Zusammenstellung mehrerer Geräte (z.B. „Standard-DJ-Setup“) — nur eine
          Anlage-Abkürzung. Beim Hinzufügen zu einem Job werden die enthaltenen Geräte als normale
          Einzelposten übernommen.
        </p>

        <Button className="w-full" onClick={() => setMode("create")}>
          <Plus size={15} />
          Neues Set anlegen
        </Button>

        {(!sets || sets.length === 0) && (
          <EmptyState icon={Boxes} title="Noch keine Sets angelegt" />
        )}

        {sets && sets.length > 0 && (
          <div className="space-y-1.5">
            {sets.map((set) => (
              <div key={set.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{set.name}</p>
                  <p className="text-xs text-ink-muted">{set.items?.length ?? 0} Geräte</p>
                </div>
                <button
                  onClick={() => {
                    setEditingSet(set);
                    setMode("edit");
                  }}
                  className="text-ink-faint transition-colors hover:text-accent"
                  title="Bearbeiten"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(set)}
                  className="text-ink-faint transition-colors hover:text-status-defekt"
                  title="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end border-t border-border pt-3">
          <Button variant="secondary" onClick={handleClose}>Schließen</Button>
        </div>
      </div>
    </Dialog>
  );
}

function SetEditor({
  existingSet,
  onDone,
  onCancel,
}: {
  existingSet: DeviceSet | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data: devices } = useDevices();
  const createSet = useCreateDeviceSet();
  const updateSet = useUpdateDeviceSet();

  const [name, setName] = useState(existingSet?.name ?? "");
  const [description, setDescription] = useState(existingSet?.description ?? "");
  const [items, setItems] = useState<Map<string, number>>(
    new Map(existingSet?.items?.map((i) => [i.device_id, i.quantity]) ?? []),
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!devices) return [];
    const q = search.trim().toLowerCase();
    if (!q) return devices.slice(0, 8);
    return devices
      .filter((d) => [d.name, d.manufacturer, d.model].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 8);
  }, [devices, search]);

  function toggleDevice(deviceId: string) {
    setItems((prev) => {
      const next = new Map(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.set(deviceId, 1);
      return next;
    });
  }

  function setQuantity(deviceId: string, quantity: number) {
    setItems((prev) => {
      const next = new Map(prev);
      next.set(deviceId, Math.max(1, quantity));
      return next;
    });
  }

  const isPending = createSet.isPending || updateSet.isPending;

  async function handleSave() {
    if (!name.trim() || items.size === 0) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      items: Array.from(items.entries()).map(([deviceId, quantity]) => ({ deviceId, quantity })),
    };
    if (existingSet) {
      await updateSet.mutateAsync({ id: existingSet.id, ...payload });
    } else {
      await createSet.mutateAsync(payload);
    }
    onDone();
  }

  return (
    <div className="space-y-4">
      <FormField label="Name *">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Standard-DJ-Setup" autoFocus />
      </FormField>
      <FormField label="Beschreibung">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </FormField>

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Enthaltene Geräte</p>
        {items.size > 0 && (
          <div className="mb-3 space-y-1.5">
            {Array.from(items.entries()).map(([deviceId, quantity]) => {
              const device = devices?.find((d) => d.id === deviceId);
              return (
                <div key={deviceId} className="flex items-center gap-2 rounded-md border border-accent bg-accent-soft px-3 py-2">
                  <p className="min-w-0 flex-1 truncate text-sm text-ink">{device?.name ?? "…"}</p>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(deviceId, parseInt(e.target.value, 10) || 1)}
                    className="w-20"
                  />
                  <button onClick={() => toggleDevice(deviceId)} className="text-ink-faint hover:text-status-defekt">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Gerät suchen, um hinzuzufügen …"
            className="pl-9"
          />
        </div>
        <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
          {filtered
            .filter((d) => !items.has(d.id))
            .map((device) => (
              <button
                key={device.id}
                type="button"
                onClick={() => toggleDevice(device.id)}
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-1.5 text-left text-sm text-ink hover:border-accent/40"
              >
                <span className="truncate">{device.name}</span>
                <Plus size={13} className="shrink-0 text-ink-faint" />
              </button>
            ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || items.size === 0 || isPending}>
          <Check size={14} />
          {isPending ? "Wird gespeichert …" : "Set speichern"}
        </Button>
      </div>
    </div>
  );
}
