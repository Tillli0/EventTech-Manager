import { useState } from "react";
import { Plus, Users as UsersIcon, Globe } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { CustomerListView } from "@/components/customers/CustomerListView";
import { WebsiteLeadsView } from "@/components/customers/WebsiteLeadsView";
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog";
import { useNewWebsiteLeadCount } from "@/hooks/useWebsiteLeads";
import { useAuth } from "@/auth/AuthProvider";

type Tab = "leads" | "kunden";

export function CustomersPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("kunden");
  const [tab, setTab] = useState<Tab>("leads");
  const [createOpen, setCreateOpen] = useState(false);
  const newLeadCount = useNewWebsiteLeadCount();

  return (
    <div>
      <PageHeader
        title="Anfragen / Kunden"
        actions={
          mayEdit ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Kunde anlegen
            </Button>
          ) : undefined
        }
      />

      <Tabs<Tab>
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          {
            value: "leads",
            icon: Globe,
            label: (
              <>
                Website-Anfragen
                {newLeadCount > 0 && (
                  <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-on">
                    {newLeadCount}
                  </span>
                )}
              </>
            ),
          },
          { value: "kunden", icon: UsersIcon, label: "Alle Kunden" },
        ]}
      />

      {tab === "leads" && <WebsiteLeadsView />}
      {tab === "kunden" && <CustomerListView />}

      <CreateCustomerDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
