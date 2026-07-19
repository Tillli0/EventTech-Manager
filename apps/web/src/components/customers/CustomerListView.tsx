import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Download, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StammkundeBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useCustomers, useCustomerJobCounts } from "@/hooks/useCustomers";
import { CUSTOMER_SOURCE_LABELS, isStammkunde, type Customer, type CustomerSource } from "@/types/database";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";

// Literal Klassennamen (nicht interpoliert), damit Tailwinds JIT sie findet.
const SOURCE_TONE: Record<CustomerSource, string> = {
  whatsapp: "bg-status-verfuegbar/15 text-status-verfuegbar",
  instagram: "bg-job-planung/15 text-job-planung",
  email: "bg-status-ausgeliehen/15 text-status-ausgeliehen",
  kontaktformular: "bg-accent/15 text-accent",
  telefon: "bg-status-wartung/15 text-status-wartung",
  sonstiges: "bg-bg-raised text-ink-muted",
};

function customerName(c: Pick<Customer, "company_name" | "first_name" | "last_name">): string {
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ");
}

export function CustomerListView() {
  const { data: customers, isLoading, error } = useCustomers();
  const { data: jobCounts } = useCustomerJobCounts();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!customers) return [];
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const name = customerName(c).toLowerCase();
      return name.includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
    });
  }, [customers, search]);

  function handleExport() {
    exportToCsv(
      `kunden-${new Date().toISOString().slice(0, 10)}`,
      [
        { label: "Name", value: (c: Customer) => customerName(c) },
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
        <div className="space-y-2">
          {filtered.map((customer) => {
            const name = customerName(customer);
            const jobCount = jobCounts?.get(customer.id) ?? 0;
            const stammkunde = isStammkunde(customer, jobCount);
            return (
              <Link key={customer.id} to={`/kunden/${customer.id}`}>
                <Card className="flex items-center gap-3 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-accent/40">
                  <Avatar
                    label={name || "?"}
                    size="lg"
                    className={cn("font-medium", stammkunde && "bg-status-wartung/15 text-status-wartung")}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{name}</span>
                      {stammkunde && <StammkundeBadge />}
                    </div>
                    {customer.company_name && (customer.first_name || customer.last_name) && (
                      <p className="text-xs text-ink-faint">
                        {[customer.first_name, customer.last_name].filter(Boolean).join(" ")}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {customer.email}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {customer.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="hidden shrink-0 text-xs text-ink-faint sm:block">
                    {jobCount} {jobCount === 1 ? "Job" : "Jobs"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      SOURCE_TONE[customer.source],
                    )}
                  >
                    {CUSTOMER_SOURCE_LABELS[customer.source]}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
