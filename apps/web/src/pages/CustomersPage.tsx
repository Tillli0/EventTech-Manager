import { useState } from "react";
import { Plus, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CustomerListView } from "@/components/customers/CustomerListView";
import { InquiryPipelineView } from "@/components/customers/InquiryPipelineView";
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog";
import { useAuth } from "@/auth/AuthProvider";

type Tab = "kunden" | "pipeline";

export function CustomersPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("kunden");
  const [tab, setTab] = useState<Tab>("pipeline");
  const [createOpen, setCreateOpen] = useState(false);

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
      </div>

      {tab === "pipeline" ? <InquiryPipelineView /> : <CustomerListView />}

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
