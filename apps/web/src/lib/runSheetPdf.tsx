import type { Job } from "@/types/database";
import { fetchCompanySettings } from "@/hooks/useCompanySettings";
import { fetchJobServicesForJob } from "@/hooks/useJobServices";

/**
 * Rendert das Ablaufplan-PDF als Blob. Lädt die schwere PDF-Bibliothek
 * (`@react-pdf/renderer`) und das Dokument **dynamisch** nach (Muster offerPdf).
 */
export async function renderRunSheetPdfBlob(job: Job, includeInternal: boolean): Promise<Blob> {
  const [{ pdf }, { RunSheetPdfDocument }, company, allServices] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/jobs/RunSheetPdfDocument"),
    fetchCompanySettings(),
    fetchJobServicesForJob(job.id),
  ]);
  const services = allServices.filter((s) => s.status === "zugesagt");
  return pdf(<RunSheetPdfDocument job={job} services={services} includeInternal={includeInternal} company={company} />).toBlob();
}

/** Erzeugt das Ablaufplan-PDF und löst den Download aus. */
export async function downloadRunSheetPdf(job: Job, includeInternal: boolean) {
  const blob = await renderRunSheetPdfBlob(job, includeInternal);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ablaufplan-${job.title.replace(/[^\w-]+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
