import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useCustomers } from "@/hooks/useCustomers";
import { CUSTOMER_SOURCE_LABELS } from "@/types/database";

export function CustomerListView() {
  const { data: customers, isLoading, error } = useCustomers();
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

  if (isLoading) return <LoadingState label="Kunden werden geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche nach Name, E-Mail oder Telefon …"
          className="pl-9"
        />
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
                    <Link to={`/kunden/${customer.id}`} className="block font-medium text-ink">
                      {customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")}
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
