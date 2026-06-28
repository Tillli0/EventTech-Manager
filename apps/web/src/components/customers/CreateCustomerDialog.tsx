import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Input";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { CUSTOMER_SOURCE_LABELS, type CustomerSource, type Customer } from "@/types/database";

export function CreateCustomerDialog({
  open,
  onClose,
  editCustomer,
}: {
  open: boolean;
  onClose: () => void;
  /** Wenn gesetzt: Dialog bearbeitet diesen Kunden statt einen neuen anzulegen. */
  editCustomer?: Customer;
}) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEdit = !!editCustomer;

  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<CustomerSource>("sonstiges");

  // Felder beim Öffnen aus dem zu bearbeitenden Kunden vorbelegen (bzw. leeren).
  useEffect(() => {
    if (!open) return;
    setCompanyName(editCustomer?.company_name ?? "");
    setFirstName(editCustomer?.first_name ?? "");
    setLastName(editCustomer?.last_name ?? "");
    setEmail(editCustomer?.email ?? "");
    setPhone(editCustomer?.phone ?? "");
    setStreet(editCustomer?.address_street ?? "");
    setZip(editCustomer?.address_zip ?? "");
    setCity(editCustomer?.address_city ?? "");
    setSource(editCustomer?.source ?? "sonstiges");
  }, [open, editCustomer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() && !firstName.trim() && !lastName.trim()) return;

    const fields = {
      company_name: companyName.trim() || null,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address_street: street.trim() || null,
      address_zip: zip.trim() || null,
      address_city: city.trim() || null,
      source,
    };

    if (isEdit && editCustomer) {
      await updateCustomer.mutateAsync({ id: editCustomer.id, ...fields });
    } else {
      await createCustomer.mutateAsync(fields);
    }
    onClose();
  }

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Kunde bearbeiten" : "Neuen Kunden anlegen"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Firma">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="z.B. Gasthaus zur Linde GmbH" />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Vorname">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormField>
          <FormField label="Nachname">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="E-Mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Telefon">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
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

        <FormField label="Herkunft">
          <Select value={source} onChange={(e) => setSource(e.target.value as CustomerSource)}>
            {Object.entries(CUSTOMER_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Wird gespeichert …" : isEdit ? "Speichern" : "Kunde anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
