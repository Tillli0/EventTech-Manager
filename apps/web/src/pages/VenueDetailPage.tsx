import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, User, Truck, ParkingSquare, Zap, Info, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useVenue, useVenueJobs, useDeleteVenue } from "@/hooks/useVenues";
import { CreateVenueDialog } from "@/components/venues/CreateVenueDialog";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const mayEdit = canEdit("jobs");
  const { data: venue, isLoading, error } = useVenue(id);
  const { data: jobs } = useVenueJobs(id);
  const deleteVenue = useDeleteVenue();
  const confirm = useConfirm();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <LoadingState label="Ort wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!venue) return <ErrorState message="Ort nicht gefunden." />;

  const address = [venue.address_street, [venue.address_zip, venue.address_city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  async function handleDelete(current: NonNullable<typeof venue>) {
    const ok = await confirm({
      title: "Ort löschen?",
      message: `„${current.name}" wird gelöscht. Jobs an diesem Ort bleiben erhalten, verlieren aber die Verknüpfung.`,
      confirmLabel: "Ort löschen",
      danger: true,
    });
    if (!ok) return;
    await deleteVenue.mutateAsync(current.id);
    toast.success("Ort gelöscht.");
    navigate("/orte");
  }

  return (
    <div>
      <Link to="/orte" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Zurück zu Orten
      </Link>

      <PageHeader title={venue.name} description={address || undefined} />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Jobs an diesem Ort</h2>
            </CardHeader>
            <CardBody>
              {jobs && jobs.length > 0 ? (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 hover:border-accent/40"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{job.title}</p>
                        <p className="text-xs text-ink-muted">{formatDate(job.start_date)}</p>
                      </div>
                      <JobStatusBadge status={job.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">Noch keine Jobs an diesem Ort.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Praxis-Infos</h2>
              {mayEdit && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                    <Pencil size={14} />
                    Bearbeiten
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(venue)}
                    disabled={deleteVenue.isPending}
                    aria-label="Ort löschen"
                    title="Ort löschen"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              {address && (
                <div className="flex items-start gap-2 text-ink-muted">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span>{address}</span>
                </div>
              )}
              {venue.contact_person && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <User size={14} className="shrink-0" />
                  <span>{venue.contact_person}</span>
                </div>
              )}
              {venue.contact_phone && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <Phone size={14} className="shrink-0" />
                  <a href={`tel:${venue.contact_phone}`} className="hover:text-ink">
                    {venue.contact_phone}
                  </a>
                </div>
              )}
              {venue.access_notes && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                    <Truck size={12} />
                    Zufahrt
                  </p>
                  <p className="whitespace-pre-wrap text-ink">{venue.access_notes}</p>
                </div>
              )}
              {venue.parking_notes && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                    <ParkingSquare size={12} />
                    Parken
                  </p>
                  <p className="whitespace-pre-wrap text-ink">{venue.parking_notes}</p>
                </div>
              )}
              {venue.power_notes && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                    <Zap size={12} />
                    Strom
                  </p>
                  <p className="whitespace-pre-wrap text-ink">{venue.power_notes}</p>
                </div>
              )}
              {venue.special_notes && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                    <Info size={12} />
                    Besonderheiten
                  </p>
                  <p className="whitespace-pre-wrap text-ink">{venue.special_notes}</p>
                </div>
              )}
              {!address &&
                !venue.contact_person &&
                !venue.contact_phone &&
                !venue.access_notes &&
                !venue.parking_notes &&
                !venue.power_notes &&
                !venue.special_notes && <p className="text-ink-faint">Noch keine Praxis-Infos hinterlegt.</p>}
            </CardBody>
          </Card>
        </div>
      </div>

      <CreateVenueDialog open={editOpen} onClose={() => setEditOpen(false)} editVenue={venue} />
    </div>
  );
}
