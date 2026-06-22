import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Download } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StammkundeBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useCustomers, useCustomerJobCounts } from "@/hooks/useCustomers";
import { CUSTOMER_SOURCE_LABELS, isStammkunde, type Customer } from "@/types/database";
import { exportToCsv } from "@/lib/csv";

export function CustomerListView() {
  const { data: customers, isLoading, error } = useCustomers();
  const { data: jobCounts } = useCustomerJobCounts();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!customers) return [];
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const name = [c.company_name, c.first_name, c.last_name].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
    });
  }, [customers, search]);

  function handleExport() {
    const name = (c: Customer) =>
      c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ");
    exportToCsv(
      `kunden-${new Date().toISOString().slice(0, 10)}`,
      [
        { label: "Name", value: (c: Customer) => name(c) },
        { label: "Firma", value: (c: Customer) => c.company_name },
        { label: "Vorname", value: (c: Customer) => c.first_name },
        { label: "Nachname", value: (c: Customer) => c.last_name },
        { label: "E-Mail", value: (c: Customer) => c.email },
        { label: "Telefon", value: (c: Customer) => c.phone },
        { label: "PLZ", value: (c: Customer) => c.address_zip },
        { label: "Ort", value: (c: Customer) => c.address_city },
        { label: "Herkunft", value: (c: Customer) => CUSTOMER_SOURCE_LABELS[c.source] },
      ],
      filtered,
    );
  }

  if (isLoading) return <LoadingState label="Kunden werden geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, E-Mail oder Telefon …"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={filtered.length === 0}>
          <Download size={16} />
          CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Keine Kunden gefunden" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Kontakt</th>
                <th className="px-4 py-3 font-medium">Herkunft</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-bg-raised">
                  <td className="px-4 py-3">
                    <Link to={`/kunden/${customer.id}`} className="flex items-center gap-2 font-medium text-ink">
                      <span>
                        {customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")}
                      </span>
                      {isStammkunde(customer, jobCounts?.get(customer.id) ?? 0) && <StammkundeBadge />}
                    </Link>
                    {customer.company_name && (customer.first_name || customer.last_name) && (
                      <p className="text-xs text-ink-muted">
                        {[customer.first_name, customer.last_name].filter(Boolean).join(" ")}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">
                    <p>{customer.email ?? "—"}</p>
                    <p className="text-xs">{customer.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-bg-raised px-2.5 py-1 text-xs text-ink-muted">
                      {CUSTOMER_SOURCE_LABELS[customer.source]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
