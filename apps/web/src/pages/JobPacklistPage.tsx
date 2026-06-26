import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { PacklistPlanner } from "@/components/jobs/PacklistPlanner";
import { useJob } from "@/hooks/useJobs";
import { useAuth } from "@/auth/AuthProvider";

/**
 * Vollbild-Seite zum Zusammenstellen der Packliste — im Stil der Inventarseite
 * (Sets oben, Geräte nach Kategorie). Das Ausgeben/Zurückgeben passiert danach
 * auf der Jobseite. Über „Fertig" geht es zurück zum Job.
 */
export function JobPacklistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: job, isLoading, error } = useJob(id);

  if (isLoading) return <LoadingState label="Job wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!job) return <ErrorState message="Job nicht gefunden." />;

  const items = job.packlist_items ?? [];
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <Link
        to={`/jobs/${job.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Zurück zum Job
      </Link>

      <PageHeader
        title="Packliste zusammenstellen"
        description={`${job.title} · ${items.length} Posten${totalQty !== items.length ? ` · ${totalQty} Geräte` : ""}`}
        actions={
          <Button onClick={() => navigate(`/jobs/${job.id}`)}>
            <Check size={16} />
            Fertig
          </Button>
        }
      />

      {canEdit("jobs") ? (
        <PacklistPlanner job={job} items={items} />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          Du hast keine Bearbeitungsrechte für Jobs.
        </p>
      )}
    </div>
  );
}
