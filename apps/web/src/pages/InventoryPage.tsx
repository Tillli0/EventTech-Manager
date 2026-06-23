import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Tag, Settings2, Boxes, Image as ImageIcon, Download, Upload, ChevronUp, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { DeviceStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useDevices, useCategories, devicePhotoUrl } from "@/hooks/useDevices";
import { DEVICE_STATUS_OPTIONS, type DeviceStatus, type Device } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import { CreateDeviceDialog } from "@/components/inventory/CreateDeviceDialog";
import { ManageCategoriesDialog } from "@/components/inventory/ManageCategoriesDialog";
import { ManageSetsDialog } from "@/components/inventory/ManageSetsDialog";
import { ImportDevicesDialog } from "@/components/inventory/ImportDevicesDialog";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";
import { useAuth } from "@/auth/AuthProvider";

type SortKey = "name" | "stock" | "status" | "value";

function SortHead({
  label,
  k,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort.key === k;
  return (
    <th className={cn("font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-ink",
          align === "right" && "flex-row-reverse",
          active && "text-ink",
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronDown size={12} className="opacity-0" />
        )}
      </button>
    </th>
  );
}

export function InventoryPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("inventar");
  const { data: devices, isLoading, error } = useDevices();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "alle">("alle");
  const [categoryFilter, setCategoryFilter] = useState<string>("alle");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

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

  return (
    <div>
      <PageHeader
        title="Inventar"
        description={devices ? `${devices.length} Geräte im Bestand` : undefined}
        actions={
          <>
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
        }
      />

      {/* Status-Übersicht als Kennzahlen */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DEVICE_STATUS_OPTIONS.map((opt) => (
          <Card key={opt.value} className="px-4 py-3">
            <p className="text-xs text-ink-muted">{opt.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{statusCounts[opt.value] ?? 0}</p>
          </Card>
        ))}
      </div>

      {/* Filterleiste */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, Hersteller, Modell oder Barcode …  (/ zum Fokussieren)"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | "alle")}
          className="sm:w-48"
        >
          <option value="alle">Alle Status</option>
          {DEVICE_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="alle">Alle Kategorien</option>
          {categories
            ?.filter((c) => !c.parent_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
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
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-muted">
                <SortHead label="Gerät" k="name" sort={sort} onSort={toggleSort} className="px-4 py-3" />
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Barcode</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Lagerort</th>
                <SortHead label="Bestand" k="stock" sort={sort} onSort={toggleSort} className="hidden px-4 py-3 text-right sm:table-cell" align="right" />
                <SortHead label="Status" k="status" sort={sort} onSort={toggleSort} className="px-4 py-3" />
                <SortHead label="Wiederbeschaffungswert" k="value" sort={sort} onSort={toggleSort} className="hidden px-4 py-3 text-right lg:table-cell" align="right" />
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.id} className="border-b border-border last:border-0 hover:bg-bg-raised">
                  <td className="px-4 py-3">
                    <Link to={`/inventar/${device.id}`} className="flex items-center gap-3">
                      <DeviceThumbnail device={device} />
                      <span className="block">
                        <span className="block font-medium text-ink">{device.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {[device.manufacturer, device.model].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-ink-muted sm:table-cell">
                    {device.barcodes?.[0]?.code ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{device.location ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-right sm:table-cell">
                    {device.stock_quantity > 1 ? (
                      <span className="font-mono text-xs font-medium text-accent">{device.stock_quantity}×</span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DeviceStatusBadge status={device.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-ink-muted lg:table-cell">
                    {formatCurrency(device.replacement_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateDeviceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ManageCategoriesDialog open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
      <ManageSetsDialog open={setsOpen} onClose={() => setSetsOpen(false)} />
      <ImportDevicesDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function DeviceThumbnail({ device }: { device: Device }) {
  const cover = device.device_photos?.find((p) => p.is_cover) ?? device.device_photos?.[0];
  if (!cover) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-raised text-ink-faint">
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
