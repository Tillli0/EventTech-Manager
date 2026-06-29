import { useState } from "react";
import { Plus, Users as UsersIcon, Globe } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CustomerListView } from "@/components/customers/CustomerListView";
import { InquiryPipelineView } from "@/components/customers/InquiryPipelineView";
import { WebsiteLeadsView } from "@/components/customers/WebsiteLeadsView";
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog";
import { useNewWebsiteLeadCount } from "@/hooks/useWebsiteLeads";
import { useAuth } from "@/auth/AuthProvider";

type Tab = "kunden" | "pipeline" | "leads";

export function CustomersPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("kunden");
  const [tab, setTab] = useState<Tab>("pipeline");
  const [createOpen, setCreateOpen] = useState(false);
  const newLeadCount = useNewWebsiteLeadCount();

  return (
    <div>
      <PageHeader
        title="Kunden"
        actions={
          mayEdit ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Kunde anlegen
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex gap-1 rounded-md bg-bg-raised p-1 w-fit">
        <TabButton active={tab === "pipeline"} onClick={() => setTab("pipeline")}>
          Anfragen-Pipeline
        </TabButton>
        <TabButton active={tab === "kunden"} onClick={() => setTab("kunden")}>
          <UsersIcon size={14} />
          Alle Kunden
        </TabButton>
        <TabButton active={tab === "leads"} onClick={() => setTab("leads")}>
          <Globe size={14} />
          Website-Anfragen
          {newLeadCount > 0 && (
            <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-white">
              {newLeadCount}
            </span>
          )}
        </TabButton>
      </div>

      {tab === "pipeline" && <InquiryPipelineView />}
      {tab === "kunden" && <CustomerListView />}
      {tab === "leads" && <WebsiteLeadsView />}

      <CreateCustomerDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
