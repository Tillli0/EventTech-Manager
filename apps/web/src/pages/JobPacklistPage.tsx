import { useParams } from "react-router-dom";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { InventoryPage } from "@/pages/InventoryPage";
import { useJob } from "@/hooks/useJobs";

/**
 * Packliste zusammenstellen = die echte Inventarseite im „Auswahl-Modus".
 * Lädt den Job und rendert die Inventarseite 1:1, nur mit Hinzufügen-/Mengen-
 * Steuerung pro Gerät und Sets oben. Ausgeben/Rückgabe passiert auf der Jobseite.
 */
export function JobPacklistPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, error } = useJob(id);

  if (isLoading) return <LoadingState label="Job wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!job) return <ErrorState message="Job nicht gefunden." />;

  return <InventoryPage packlistJob={job} />;
}
