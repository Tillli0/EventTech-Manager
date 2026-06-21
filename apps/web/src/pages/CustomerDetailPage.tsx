import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useCustomer, useCustomerNotes, useCustomerJobs, useAddCustomerNote } from "@/hooks/useCustomers";
import { CUSTOMER_SOURCE_LABELS } from "@/types/database";
import { formatDate, formatDateTime } from "@/lib/format";
import { JobStatusBadge } from "@/components/ui/StatusBadge";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading, error } = useCustomer(id);
  const { data: notes } = useCustomerNotes(id);
  const { data: jobs } = useCustomerJobs(id);
  const addNote = useAddCustomerNote();
  const [noteContent, setNoteContent] = useState("");

  if (isLoading) return <LoadingState label="Kunde wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!customer) return <ErrorState message="Kunde nicht gefunden." />;

  const displayName =
    customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  const subName =
    customer.company_name && (customer.first_name || customer.last_name)
      ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
      : undefined;

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim() || !id) return;
    await addNote.mutateAsync({ customerId: id, content: noteContent.trim() });
    setNoteContent("");
  }

  return (
    <div>
      <Link to="/kunden" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Zurück zu Kunden
      </Link>

      <PageHeader title={displayName} description={subName} />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Verlauf & Notizen</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Notiz hinzufügen …"
                  rows={2}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={addNote.isPending}>
                  <Send size={16} />
                </Button>
              </form>

              {notes && notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-md border border-border bg-bg-raised px-3 py-2.5">
                      <p className="text-sm text-ink">{note.content}</p>
                      <p className="mt-1 text-xs text-ink-faint">{formatDateTime(note.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">Noch keine Notizen vorhanden.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Jobs</h2>
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
                <p className="text-sm text-ink-faint">Noch keine Jobs für diesen Kunden.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Kontaktdaten</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              {customer.email && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <Mail size={14} />
                  <a href={`mailto:${customer.email}`} className="hover:text-ink">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <Phone size={14} />
                  <a href={`tel:${customer.phone}`} className="hover:text-ink">
                    {customer.phone}
                  </a>
                </div>
              )}
              {(customer.address_street || customer.address_city) && (
                <div className="flex items-start gap-2 text-ink-muted">
                  <MapPin size={14} className="mt-0.5" />
                  <span>
                    {customer.address_street}
                    {customer.address_street && <br />}
                    {customer.address_zip} {customer.address_city}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <p className="text-xs text-ink-faint">Herkunft</p>
                <p className="mt-0.5 text-ink">{CUSTOMER_SOURCE_LABELS[customer.source]}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
