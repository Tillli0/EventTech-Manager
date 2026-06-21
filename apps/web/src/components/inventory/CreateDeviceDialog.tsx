import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import { useCreateDevice, useNextBarcodeSuggestion, useCategories } from "@/hooks/useDevices";

export function CreateDeviceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createDevice = useCreateDevice();
  const { data: suggestedBarcode } = useNextBarcodeSuggestion();
  const { data: categories } = useCategories();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [barcode, setBarcode] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (suggestedBarcode && !barcode) setBarcode(suggestedBarcode);
  }, [suggestedBarcode, barcode]);

  function reset() {
    setName("");
    setCategoryId("");
    setManufacturer("");
    setModel("");
    setLocation("");
    setBarcode(suggestedBarcode ?? "");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) return;

    await createDevice.mutateAsync({
      name: name.trim(),
      category_id: categoryId || null,
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      barcode: barcode.trim(),
    });

    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Neues Gerät anlegen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Gerätename *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Aktivbox 15&quot;" required />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Hersteller">
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="z.B. RCF" />
          </FormField>
          <FormField label="Modell">
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="z.B. ART 715-A" />
          </FormField>
        </div>

        <FormField label="Kategorie">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Keine Kategorie</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? `— ${c.name}` : c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Lagerort">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z.B. Lager A, Regal 1" />
        </FormField>

        <FormField label="Barcode *" hint="Wird automatisch vorgeschlagen, kann aber überschrieben werden.">
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="font-mono"
            required
          />
        </FormField>

        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={createDevice.isPending}>
            {createDevice.isPending ? "Wird gespeichert …" : "Gerät anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
