import { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Search, Boxes, Image as ImageIcon, Upload } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Textarea, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { JobColorPicker } from "@/components/jobs/JobColorPicker";
import { useDevices } from "@/hooks/useDevices";
import {
  useDeviceSets,
  useCreateDeviceSet,
  useUpdateDeviceSet,
  useDeleteDeviceSet,
  useUploadSetImage,
  setImageUrl,
} from "@/hooks/useDeviceSets";
import { DEFAULT_SET_COLOR, type DeviceSet } from "@/types/database";

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
    <Dialog open={open} onClose={handleClose} title="Sets verwalten" maxWidth="max-w-2xl">
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

        {(!sets || sets.length === 0) && <EmptyState icon={Boxes} title="Noch keine Sets angelegt" />}

        {sets && sets.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sets.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                onClick={() => {
                  setEditingSet(set);
                  setMode("edit");
                }}
                onEdit={() => {
                  setEditingSet(set);
                  setMode("edit");
                }}
                onDelete={() => handleDelete(set)}
              />
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

/** Eine Set-Karte: Bild (oder farbige Fläche), farbiger Rand, Name + Geräteanzahl. */
export function SetCard({
  set,
  onClick,
  onEdit,
  onDelete,
  selected = false,
}: {
  set: DeviceSet;
  /** Klick auf die Karte selbst (z.B. Auswählen oder Bearbeiten öffnen). */
  onClick?: () => void;
  /** Overlay-Aktion „Bearbeiten" (oben rechts). */
  onEdit?: () => void;
  /** Overlay-Aktion „Löschen" (oben rechts). */
  onDelete?: () => void;
  selected?: boolean;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-lg border-2 bg-bg-raised transition-shadow hover:shadow-md"
      style={{ borderColor: set.color, boxShadow: selected ? `0 0 0 2px ${set.color}` : undefined }}
    >
      <button type="button" onClick={onClick} className="block w-full text-left">
        {set.image_path ? (
          <img src={setImageUrl(set.image_path)} alt="" className="h-24 w-full object-cover" />
        ) : (
          <div className="flex h-24 w-full items-center justify-center" style={{ backgroundColor: `${set.color}22` }}>
            <Boxes size={28} style={{ color: set.color }} />
          </div>
        )}
        <div className="p-2.5">
          <p className="truncate text-sm font-medium text-ink">{set.name}</p>
          <p className="text-xs text-ink-muted">{set.items?.length ?? 0} Geräte</p>
        </div>
      </button>

      {(onEdit || onDelete) && (
        <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-surface/90 text-ink-muted shadow-sm hover:text-accent"
              title="Bearbeiten"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-surface/90 text-ink-muted shadow-sm hover:text-status-defekt"
              title="Löschen"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
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
  const uploadImage = useUploadSetImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(existingSet?.name ?? "");
  const [description, setDescription] = useState(existingSet?.description ?? "");
  const [color, setColor] = useState(existingSet?.color ?? DEFAULT_SET_COLOR);
  const [imagePath, setImagePath] = useState<string | null>(existingSet?.image_path ?? null);
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

  async function handleFile(file: File) {
    try {
      const path = await uploadImage.mutateAsync(file);
      setImagePath(path);
    } catch (e) {
      alert(`Bild konnte nicht hochgeladen werden: ${e instanceof Error ? e.message : "Fehler"}`);
    }
  }

  const isPending = createSet.isPending || updateSet.isPending;

  async function handleSave() {
    if (!name.trim() || items.size === 0) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      image_path: imagePath,
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Farbe</Label>
          <JobColorPicker value={color} onChange={setColor} />
        </div>
        <div>
          <Label>Bild</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="flex items-center gap-2">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border-2"
              style={{ borderColor: color, backgroundColor: `${color}22` }}
            >
              {imagePath ? (
                <img src={setImageUrl(imagePath)} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={18} style={{ color }} />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploadImage.isPending}>
                <Upload size={13} />
                {uploadImage.isPending ? "Lädt …" : imagePath ? "Ändern" : "Bild wählen"}
              </Button>
              {imagePath && (
                <button type="button" onClick={() => setImagePath(null)} className="text-left text-xs text-ink-faint hover:text-status-defekt">
                  Entfernen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
