import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Minus, Search, Tag, Settings2, Boxes, Image as ImageIcon, Download, Upload, ChevronUp, ChevronDown, ChevronRight, ScanLine, MapPin, ArrowLeft, Check, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PillSelect } from "@/components/ui/PillSelect";
import { Card } from "@/components/ui/Card";
import { SetCard } from "@/components/inventory/ManageSetsDialog";
import { DeviceAvailabilityBadge } from "@/components/ui/DeviceAvailabilityBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useDevices, useCategories, devicePhotoUrl } from "@/hooks/useDevices";
import {
  useDevicesOutNowMap,
  useDevicesAvailabilityMap,
  useAddPacklistItems,
  useUpdatePacklistItemQuantity,
  useRemovePacklistItem,
  sumBookedQuantity,
} from "@/hooks/useJobs";
import { useDeviceSets, useAddDeviceSetToJob } from "@/hooks/useDeviceSets";
import { ManageLocationsDialog } from "@/components/inventory/ManageLocationsDialog";
import { DEVICE_STATUS_OPTIONS, inspectionStatus, type DeviceStatus, type Device, type DeviceSet, type Job, type PacklistItem } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import { CreateDeviceDialog } from "@/components/inventory/CreateDeviceDialog";
import { ManageCategoriesDialog } from "@/components/inventory/ManageCategoriesDialog";
import { ManageSetsDialog } from "@/components/inventory/ManageSetsDialog";
import { ImportDevicesDialog } from "@/components/inventory/ImportDevicesDialog";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";
import { useAuth } from "@/auth/AuthProvider";

type SortKey = "name" | "stock" | "status" | "value";

/**
 * Wie oft ist das Set JETZT komplett zusammenstellbar? = Minimum über alle
 * Bestandteile von ⌊frei / benötigte Menge⌋, mit frei = Bestand − defekt −
 * aktuell ausgegeben. Null, wenn Bestandteile fehlen/unbekannt sind.
 */
function setBuildableNow(
  set: DeviceSet,
  devices: Device[] | undefined,
  outNowMap: Map<string, number> | undefined,
): number | null {
  if (!set.items || set.items.length === 0 || !devices) return null;
  let min = Infinity;
  for (const item of set.items) {
    const dev = devices.find((d) => d.id === item.device_id);
    if (!dev || item.quantity <= 0) return null;
    const free = Math.max(0, dev.stock_quantity - (dev.defective_quantity ?? 0) - (outNowMap?.get(dev.id) ?? 0));
    min = Math.min(min, Math.floor(free / item.quantity));
  }
  return Number.isFinite(min) ? min : null;
}

/** Farbton je Gerätestatus für Kennzahlen-Karten (Zahl + Mini-Balken). */
const STATUS_TONE: Record<DeviceStatus, { text: string; bar: string }> = {
  verfuegbar: { text: "text-status-verfuegbar", bar: "bg-status-verfuegbar" },
  ausgeliehen: { text: "text-status-ausgeliehen", bar: "bg-status-ausgeliehen" },
  defekt: { text: "text-status-defekt", bar: "bg-status-defekt" },
  wartung: { text: "text-status-wartung", bar: "bg-status-wartung" },
};


export function InventoryPage({ packlistJob }: { packlistJob?: Job } = {}) {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const mayEdit = canEdit("inventar");
  const { data: devices, isLoading, error } = useDevices();
  const { data: categories } = useCategories();
  const { data: outNowMap } = useDevicesOutNowMap();

  // ── Auswahl-Modus für eine Job-Packliste ──────────────────────────────────
  const selectMode = !!packlistJob;
  const { data: sets } = useDeviceSets();
  const { data: conflictMap } = useDevicesAvailabilityMap(
    packlistJob?.start_date,
    packlistJob?.end_date,
    packlistJob?.id,
  );
  const addItems = useAddPacklistItems();
  const updateQty = useUpdatePacklistItemQuantity();
  const removeItem = useRemovePacklistItem();
  const addSetToJob = useAddDeviceSetToJob();

  const packItems = useMemo(() => packlistJob?.packlist_items ?? [], [packlistJob]);
  const itemByDevice = useMemo(() => {
    const m = new Map<string, PacklistItem>();
    for (const it of packItems) m.set(it.device_id, it);
    return m;
  }, [packItems]);

  function availableFor(device: Device): number {
    const otherBooked = sumBookedQuantity(conflictMap?.get(device.id));
    return Math.max(0, device.stock_quantity - (device.defective_quantity ?? 0) - otherBooked);
  }
  function addDevice(device: Device) {
    if (!packlistJob || itemByDevice.has(device.id) || availableFor(device) < 1) return;
    addItems.mutate({ jobId: packlistJob.id, items: [{ deviceId: device.id, quantity: 1 }] });
  }
  function changeQty(item: PacklistItem, device: Device, delta: number) {
    if (!packlistJob) return;
    const next = item.quantity + delta;
    if (next < 1) {
      removeItem.mutate({ id: item.id, jobId: packlistJob.id });
      return;
    }
    // Nur beim Erhöhen gegen die Verfügbarkeit kappen — Verringern muss immer
    // gehen, auch wenn der Posten (z.B. per Set) bereits an der Kapazität liegt.
    if (delta > 0 && next > availableFor(device)) return;
    updateQty.mutate({ id: item.id, jobId: packlistJob.id, quantity: next });
  }
  async function addSet(setId: string) {
    if (!packlistJob) return;
    const set = sets?.find((s) => s.id === setId);
    if (!set?.items?.length) return;
    // Wichtig: die bereits auf DIESER Packliste liegende Menge mit abziehen, sonst
    // bucht mehrfaches Klicken auf ein Set über die echte Verfügbarkeit hinaus.
    const payload = set.items
      .map((i) => {
        const dev = devices?.find((d) => d.id === i.device_id);
        const capacity = dev ? availableFor(dev) : 0;
        const already = itemByDevice.get(i.device_id)?.quantity ?? 0;
        return { deviceId: i.device_id, quantity: Math.min(i.quantity, capacity - already) };
      })
      .filter((x) => x.quantity >= 1);
    if (payload.length > 0) await addSetToJob.mutateAsync({ jobId: packlistJob.id, items: payload });
  }
  /** Gilt das Set als „auf der Liste"? = jedes Set-Gerät ist mind. in Set-Menge vorhanden. */
  function setOnList(set: { items?: { device_id: string; quantity: number }[] }): boolean {
    return !!set.items?.length && set.items.every((i) => (itemByDevice.get(i.device_id)?.quantity ?? 0) >= i.quantity);
  }
  async function removeSet(setId: string) {
    if (!packlistJob) return;
    const set = sets?.find((s) => s.id === setId);
    if (!set?.items?.length) return;
    for (const i of set.items) {
      const cur = itemByDevice.get(i.device_id);
      if (!cur) continue;
      const next = cur.quantity - i.quantity;
      if (next < 1) await removeItem.mutateAsync({ id: cur.id, jobId: packlistJob.id });
      else await updateQty.mutateAsync({ id: cur.id, jobId: packlistJob.id, quantity: next });
    }
  }
  async function toggleSet(setId: string) {
    const set = sets?.find((s) => s.id === setId);
    if (set && setOnList(set)) await removeSet(setId);
    else await addSet(setId);
  }
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "alle">("alle");
  const [categoryFilter, setCategoryFilter] = useState<string>("alle");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  // Eingeklappte Kategorie-Abschnitte (per category_id).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCategory(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Suche entprellen, damit das Tippen bei vielen Geräten flüssig bleibt.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  // "/" fokussiert die Suche (wenn man nicht gerade in einem Feld tippt).
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = devices.filter((device) => {
      const matchesSearch =
        q === "" ||
        device.name.toLowerCase().includes(q) ||
        device.manufacturer?.toLowerCase().includes(q) ||
        device.model?.toLowerCase().includes(q) ||
        device.barcodes?.some((b) => b.code.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "alle" || device.status === statusFilter;
      const matchesCategory = categoryFilter === "alle" || device.category_id === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    const statusOrder = (s: DeviceStatus) => DEVICE_STATUS_OPTIONS.findIndex((o) => o.value === s);
    const dir = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case "name":
          cmp = a.name.localeCompare(b.name, "de");
          break;
        case "stock":
          cmp = a.stock_quantity - b.stock_quantity;
          break;
        case "status":
          cmp = statusOrder(a.status) - statusOrder(b.status);
          break;
        case "value":
          cmp = (a.replacement_value ?? -1) - (b.replacement_value ?? -1);
          break;
      }
      return cmp * dir;
    });
  }, [devices, debouncedSearch, statusFilter, categoryFilter, sort]);

  // Farbe je Kategorie (Fallback grau, wenn keine gepflegt).
  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    categories?.forEach((c) => m.set(c.id, c.color ?? "#8B92A3"));
    return m;
  }, [categories]);

  const rootCategories = useMemo(() => (categories ?? []).filter((c) => !c.parent_id), [categories]);

  // Geräte nach Kategorie gruppieren (alphabetisch, „Ohne Kategorie" ans Ende).
  const groupedByCategory = useMemo(() => {
    const NONE = "__none__";
    const map = new Map<string, { id: string; name: string; color: string; devices: Device[] }>();
    for (const d of filteredDevices) {
      const id = d.category_id ?? NONE;
      const name = d.category?.name ?? "Ohne Kategorie";
      const color = id === NONE ? "#5B6273" : colorById.get(id) ?? "#8B92A3";
      if (!map.has(id)) map.set(id, { id, name, color, devices: [] });
      map.get(id)!.devices.push(d);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.id === NONE) return 1;
      if (b.id === NONE) return -1;
      return a.name.localeCompare(b.name, "de");
    });
  }, [filteredDevices, colorById]);

  function handleExport() {
    const statusLabel = (s: DeviceStatus) =>
      DEVICE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
    exportToCsv(
      `inventar-${new Date().toISOString().slice(0, 10)}`,
      [
        { label: "Name", value: (d: Device) => d.name },
        { label: "Kategorie", value: (d: Device) => d.category?.name ?? "" },
        { label: "Hersteller", value: (d: Device) => d.manufacturer },
        { label: "Modell", value: (d: Device) => d.model },
        { label: "Barcode", value: (d: Device) => d.barcodes?.[0]?.code ?? "" },
        { label: "Lagerort", value: (d: Device) => d.location },
        { label: "Bestand", value: (d: Device) => d.stock_quantity },
        { label: "Status", value: (d: Device) => statusLabel(d.status) },
        { label: "Tagesmietpreis", value: (d: Device) => d.daily_rental_price ?? "" },
        { label: "Wiederbeschaffungswert", value: (d: Device) => d.replacement_value ?? "" },
      ],
      filteredDevices,
    );
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    devices?.forEach((d) => {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    });
    return counts;
  }, [devices]);

  // DGUV-V3-Erinnerung: fällige (≤30 Tage) und überfällige Prüfungen zählen.
  const inspectionReminder = useMemo(() => {
    let overdue = 0;
    let soon = 0;
    devices?.forEach((d) => {
      const s = inspectionStatus(d.next_inspection_date);
      if (s === "overdue") overdue++;
      else if (s === "soon") soon++;
    });
    return { overdue, soon };
  }, [devices]);

  return (
    <div>
      {selectMode && packlistJob && (
        <Link
          to={`/jobs/${packlistJob.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} />
          Zurück zum Job
        </Link>
      )}
      <PageHeader
        title={selectMode ? "Packliste zusammenstellen" : "Inventar"}
        description={
          selectMode && packlistJob
            ? `${packlistJob.title} · ${packItems.length} Posten`
            : devices
              ? `${devices.length} Geräte im Bestand`
              : undefined
        }
        actions={
          selectMode && packlistJob ? (
            <Button onClick={() => navigate(`/jobs/${packlistJob.id}`)}>
              <Check size={16} />
              Fertig
            </Button>
          ) : (
            <>
              {/* Mobiler Scan-Zugang (Desktop hat ihn in der Sidebar) */}
              <Link
                to="/scan"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-bg-raised px-4 text-sm font-medium text-ink transition-colors hover:bg-bg-surface md:hidden"
              >
                <ScanLine size={16} />
                Scannen
              </Link>
              <Button variant="secondary" onClick={handleExport} disabled={filteredDevices.length === 0}>
                <Download size={16} />
                CSV
              </Button>
              {mayEdit && (
                <>
                  <Button variant="secondary" onClick={() => setImportOpen(true)}>
                    <Upload size={16} />
                    Import
                  </Button>
                  <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
                    <Settings2 size={16} />
                    Kategorien
                  </Button>
                  <Button variant="secondary" onClick={() => setLocationsOpen(true)}>
                    <MapPin size={16} />
                    Lagerorte
                  </Button>
                  <Button variant="secondary" onClick={() => setSetsOpen(true)}>
                    <Boxes size={16} />
                    Sets
                  </Button>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus size={16} />
                    Gerät anlegen
                  </Button>
                </>
              )}
            </>
          )
        }
      />

      {/* Geräte-Sets als Foto-/Icon-Grid — im Auswahl-Modus anklickbar (Set buchen),
          sonst Übersicht mit Live-Buchbarkeit („N× buchbar" aus der Verfügbarkeit). */}
      {sets && sets.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
              <Boxes size={13} /> Geräte-Sets
              <span className="normal-case tracking-normal text-ink-faint">({sets.length})</span>
            </p>
            {!selectMode && mayEdit && (
              <button
                type="button"
                onClick={() => setSetsOpen(true)}
                className="text-xs font-medium text-accent hover:text-accent-hover"
              >
                Sets verwalten
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sets.map((set) => {
              const buildable = setBuildableNow(set, devices, outNowMap);
              const parts = set.items?.length ?? 0;
              return (
                <SetCard
                  key={set.id}
                  set={set}
                  selected={selectMode ? setOnList(set) : false}
                  onClick={selectMode ? () => toggleSet(set.id) : mayEdit ? () => setSetsOpen(true) : undefined}
                  subtitle={
                    <>
                      {parts} {parts === 1 ? "Bestandteil" : "Bestandteile"}
                      {buildable !== null && (
                        <>
                          {" · "}
                          <span className={buildable === 0 ? "text-status-defekt" : "text-status-verfuegbar"}>
                            {buildable === 0 ? "ausgebucht" : `${buildable}× buchbar`}
                          </span>
                        </>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Status-Übersicht als Kennzahlen (nicht im Auswahl-Modus) */}
      {!selectMode && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEVICE_STATUS_OPTIONS.map((opt) => {
            const count = statusCounts[opt.value] ?? 0;
            const share = devices && devices.length > 0 ? (count / devices.length) * 100 : 0;
            const tone = STATUS_TONE[opt.value];
            return (
              <Card key={opt.value} className="px-4 py-3">
                <p className="text-xs text-ink-muted">{opt.label}</p>
                <p className={cn("mt-1 text-2xl font-semibold", count > 0 ? tone.text : "text-ink")}>{count}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-raised">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* DGUV-V3-Erinnerung */}
      {!selectMode && (inspectionReminder.overdue > 0 || inspectionReminder.soon > 0) && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-status-wartung/40 bg-status-wartung-bg px-4 py-3 text-sm">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-status-wartung" />
          <div>
            <p className="font-medium text-ink">DGUV-V3-Prüfungen fällig</p>
            <p className="text-ink-muted">
              {inspectionReminder.overdue > 0 && (
                <span className="text-status-defekt">{inspectionReminder.overdue} überfällig</span>
              )}
              {inspectionReminder.overdue > 0 && inspectionReminder.soon > 0 && " · "}
              {inspectionReminder.soon > 0 && <span>{inspectionReminder.soon} in den nächsten 30 Tagen</span>}
            </p>
          </div>
        </div>
      )}

      {/* Filterleiste — Suche + farbige Pillen statt Dropdowns */}
      <div className="mb-4 space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, Hersteller, Modell oder Barcode …  (/ zum Fokussieren)"
            className="pl-9"
          />
        </div>
        <PillSelect
          allLabel="Alle Status"
          options={DEVICE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={statusFilter === "alle" ? null : statusFilter}
          onChange={(v) => setStatusFilter((v as DeviceStatus) ?? "alle")}
        />
        {rootCategories.length > 0 && (
          <PillSelect
            allLabel="Alle Kategorien"
            options={rootCategories.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
            value={categoryFilter === "alle" ? null : categoryFilter}
            onChange={(v) => setCategoryFilter(v ?? "alle")}
          />
        )}
      </div>

      {isLoading && <LoadingState label="Geräte werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && filteredDevices.length === 0 && (
        <EmptyState
          icon={Tag}
          title="Keine Geräte gefunden"
          description="Passe die Filter an oder lege ein neues Gerät an."
          action={
            mayEdit ? (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Erstes Gerät anlegen
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && filteredDevices.length > 0 && (
        <div className="space-y-4">
          {/* Kompakte Sortier-Leiste (ersetzt die Tabellen-Spaltenköpfe) */}
          <div className="flex items-center gap-1 text-xs text-ink-faint">
            <span className="mr-1">Sortieren:</span>
            {(
              [
                { k: "name", label: "Name" },
                { k: "stock", label: "Bestand" },
                { k: "status", label: "Status" },
                { k: "value", label: "Wert" },
              ] as const
            ).map(({ k, label }) => {
              const active = sort.key === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleSort(k)}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded px-2 py-1 font-medium transition-colors",
                    active ? "bg-bg-raised text-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                  {active && (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
              );
            })}
          </div>

          {groupedByCategory.map((group) => {
            const isCollapsed = collapsed.has(group.id);
            return (
              <div key={group.id} className="space-y-1.5">
                {/* Kategorie-Kopf, aufklappbar, in der Kategoriefarbe */}
                <button
                  type="button"
                  onClick={() => toggleCategory(group.id)}
                  className="flex w-full items-center gap-2 rounded-md border-l-4 px-3 py-2 text-left"
                  style={{ borderLeftColor: group.color, backgroundColor: `${group.color}14` }}
                >
                  <ChevronRight
                    size={15}
                    className={cn("shrink-0 transition-transform", !isCollapsed && "rotate-90")}
                    style={{ color: group.color }}
                  />
                  <span className="text-sm font-semibold" style={{ color: group.color }}>
                    {group.name}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {group.devices.length} {group.devices.length === 1 ? "Gerät" : "Geräte"}
                  </span>
                </button>
                {!isCollapsed &&
                  group.devices.map((device) => (
                    <DeviceListRow
                      key={device.id}
                      device={device}
                      accentColor={group.color}
                      outNow={outNowMap?.get(device.id) ?? 0}
                      select={
                        selectMode
                          ? {
                              item: itemByDevice.get(device.id) ?? null,
                              available: availableFor(device),
                              onAdd: () => addDevice(device),
                              onInc: (it) => changeQty(it, device, 1),
                              onDec: (it) => changeQty(it, device, -1),
                            }
                          : undefined
                      }
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}

      <CreateDeviceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ManageCategoriesDialog open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
      <ManageLocationsDialog open={locationsOpen} onClose={() => setLocationsOpen(false)} />
      <ManageSetsDialog open={setsOpen} onClose={() => setSetsOpen(false)} />
      <ImportDevicesDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

interface SelectProps {
  item: PacklistItem | null;
  available: number;
  onAdd: () => void;
  onInc: (item: PacklistItem) => void;
  onDec: (item: PacklistItem) => void;
}

/**
 * Geräte-Zeile als Karte (Look der neuen Jobs-Seite): Kategoriefarbe als linker
 * Akzentbalken, Foto/Icon, Name + ETM-Code, Hersteller/Modell/Lagerort als
 * Unterzeile, rechts Bestand + Verfügbarkeit (+ Auswahl-Steuerung im Packlisten-Modus).
 */
function DeviceListRow({
  device,
  accentColor,
  outNow,
  select,
}: {
  device: Device;
  accentColor: string;
  outNow: number;
  select?: SelectProps;
}) {
  const locationName = device.location_ref?.name ?? device.location;
  const onList = !!select?.item;

  const content = (
    <>
      <DeviceThumbnail device={device} accentColor={accentColor} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-ink">{device.name}</span>
          {device.barcodes?.[0]?.code && (
            <span className="hidden shrink-0 font-mono text-[0.65rem] text-ink-faint sm:inline">
              {device.barcodes[0].code}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-muted">
          {[
            [device.manufacturer, device.model].filter(Boolean).join(" "),
            locationName,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </span>
      </span>
      <span className="hidden shrink-0 font-mono text-xs font-medium text-accent sm:inline">
        {device.stock_quantity}×
      </span>
      <span className="shrink-0 text-right">
        <DeviceAvailabilityBadge device={device} outNow={outNow} />
        {select && (
          <span
            className={cn(
              "mt-0.5 block text-xs",
              select.available < 1 ? "font-medium text-status-defekt" : "text-ink-faint",
            )}
          >
            {select.available < 1 ? "im Job-Zeitraum ausgebucht" : `${select.available} im Job-Zeitraum frei`}
          </span>
        )}
      </span>
      {select ? (
        <span className="shrink-0">
          <AddControl select={select} />
        </span>
      ) : (
        <span className="hidden w-24 shrink-0 text-right font-mono text-xs text-ink-muted lg:inline">
          {formatCurrency(device.replacement_value)}
        </span>
      )}
    </>
  );

  const rowClass = cn(
    "flex items-center gap-3 rounded-r-lg border border-l-[3px] px-4 py-2.5 transition-colors",
    onList ? "border-accent/40 bg-accent-soft" : "border-border bg-bg-surface hover:bg-bg-raised",
  );
  const style = { borderLeftColor: onList ? "#6366F1" : accentColor };

  if (select) {
    return (
      <div className={rowClass} style={style}>
        {content}
      </div>
    );
  }
  return (
    <Link to={`/inventar/${device.id}`} className={rowClass} style={style}>
      {content}
    </Link>
  );
}

/** Hinzufügen-Button bzw. −/Menge/+-Stepper für den Packlisten-Auswahlmodus. */
function AddControl({ select }: { select: SelectProps }) {
  const { item, available, onAdd, onInc, onDec } = select;
  if (item) {
    const atMax = item.quantity >= available;
    return (
      <div className="inline-flex items-center gap-1.5">
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
    );
  }
  const soldOut = available < 1;
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={soldOut}
      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Plus size={14} />
      {soldOut ? "nicht verfügbar" : "Hinzufügen"}
    </button>
  );
}

function DeviceThumbnail({ device, accentColor }: { device: Device; accentColor?: string }) {
  const cover = device.device_photos?.find((p) => p.is_cover) ?? device.device_photos?.[0];
  if (!cover) {
    // Ohne Foto: Icon-Kachel in der Kategoriefarbe (dezent getönt).
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: `${accentColor ?? "#8B92A3"}1e`,
          color: accentColor ?? "#8B92A3",
        }}
      >
        <ImageIcon size={16} />
      </span>
    );
  }
  return (
    <img
      src={devicePhotoUrl(cover.storage_path)}
      alt=""
      className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
    />
  );
}
