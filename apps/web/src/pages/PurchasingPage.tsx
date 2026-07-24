import { useState } from "react";
import { Plus, Truck, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/States";
import { SupplierListView } from "@/components/suppliers/SupplierListView";
import { CreateSupplierDialog } from "@/components/suppliers/CreateSupplierDialog";
import { useAuth } from "@/auth/AuthProvider";

type Tab = "anmietungen" | "partner";

export function PurchasingPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("anmietung");
  const [tab, setTab] = useState<Tab>("anmietungen");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Anmietung"
        actions={
          mayEdit && tab === "partner" ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Partner anlegen
            </Button>
          ) : undefined
        }
      />

      <Tabs<Tab>
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: "anmietungen", icon: Package, label: "Anmietungen" },
          { value: "partner", icon: Truck, label: "Verleih-Partner" },
        ]}
      />

      {tab === "anmietungen" && (
        <EmptyState
          icon={Package}
          title="Anmiet-Vorgänge kommen noch"
          description="Vorgänge mit Status, Positionen und Bestell-PDF folgen in der nächsten Etappe."
        />
      )}
      {tab === "partner" && <SupplierListView />}

      <CreateSupplierDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
