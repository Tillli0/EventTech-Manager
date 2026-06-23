import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Send, Plus, Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import {
  useCustomer,
  useCustomerNotes,
  useCustomerJobs,
  useAddCustomerNote,
  useCustomerJobCounts,
  useUpdateCustomer,
} from "@/hooks/useCustomers";
import { useOffersForCustomer, fetchOfferWithItems } from "@/hooks/useOffers";
import { CUSTOMER_SOURCE_LABELS, isStammkunde, offerTotals } from "@/types/database";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/format";
import { JobStatusBadge, OfferStatusBadge, StammkundeBadge } from "@/components/ui/StatusBadge";
import { downloadOfferPdf } from "@/components/offers/OfferPdfDocument";
import { CreateOfferDialog } from "@/components/offers/CreateOfferDialog";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canEdit } = useAuth();
  const mayEditCustomers = canEdit("kunden");
  const mayEditOffers = canEdit("angebote");
  const { data: customer, isLoading, error } = useCustomer(id);
  const { data: notes } = useCustomerNotes(id);
  const { data: jobs } = useCustomerJobs(id);
  const { data: jobCounts } = useCustomerJobCounts();
  const { data: offers } = useOffersForCustomer(id);
  const addNote = useAddCustomerNote();
  const updateCustomer = useUpdateCustomer();
  const [noteContent, setNoteContent] = useState("");
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (isLoading) return <LoadingState label="Kunde wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!customer) return <ErrorState message="Kunde nicht gefunden." />;

  const jobCount = (id && jobCounts?.get(id)) || 0;
  const stammkunde = isStammkunde(customer, jobCount);

  async function handleDownloadOffer(offerId: string) {
    setDownloadingId(offerId);
    try {
      const offer = await fetchOfferWithItems(offerId);
      await downloadOfferPdf(offer);
    } catch (err) {
      console.error("PDF konnte nicht erzeugt werden:", err);
      alert("Das PDF konnte nicht erzeugt werden.");
    } finally {
      setDownloadingId(null);
    }
  }

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

      <PageHeader
        title={displayName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {subName && <span>{subName}</span>}
            {stammkunde && <StammkundeBadge />}
          </span>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Verlauf & Notizen</h2>
            </CardHeader>
            <CardBody>
              {mayEditCustomers && (
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
              )}

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

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Angebote</h2>
              {mayEditOffers && (
                <Button size="sm" variant="secondary" onClick={() => setCreateOfferOpen(true)}>
                  <Plus size={14} />
                  Neues Angebot
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {offers && offers.length > 0 ? (
                <div className="space-y-2">
                  {offers.map((offer) => {
                    const { gross } = offerTotals(offer.items ?? [], offer.tax_rate);
                    return (
                      <div
                        key={offer.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{offer.title}</p>
                          <p className="font-mono text-xs text-ink-muted">
                            {offer.offer_number} · {formatCurrency(gross)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <OfferStatusBadge status={offer.status} />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownloadOffer(offer.id)}
                            disabled={downloadingId === offer.id}
                          >
                            <Download size={14} />
                            {downloadingId === offer.id ? "…" : "PDF"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-faint">
                  <FileText size={14} />
                  Noch keine Angebote für diesen Kunden.
                </p>
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
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-faint">Stammkunde</p>
                  {stammkunde && <StammkundeBadge />}
                </div>
                {mayEditCustomers && (
                  <div className="mt-2 flex gap-1 rounded-md bg-bg-raised p-1">
                    {(
                      [
                        { value: null, label: "Automatisch" },
                        { value: true, label: "Immer" },
                        { value: false, label: "Nie" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => updateCustomer.mutate({ id: customer.id, is_stammkunde: opt.value })}
                        className={cn(
                          "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                          customer.is_stammkunde === opt.value
                            ? "bg-bg-surface text-ink shadow-sm"
                            : "text-ink-muted hover:text-ink",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {mayEditCustomers && customer.is_stammkunde === null && (
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Automatisch ab 2 nicht-stornierten Jobs ({jobCount} vorhanden).
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <CreateOfferDialog
        open={createOfferOpen}
        onClose={() => setCreateOfferOpen(false)}
        presetCustomerId={customer.id}
      />
    </div>
  );
}
