import { useState } from "react";
import { Check, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Input";
import { PillSelect } from "@/components/ui/PillSelect";
import { useCategories, useUpdateDevice, useSetDeviceLocation } from "@/hooks/useDevices";
import { useLocations } from "@/hooks/useLocations";
import { DEVICE_STATUS_OPTIONS, type Device, type DeviceStatus } from "@/types/database";

/** Parst ein Eingabe-String zu Zahl oder null (leer = null). */
function num(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Geräte-Bearbeitungsmodus: ein Formular für ALLE Stammdaten auf einmal
 * (statt einzelner Bleistift-Felder). Kategorie/Lagerort/Status als Pillen.
 */
export function DeviceEditCard({ device, onDone }: { device: Device; onDone: () => void }) {
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();
  const updateDevice = useUpdateDevice();
  const setLocation = useSetDeviceLocation();

  const [name, setName] = useState(device.name);
  const [manufacturer, setManufacturer] = useState(device.manufacturer ?? "");
  const [model, setModel] = useState(device.model ?? "");
  const [serial, setSerial] = useState(device.serial_number ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(device.category_id);
  const [locationId, setLocationId] = useState<string | null>(device.location_id);
  const [status, setStatus] = useState<DeviceStatus>(device.status);
  const [stock, setStock] = useState(String(device.stock_quantity));
  const [defective, setDefective] = useState(String(device.defective_quantity ?? 0));
  const [price, setPrice] = useState(device.daily_rental_price != null ? String(device.daily_rental_price) : "");
  const [replacement, setReplacement] = useState(device.replacement_value != null ? String(device.replacement_value) : "");
  const [purchasePrice, setPurchasePrice] = useState(device.purchase_price != null ? String(device.purchase_price) : "");
  const [purchaseDate, setPurchaseDate] = useState(device.purchase_date ?? "");
  const [weight, setWeight] = useState(device.weight_kg != null ? String(device.weight_kg) : "");
  const [power, setPower] = useState(device.power_watts != null ? String(device.power_watts) : "");
  const [notes, setNotes] = useState(device.notes ?? "");

  const rootCategories = (categories ?? []).filter((c) => !c.parent_id);

  async function handleSave() {
    if (!name.trim()) return;
    const stockN = Math.max(1, Math.round(num(stock) ?? 1));
    const defectiveN = Math.min(stockN, Math.max(0, Math.round(num(defective) ?? 0)));

    await updateDevice.mutateAsync({
      id: device.id,
      name: name.trim(),
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      serial_number: serial.trim() || null,
      category_id: categoryId,
      status,
      stock_quantity: stockN,
      defective_quantity: defectiveN,
      daily_rental_price: num(price),
      replacement_value: num(replacement),
      purchase_price: num(purchasePrice),
      purchase_date: purchaseDate || null,
      weight_kg: num(weight),
      power_watts: power.trim() ? Math.round(num(power) ?? 0) : null,
      notes: notes.trim() || null,
    });

    if (locationId !== device.location_id) {
      await setLocation.mutateAsync({ deviceId: device.id, locationId, fromLocationId: device.location_id });
    }
    onDone();
  }

  const busy = updateDevice.isPending || setLocation.isPending;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Gerät bearbeiten</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDone} disabled={busy}>
            <X size={14} />
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || busy}>
            <Check size={14} />
            {busy ? "Speichert …" : "Speichern"}
          </Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <FormField label="Name *">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Hersteller">
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
          </FormField>
          <FormField label="Modell">
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Seriennummer">
          <Input value={serial} onChange={(e) => setSerial(e.target.value)} className="font-mono" />
        </FormField>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-muted">Kategorie</p>
          {rootCategories.length > 0 ? (
            <PillSelect
              allLabel="Keine"
              options={rootCategories.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
              value={categoryId}
              onChange={setCategoryId}
            />
          ) : (
            <p className="text-xs text-ink-faint">Noch keine Kategorien angelegt.</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-muted">Lagerort</p>
          {locations && locations.length > 0 ? (
            <PillSelect
              allLabel="Keiner"
              options={locations.map((l) => ({ value: l.id, label: l.name, color: l.color }))}
              value={locationId}
              onChange={setLocationId}
            />
          ) : (
            <p className="text-xs text-ink-faint">Noch keine Lagerorte angelegt (im Inventar unter „Lagerorte").</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-muted">Status</p>
          <PillSelect
            options={DEVICE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={status}
            onChange={(v) => v && setStatus(v as DeviceStatus)}
            allowClear={false}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Stückzahl">
            <Input type="number" min={1} value={stock} onChange={(e) => setStock(e.target.value)} />
          </FormField>
          <FormField label="davon defekt">
            <Input type="number" min={0} value={defective} onChange={(e) => setDefective(e.target.value)} />
          </FormField>
          <FormField label="Tagesmietpreis (€)">
            <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </FormField>
          <FormField label="Wiederbeschaffungswert (€)">
            <Input type="number" min={0} step="0.01" value={replacement} onChange={(e) => setReplacement(e.target.value)} />
          </FormField>
          <FormField label="Kaufpreis (€)">
            <Input type="number" min={0} step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
          </FormField>
          <FormField label="Kaufdatum">
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </FormField>
          <FormField label="Gewicht (kg)">
            <Input type="number" min={0} step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </FormField>
          <FormField label="Leistung (W)">
            <Input type="number" min={0} value={power} onChange={(e) => setPower(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </FormField>
      </CardBody>
    </Card>
  );
}
