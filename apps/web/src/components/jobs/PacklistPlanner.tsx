import { useMemo, useState } from "react";
import { Search, Plus, Minus, Check, AlertTriangle, Boxes } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/States";
import { SetCard } from "@/components/inventory/ManageSetsDialog";
import { DeviceAvailabilityBadge } from "@/components/ui/DeviceAvailabilityBadge";
import { useDevices, useCategories } from "@/hooks/useDevices";
import { useDeviceSets, useAddDeviceSetToJob } from "@/hooks/useDeviceSets";
import {
  useAddPacklistItems,
  useUpdatePacklistItemQuantity,
  useRemovePacklistItem,
  useDevicesAvailabilityMap,
  useDevicesOutNowMap,
  sumBookedQuantity,
} from "@/hooks/useJobs";
import { type Device, type Job, type PacklistItem } from "@/types/database";
import { cn } from "@/lib/cn";

/**
 * Inline-Picker für die Packlisten-Planung (ersetzt die alten Popups). Oben die
 * Sets als Karten zum Anklicken, darunter ein inventarähnlicher Geräte-Browser
 * mit Such-/Kategorie-/Status-Pillen. Hinzufügen passiert direkt (kein Dialog);
 * nicht verfügbare Geräte werden ausgegraut mit Klartext-Grund gezeigt.
 */
export function PacklistPlanner({ job, items }: { job: Job; items: PacklistItem[] }) {
  const { data: devices, isLoading } = useDevices();
  const { data: categories } = useCategories();
  const { data: sets } = useDeviceSets();
  const { data: conflictMap } = useDevicesAvailabilityMap(job.start_date, job.end_date, job.id);
  const { data: outNowMap } = useDevicesOutNowMap();

  const addItems = useAddPacklistItems();
  const updateQuantity = useUpdatePacklistItemQuantity();
  const removeItem = useRemovePacklistItem();
  const addSetToJob = useAddDeviceSetToJob();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const itemByDevice = useMemo(() => {
    const m = new Map<string, PacklistItem>();
    for (const it of items) m.set(it.device_id, it);
    return m;
  }, [items]);

  /** Maximal für diesen Job verfügbar: Lager − defekt − in anderen aktiven Jobs verplant. */
  function availableFor(device: Device): number {
    const otherBooked = sumBookedQuantity(conflictMap?.get(device.id));
    return Math.max(0, device.stock_quantity - (device.defective_quantity ?? 0) - otherBooked);
  }

  const usedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    devices?.forEach((d) => d.category_id && ids.add(d.category_id));
    return ids;
  }, [devices]);

  const visibleCategories = (categories ?? []).filter((c) => usedCategoryIds.has(c.id));

  const filtered = useMemo(() => {
    if (!devices) return [];
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (categoryFilter && d.category_id !== categoryFilter) return false;
      if (!q) return true;
      const haystack = [d.name, d.manufacturer, d.model, ...(d.barcodes?.map((b) => b.code) ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [devices, search, categoryFilter]);

  // Nach Kategorie gruppieren — wie auf der Inventarseite.
  const groupedDevices = useMemo(() => {
    const byCat = new Map<string, Device[]>();
    for (const d of filtered) {
      const key = d.category_id ?? "__none__";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(d);
    }
    const groups: { id: string; name: string; color: string; devices: Device[] }[] = [];
    for (const c of categories ?? []) {
      const ds = byCat.get(c.id);
      if (ds?.length) groups.push({ id: c.id, name: c.name, color: c.color ?? "#8B92A3", devices: ds });
    }
    const none = byCat.get("__none__");
    if (none?.length) groups.push({ id: "__none__", name: "Ohne Kategorie", color: "#5B6273", devices: none });
    return groups;
  }, [filtered, categories]);

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleAddSet(setId: string) {
    const set = sets?.find((s) => s.id === setId);
    if (!set?.items?.length) return;
    const payload = set.items
      .map((i) => {
        const dev = devices?.find((d) => d.id === i.device_id);
        const avail = dev ? availableFor(dev) : 0;
        return { deviceId: i.device_id, quantity: Math.min(i.quantity, avail) };
      })
      .filter((x) => x.quantity >= 1);
    if (payload.length === 0) {
      flash(`„${set.name}": nichts verfügbar im Zeitraum.`);
      return;
    }
    await addSetToJob.mutateAsync({ jobId: job.id, items: payload });
    flash(`„${set.name}" hinzugefügt (${payload.length} Posten).`);
  }

  async function handleAddDevice(device: Device) {
    if (itemByDevice.has(device.id)) return;
    if (availableFor(device) < 1) return;
    await addItems.mutateAsync({ jobId: job.id, items: [{ deviceId: device.id, quantity: 1 }] });
  }

  function changeQuantity(item: PacklistItem, device: Device, delta: number) {
    const max = availableFor(device);
    const next = item.quantity + delta;
    if (next < 1) {
      removeItem.mutate({ id: item.id, jobId: job.id });
      return;
    }
    if (next > max) return;
    updateQuantity.mutate({ id: item.id, jobId: job.id, quantity: next });
  }

  return (
    <div className="space-y-4">
      {/* Sets oben, nebeneinander */}
      {sets && sets.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <Boxes size={13} /> Sets
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {sets.map((set) => (
              <div key={set.id} className="w-36 shrink-0">
                <SetCard set={set} selected={false} onClick={() => handleAddSet(set.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <p className="flex items-center gap-1.5 text-sm text-status-verfuegbar">
          <Check size={14} />
          {feedback}
        </p>
      )}

      {/* Suche + Filter-Pillen */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Gerät suchen (Name, Hersteller, Barcode) …"
            className="pl-9"
          />
        </div>
        {visibleCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <FilterPill active={categoryFilter === null} onClick={() => setCategoryFilter(null)}>
              Alle
            </FilterPill>
            {visibleCategories.map((c) => (
              <FilterPill
                key={c.id}
                active={categoryFilter === c.id}
                color={c.color ?? undefined}
                onClick={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
              >
                {c.name}
              </FilterPill>
            ))}
          </div>
        )}
      </div>

      {/* Geräteliste — nach Kategorie gruppiert wie im Inventar */}
      {isLoading ? (
        <LoadingState label="Geräte werden geladen …" />
      ) : groupedDevices.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          Keine Geräte gefunden.
        </p>
      ) : (
        <div className="space-y-5">
          {groupedDevices.map((group) => (
            <div key={group.id}>
              <div
                className="mb-2 flex items-center gap-2 rounded-md border-l-4 px-2.5 py-1.5"
                style={{ borderLeftColor: group.color, backgroundColor: `${group.color}14` }}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                <span className="text-sm font-semibold" style={{ color: group.color }}>
                  {group.name}
                </span>
                <span className="text-xs text-ink-faint">{group.devices.length}</span>
              </div>
              <div className="space-y-1.5">
                {group.devices.map((device) => (
                  <PlannerDeviceRow
                    key={device.id}
                    device={device}
                    item={itemByDevice.get(device.id) ?? null}
                    available={availableFor(device)}
                    outNow={outNowMap?.get(device.id) ?? 0}
                    onAdd={() => handleAddDevice(device)}
                    onInc={(it) => changeQuantity(it, device, 1)}
                    onDec={(it) => changeQuantity(it, device, -1)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-transparent text-white" : "border-border text-ink-muted hover:text-ink",
      )}
      style={active ? { backgroundColor: color ?? "#3B82F6" } : undefined}
    >
      {color && !active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}

function PlannerDeviceRow({
  device,
  item,
  available,
  outNow,
  onAdd,
  onInc,
  onDec,
}: {
  device: Device;
  item: PacklistItem | null;
  available: number;
  outNow: number;
  onAdd: () => void;
  onInc: (item: PacklistItem) => void;
  onDec: (item: PacklistItem) => void;
}) {
  const onList = !!item;
  const soldOut = available < 1 && !onList;
  const atMax = !!item && item.quantity >= available;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
        onList ? "border-accent bg-accent-soft" : "border-border bg-bg-raised",
        soldOut && "opacity-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{device.name}</p>
          {device.stock_quantity > 1 && (
            <span className="shrink-0 font-mono text-xs text-ink-faint">{device.stock_quantity} im Bestand</span>
          )}
        </div>
        <p className="truncate text-xs text-ink-muted">
          {[device.manufacturer, device.model].filter(Boolean).join(" · ") || "—"}
          {device.barcodes?.[0]?.code && <span className="ml-2 font-mono text-ink-faint">{device.barcodes[0].code}</span>}
        </p>
        <div className="mt-1">
          <DeviceAvailabilityBadge device={device} outNow={outNow} />
        </div>
        {soldOut && (
          <p className="mt-1 flex items-center gap-1 text-xs text-status-defekt">
            <AlertTriangle size={11} /> Im Zeitraum nicht verfügbar
          </p>
        )}
      </div>

      {onList && item ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDec(item)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-muted hover:text-ink"
            aria-label="Weniger"
          >
            <Minus size={14} />
          </button>
          <span className="w-6 text-center font-mono text-sm font-medium text-ink">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onInc(item)}
            disabled={atMax}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-muted hover:text-ink disabled:opacity-40"
            aria-label="Mehr"
            title={atMax ? `max. ${available} im Zeitraum` : undefined}
          >
            <Plus size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={soldOut}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} />
          Hinzufügen
        </button>
      )}
    </div>
  );
}
