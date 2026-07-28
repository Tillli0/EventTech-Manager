import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Download, Phone } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useVenues } from "@/hooks/useVenues";
import type { Venue } from "@/types/database";
import { exportToCsv } from "@/lib/csv";

function venueAddress(v: Venue): string {
  return [v.address_street, [v.address_zip, v.address_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function VenueListView() {
  const { data: venues, isLoading, error } = useVenues();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!venues) return [];
    if (!search.trim()) return venues;
    const q = search.toLowerCase();
    return venues.filter((v) => v.name.toLowerCase().includes(q) || venueAddress(v).toLowerCase().includes(q));
  }, [venues, search]);

  function handleExport() {
    exportToCsv(
      `orte-${new Date().toISOString().slice(0, 10)}`,
      [
        { label: "Name", value: (v: Venue) => v.name },
        { label: "Straße", value: (v: Venue) => v.address_street },
        { label: "PLZ", value: (v: Venue) => v.address_zip },
        { label: "Ort", value: (v: Venue) => v.address_city },
        { label: "Ansprechpartner", value: (v: Venue) => v.contact_person },
        { label: "Telefon", value: (v: Venue) => v.contact_phone },
      ],
      filtered,
    );
  }

  if (isLoading) return <LoadingState label="Orte werden geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name oder Adresse …"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={filtered.length === 0}>
          <Download size={16} />
          CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="Keine Orte gefunden" />
      ) : (
        <div className="space-y-2">
          {filtered.map((venue) => (
            <Link key={venue.id} to={`/orte/${venue.id}`}>
              <Card className="flex items-center gap-3 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-accent/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{venue.name}</p>
                  {venueAddress(venue) && <p className="text-xs text-ink-muted">{venueAddress(venue)}</p>}
                </div>
                {venue.contact_phone && (
                  <span className="hidden shrink-0 items-center gap-1 text-xs text-ink-faint sm:flex">
                    <Phone size={12} />
                    {venue.contact_phone}
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
