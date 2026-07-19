import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Printer, Trash2, Pencil, ImagePlus, Star, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DeviceEditCard } from "@/components/inventory/DeviceEditCard";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { DeviceAvailabilityBadge } from "@/components/ui/DeviceAvailabilityBadge";
import { PillSelect } from "@/components/ui/PillSelect";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useDeviceBookings, useDevicesOutNowMap } from "@/hooks/useJobs";
import { useDeviceHistory } from "@/hooks/useDeviceHistory";
import type { DeviceHistory } from "@/types/database";
import {
  useDevice,
  useUpdateDeviceStatus,
  useDeleteDevice,
  useDevicePhotos,
  useUploadDevicePhoto,
  useDeleteDevicePhoto,
  useSetCoverPhoto,
  devicePhotoUrl,
} from "@/hooks/useDevices";
import {
  DEVICE_STATUS_OPTIONS,
  inspectionStatus,
  INSPECTION_STATUS_LABELS,
  type DeviceStatus,
} from "@/types/database";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { BarcodeLabel, printBarcodeLabels } from "@/components/barcode/BarcodeLabel";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const mayEdit = canEdit("inventar");
  const { data: device, isLoading, error } = useDevice(id);
  const { data: outNowMap } = useDevicesOutNowMap();
  const updateStatus = useUpdateDeviceStatus();
  const deleteDevice = useDeleteDevice();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <LoadingState label="Gerät wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!device) return <ErrorState message="Gerät nicht gefunden." />;

  const primaryBarcode = device.barcodes?.find((b) => b.is_primary) ?? device.barcodes?.[0];

  async function handleDelete() {
    const ok = await confirm({
      title: "Gerät löschen",
      message: `„${device!.name}" wirklich endgültig löschen?`,
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    await deleteDevice.mutateAsync(device!.id);
    navigate("/inventar");
  }

  return (
    <div>
      <Link to="/inventar" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Zurück zum Inventar
      </Link>

      <PageHeader
        title={device.name}
        description={[device.manufacturer, device.model].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                primaryBarcode &&
                printBarcodeLabels([{ code: primaryBarcode.code, deviceName: device.name }])
              }
              disabled={!primaryBarcode}
            >
              <Printer size={16} />
              Label drucken
            </Button>
            {mayEdit && !editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil size={16} />
                Bearbeiten
              </Button>
            )}
            {mayEdit && (
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={16} />
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <DeviceBookingsCard deviceId={device.id} />

          {editing ? (
            <DeviceEditCard device={device} onDone={() => setEditing(false)} />
          ) : (
          <>
          {mayEdit && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Status</h2>
            </CardHeader>
            <CardBody>
              {device.stock_quantity > 1 && (
                <p className="mb-3 text-xs text-ink-muted">
                  Mengen-Gerät ({device.stock_quantity} Stück) — der Status hier ist nur ein grober Hinweis
                  (z.B. „defekt“ für den ganzen Posten). Welche Menge gerade ausgeliehen ist, ergibt sich aus
                  den aktiven Jobs, nicht aus diesem Schalter.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {DEVICE_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus.mutate({ id: device.id, status: opt.value as DeviceStatus })}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      device.status === opt.value
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-border text-ink-muted hover:border-accent/40 hover:text-ink",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Stammdaten</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4 text-sm">
              <DataField
                label="Stückzahl"
                value={`${device.stock_quantity}${device.stock_quantity > 1 ? " Stück" : ""}`}
              />
              <DataField label="Tagesmietpreis" value={formatCurrency(device.daily_rental_price)} />
              <DataField label="Seriennummer" value={device.serial_number} mono />
              <DataField label="Lagerort" value={device.location_ref?.name ?? device.location} />
              <DataField label="Kategorie" value={device.category?.name} />
              <DataField label="Kaufdatum" value={formatDate(device.purchase_date)} />
              <DataField label="Kaufpreis" value={formatCurrency(device.purchase_price)} />
              <DataField label="Wiederbeschaffungswert" value={formatCurrency(device.replacement_value)} />
              <DataField label="Gewicht" value={device.weight_kg ? `${device.weight_kg} kg` : null} />
              <DataField label="Leistung" value={device.power_watts ? `${device.power_watts} W` : null} />
            </CardBody>
          </Card>

          {device.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Notizen</h2>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-ink-muted">{device.notes}</p>
              </CardBody>
            </Card>
          )}
          </>
          )}

          <DeviceHistoryCard deviceId={device.id} />
        </div>

        <div className="space-y-6">
          <DevicePhotosCard deviceId={device.id} canEdit={mayEdit} />

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Verfügbarkeit</h2>
            </CardHeader>
            <CardBody>
              <DeviceAvailabilityBadge device={device} outNow={outNowMap?.get(device.id) ?? 0} />
            </CardBody>
          </Card>

          {(device.last_inspection_date || device.next_inspection_date) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">DGUV V3 — Elektroprüfung</h2>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <InspectionBadge nextDate={device.next_inspection_date} />
                <div className="grid grid-cols-2 gap-4">
                  <DataField label="Letzte Prüfung" value={formatDate(device.last_inspection_date)} />
                  <DataField label="Nächste Prüfung" value={formatDate(device.next_inspection_date)} />
                </div>
              </CardBody>
            </Card>
          )}

          {primaryBarcode && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Barcode</h2>
              </CardHeader>
              <CardBody className="flex flex-col items-center gap-3">
                <p className="font-mono text-sm text-ink-muted">{primaryBarcode.code}</p>
                <BarcodeLabel code={primaryBarcode.code} deviceName={device.name} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Zeigt, in welchen laufenden/anstehenden Jobs dieses Gerät gerade verplant ist. */
function DeviceBookingsCard({ deviceId }: { deviceId: string }) {
  const { data: bookings, isLoading } = useDeviceBookings(deviceId);
  if (isLoading || !bookings || bookings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-ink">Aktuell verplant</h2>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {bookings.map((b) => (
            <Link
              key={b.id}
              to={`/jobs/${b.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-raised px-3 py-2 transition-colors hover:border-accent/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{b.title}</p>
                <p className="text-xs text-ink-muted">
                  {formatDate(b.start_date)} – {formatDate(b.end_date)}
                  {b.quantity > 1 && <span className="ml-2 font-mono text-accent">{b.quantity}×</span>}
                </p>
              </div>
              <JobStatusBadge status={b.status} />
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

const HISTORY_LABELS: Record<DeviceHistory["event_type"], { label: string; dot: string }> = {
  ausgegeben: { label: "Ausgegeben", dot: "bg-status-ausgeliehen" },
  zurueck: { label: "Zurückgegeben", dot: "bg-status-verfuegbar" },
  defekt: { label: "Als defekt gemeldet", dot: "bg-status-defekt" },
  lagerort: { label: "Lagerort geändert", dot: "bg-accent" },
  status: { label: "Status geändert", dot: "bg-status-wartung" },
};

/** Ordnet einen History-Eintrag einer Filtergruppe zu (Jobs / Lagerort / Andere). */
function historyGroup(eventType: DeviceHistory["event_type"]): "jobs" | "lagerort" | "andere" {
  if (eventType === "ausgegeben" || eventType === "zurueck" || eventType === "defekt") return "jobs";
  if (eventType === "lagerort") return "lagerort";
  return "andere";
}

const HISTORY_FILTER_OPTIONS = [
  { value: "jobs", label: "Jobs" },
  { value: "lagerort", label: "Lagerort" },
  { value: "andere", label: "Andere" },
];

/** Verlauf eines Geräts: Ausgaben/Rückgaben, Defekt-Meldungen, Lagerort-/Status-Wechsel. */
function DeviceHistoryCard({ deviceId }: { deviceId: string }) {
  const { data: history, isLoading } = useDeviceHistory(deviceId);
  const [filter, setFilter] = useState<string | null>(null);
  if (isLoading || !history || history.length === 0) return null;

  const filtered = filter ? history.filter((h) => historyGroup(h.event_type) === filter) : history;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Verlauf</h2>
        <PillSelect
          size="sm"
          allLabel="Alle"
          options={HISTORY_FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </CardHeader>
      <CardBody>
        {filtered.length === 0 ? (
          <p className="py-2 text-sm text-ink-faint">Keine Einträge in dieser Kategorie.</p>
        ) : (
        <ul className="space-y-3">
          {filtered.map((h) => {
            const meta = HISTORY_LABELS[h.event_type];
            return (
              <li key={h.id} className="flex gap-3">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    {meta.label}
                    {h.quantity != null && h.quantity > 0 && (
                      <span className="ml-1 font-mono text-xs text-ink-muted">{h.quantity}×</span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                    <span>{formatDateTime(h.created_at)}</span>
                    {h.job && (
                      <Link to={`/jobs/${h.job_id}`} className="text-accent hover:underline">
                        {h.job.title}
                      </Link>
                    )}
                    {h.to_location && <span>→ {h.to_location.name}</span>}
                    {h.note && <span className="text-ink-faint">· {h.note}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        )}
      </CardBody>
    </Card>
  );
}

function DataField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={cn("mt-0.5 text-ink", mono && "font-mono text-sm")}>{value || "—"}</p>
    </div>
  );
}

/** Farbiger Status-Hinweis zur DGUV-V3-Prüffälligkeit. */
function InspectionBadge({ nextDate }: { nextDate: string | null }) {
  const status = inspectionStatus(nextDate);
  if (status === "none") return null;
  const cls =
    status === "overdue"
      ? "bg-status-defekt-bg text-status-defekt"
      : status === "soon"
        ? "bg-status-wartung-bg text-status-wartung"
        : "bg-status-verfuegbar-bg text-status-verfuegbar";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", cls)}>
      {INSPECTION_STATUS_LABELS[status]}
    </span>
  );
}

function DevicePhotosCard({ deviceId, canEdit }: { deviceId: string; canEdit: boolean }) {
  const { data: photos, isLoading } = useDevicePhotos(deviceId);
  const uploadPhoto = useUploadDevicePhoto();
  const deletePhoto = useDeleteDevicePhoto();
  const setCover = useSetCoverPhoto();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cover zuerst anzeigen, danach nach sort_order.
  const sorted = [...(photos ?? [])].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    return a.sort_order - b.sort_order;
  });

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      await uploadPhoto.mutateAsync({ deviceId, file });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isBusy = uploadPhoto.isPending || deletePhoto.isPending || setCover.isPending;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Fotos</h2>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              <ImagePlus size={14} />
              Hinzufügen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </>
        )}
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <p className="text-sm text-ink-faint">Wird geladen …</p>
        ) : sorted.length === 0 ? (
          canEdit ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-ink-faint transition-colors hover:border-accent hover:text-accent"
            >
              <ImagePlus size={22} />
              <span className="text-xs">Erstes Bild hinzufügen</span>
            </button>
          ) : (
            <p className="text-sm text-ink-faint">Keine Fotos vorhanden.</p>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((photo) => (
              <div key={photo.id} className="group relative">
                <img
                  src={devicePhotoUrl(photo.storage_path)}
                  alt="Gerätefoto"
                  className={cn(
                    "aspect-square w-full rounded-lg object-cover",
                    photo.is_cover ? "ring-2 ring-accent" : "border border-border",
                  )}
                />
                {photo.is_cover && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-on">
                    <Star size={9} className="fill-current" />
                    Cover
                  </span>
                )}
                {canEdit && (
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!photo.is_cover && (
                    <button
                      type="button"
                      title="Als Cover festlegen"
                      disabled={isBusy}
                      onClick={() => setCover.mutate({ id: photo.id, deviceId })}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-ink-muted shadow hover:text-accent"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Foto löschen"
                    disabled={isBusy}
                    onClick={async () => {
                      if (!(await confirm({ message: "Foto wirklich löschen?", confirmLabel: "Löschen", danger: true }))) return;
                      deletePhoto.mutate({ id: photo.id, storagePath: photo.storage_path, deviceId });
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-ink-muted shadow hover:text-status-defekt"
                  >
                    <X size={12} />
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
