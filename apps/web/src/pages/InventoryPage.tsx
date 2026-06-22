import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Tag, Settings2, Boxes } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { DeviceStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useDevices, useCategories } from "@/hooks/useDevices";
import { DEVICE_STATUS_OPTIONS, type DeviceStatus } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import { CreateDeviceDialog } from "@/components/inventory/CreateDeviceDialog";
import { ManageCategoriesDialog } from "@/components/inventory/ManageCategoriesDialog";
import { ManageSetsDialog } from "@/components/inventory/ManageSetsDialog";

export function InventoryPage() {
  const { data: devices, isLoading, error } = useDevices();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "alle">("alle");
  const [categoryFilter, setCategoryFilter] = useState<string>("alle");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false);

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter((device) => {
      const matchesSearch =
        search.trim() === "" ||
        device.name.toLowerCase().includes(search.toLowerCase()) ||
        device.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
        device.model?.toLowerCase().includes(search.toLowerCase()) ||
        device.barcodes?.some((b) => b.code.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === "alle" || device.status === statusFilter;
      const matchesCategory = categoryFilter === "alle" || device.category_id === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [devices, search, statusFilter, categoryFilter]);

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, Hersteller, Modell oder Barcode …"
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
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Erstes Gerät anlegen
            </Button>
          }
        />
      )}

      {!isLoading && filteredDevices.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="px-4 py-3 font-medium">Gerät</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Barcode</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Lagerort</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Bestand</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Wiederbeschaffungswert</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.id} className="border-b border-border last:border-0 hover:bg-bg-raised">
                  <td className="px-4 py-3">
                    <Link to={`/inventar/${device.id}`} className="block">
                      <p className="font-medium text-ink">{device.name}</p>
                      <p className="text-xs text-ink-muted">
                        {[device.manufacturer, device.model].filter(Boolean).join(" · ") || "—"}
                      </p>
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
    </div>
  );
}
