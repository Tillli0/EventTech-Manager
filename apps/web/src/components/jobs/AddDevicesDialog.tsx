import { useMemo, useState } from "react";
import { Search, AlertTriangle, Check } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useDevices } from "@/hooks/useDevices";
import { useAddPacklistItems, useDevicesAvailabilityMap } from "@/hooks/useJobs";
import { DEVICE_STATUS_OPTIONS } from "@/types/database";
import type { Device, DeviceStatus } from "@/types/database";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export function AddDevicesDialog({
  open,
  onClose,
  jobId,
  jobStartDate,
  jobEndDate,
  excludeDeviceIds,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobStartDate: string;
  jobEndDate: string;
  /** Geräte, die schon auf der Packliste stehen — werden ausgeblendet. */
  excludeDeviceIds: string[];
}) {
  const { data: devices, isLoading, error } = useDevices();
  const { data: conflictMap } = useDevicesAvailabilityMap(jobStartDate, jobEndDate, jobId);
  const addItems = useAddPacklistItems();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const excludeSet = useMemo(() => new Set(excludeDeviceIds), [excludeDeviceIds]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    devices?.forEach((d) => {
      if (d.category) map.set(d.category.id, d.category.name);
    });
    return Array.from(map.entries());
  }, [devices]);

  const filtered = useMemo(() => {
    if (!devices) return [];
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (excludeSet.has(d.id)) return false;
      if (categoryFilter && d.category_id !== categoryFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [d.name, d.manufacturer, d.model, ...(d.barcodes?.map((b) => b.code) ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [devices, search, categoryFilter, statusFilter, excludeSet]);

  function toggle(deviceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    await addItems.mutateAsync({ jobId, deviceIds: Array.from(selected) });
    setSelected(new Set());
    setSearch("");
    onClose();
  }

  function handleClose() {
    setSelected(new Set());
    setSearch("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Geräte zur Packliste hinzufügen" maxWidth="max-w-2xl">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, Hersteller, Modell oder Barcode …"
              className="pl-9"
              autoFocus
            />
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="sm:w-44">
            <option value="">Alle Kategorien</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | "")}
            className="sm:w-40"
          >
            <option value="">Alle Status</option>
            {DEVICE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {isLoading && <LoadingState label="Geräte werden geladen …" />}
        {error && <ErrorState message={error.message} />}

        {!isLoading && filtered.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
            Keine Geräte gefunden.
          </p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
            {filtered.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                isSelected={selected.has(device.id)}
                onToggle={() => toggle(device.id)}
                conflicts={conflictMap?.get(device.id)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-sm text-ink-muted">
            {selected.size === 0 ? "Keine Geräte ausgewählt" : `${selected.size} Gerät(e) ausgewählt`}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button onClick={handleAdd} disabled={selected.size === 0 || addItems.isPending}>
              {addItems.isPending ? "Wird hinzugefügt …" : "Hinzufügen"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function DeviceRow({
  device,
  isSelected,
  onToggle,
  conflicts,
}: {
  device: Device;
  isSelected: boolean;
  onToggle: () => void;
  conflicts: { id: string; title: string; start_date: string; end_date: string }[] | undefined;
}) {
  const hasConflict = !!conflicts && conflicts.length > 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
        isSelected ? "border-accent bg-accent-soft" : "border-border bg-bg-raised hover:border-accent/40",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          isSelected ? "border-accent bg-accent" : "border-border",
        )}
      >
        {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-ink">{device.name}</p>
          <span className="shrink-0 text-xs text-ink-faint">{device.category?.name}</span>
        </div>
        <p className="truncate text-xs text-ink-muted">
          {[device.manufacturer, device.model].filter(Boolean).join(" · ") || "—"}
          {device.barcodes?.[0]?.code && (
            <span className="ml-2 font-mono text-ink-faint">{device.barcodes[0].code}</span>
          )}
        </p>
        {hasConflict && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-status-wartung">
            <AlertTriangle size={12} />
            Bereits verplant für „{conflicts[0].title}" ({formatDate(conflicts[0].start_date)} –{" "}
            {formatDate(conflicts[0].end_date)})
            {conflicts.length > 1 && ` · +${conflicts.length - 1} weitere`}
          </p>
        )}
      </div>
    </button>
  );
}
