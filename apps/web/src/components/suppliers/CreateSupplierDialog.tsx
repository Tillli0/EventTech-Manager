import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { useCreateSupplier, useUpdateSupplier } from "@/hooks/useSuppliers";
import type { Supplier } from "@/types/database";

export function CreateSupplierDialog({
  open,
  onClose,
  editSupplier,
}: {
  open: boolean;
  onClose: () => void;
  /** Wenn gesetzt: Dialog bearbeitet diesen Partner statt einen neuen anzulegen. */
  editSupplier?: Supplier;
}) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEdit = !!editSupplier;

  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

  // Felder beim Öffnen aus dem zu bearbeitenden Partner vorbelegen (bzw. leeren).
  useEffect(() => {
    if (!open) return;
    setName(editSupplier?.name ?? "");
    setTrade(editSupplier?.trade ?? "");
    setContactPerson(editSupplier?.contact_person ?? "");
    setEmail(editSupplier?.email ?? "");
    setPhone(editSupplier?.phone ?? "");
    setStreet(editSupplier?.street ?? "");
    setZip(editSupplier?.zip ?? "");
    setCity(editSupplier?.city ?? "");
    setWebsite(editSupplier?.website ?? "");
    setNotes(editSupplier?.notes ?? "");
  }, [open, editSupplier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const fields = {
      name: name.trim(),
      trade: trade.trim() || null,
      contact_person: contactPerson.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      street: street.trim() || null,
      zip: zip.trim() || null,
      city: city.trim() || null,
      website: website.trim() || null,
      notes: notes.trim() || null,
    };

    if (isEdit && editSupplier) {
      await updateSupplier.mutateAsync({ id: editSupplier.id, ...fields });
    } else {
      await createSupplier.mutateAsync(fields);
    }
    onClose();
  }

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Verleih-Partner bearbeiten" : "Neuen Verleih-Partner anlegen"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Name *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Sound & Light GmbH" />
          </FormField>
          <FormField label="Gewerk">
            <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="z.B. Catering, Security" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ansprechpartner">
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </FormField>
          <FormField label="Telefon">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="E-Mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Website">
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="z.B. www.beispiel.de" />
          </FormField>
        </div>

        <FormField label="Straße & Nr.">
          <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="z.B. Hauptstraße 1" />
        </FormField>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="PLZ">
            <Input value={zip} onChange={(e) => setZip(e.target.value)} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Ort">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
          </div>
        </div>

        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!name.trim() || isPending}>
            {isPending ? "Wird gespeichert …" : isEdit ? "Speichern" : "Partner anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
