import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { VenueListView } from "@/components/venues/VenueListView";
import { CreateVenueDialog } from "@/components/venues/CreateVenueDialog";
import { useAuth } from "@/auth/AuthProvider";

export function VenuesPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("jobs");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Orte"
        description="Veranstaltungsorte mit Zufahrt, Parken, Strom und Ansprechpartner — einmal erfasst, beim nächsten Job am selben Ort sofort wieder da."
        actions={
          mayEdit ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Ort anlegen
            </Button>
          ) : undefined
        }
      />

      <VenueListView />

      <CreateVenueDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
