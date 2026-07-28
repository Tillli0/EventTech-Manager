import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { Job, JobService } from "@/types/database";
import { COMPANY_INFO, type CompanyInfo } from "@/lib/companyInfo";
import { formatDate, formatTime } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1a1a1a", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { maxHeight: 56, maxWidth: 180, marginBottom: 8, objectFit: "contain" },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#666" },
  metaBox: { textAlign: "right" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  section: { marginBottom: 16 },
  label: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 3 },
  milestoneRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colTime: { width: "18%" },
  colTitle: { width: "82%" },
  milestoneTitle: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  milestoneNote: { marginTop: 2, fontSize: 9, color: "#444" },
  milestoneCrew: { marginTop: 2, fontSize: 9, color: "#666" },
  serviceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
  },
});

function timeRange(at: string, endAt: string | null, jobStartDate: string): string {
  const startDay = formatDate(jobStartDate);
  const atDay = formatDate(at);
  const dayPrefix = atDay !== startDay ? `${atDay} ` : "";
  if (!endAt) return `${dayPrefix}${formatTime(at)}`;
  const endDay = formatDate(endAt);
  const endPrefix = endDay !== atDay ? `${endDay} ` : "";
  return `${dayPrefix}${formatTime(at)} – ${endPrefix}${formatTime(endAt)}`;
}

function venueBlock(job: Job): string[] {
  const v = job.venue;
  if (!v) return job.location ? [job.location] : [];
  const lines = [v.name];
  if (v.address_street) lines.push(v.address_street);
  const cityLine = [v.address_zip, v.address_city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines;
}

/**
 * Ablaufplan-PDF (P2b) — EIN Dokument, kein zweites: `includeInternal` blendet
 * interne Notizen, Crew-Namen und die Job-Notiz ein (Crew-Blatt) oder aus
 * (Kunden-Blatt), statt zwei Dokumente zu pflegen (E-B).
 */
export function RunSheetPdfDocument({
  job,
  services,
  includeInternal,
  company = COMPANY_INFO,
}: {
  job: Job;
  /** Bereits auf `status === "zugesagt"` gefiltert vom Aufrufer. */
  services: JobService[];
  includeInternal: boolean;
  company?: CompanyInfo;
}) {
  const milestones = [...(job.milestones ?? [])].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <Document title={`Ablaufplan ${job.title}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <Text style={styles.companyName}>{company.name}</Text>
            {company.phone && <Text style={styles.muted}>{company.phone}</Text>}
            {company.email && <Text style={styles.muted}>{company.email}</Text>}
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.title}>Ablaufplan</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{job.title}</Text>
            <Text style={styles.muted}>
              {formatDate(job.start_date)}
              {formatDate(job.end_date) !== formatDate(job.start_date) ? ` – ${formatDate(job.end_date)}` : ""}
            </Text>
          </View>
        </View>

        {venueBlock(job).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Ort</Text>
            {venueBlock(job).map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Programmablauf</Text>
          {milestones.length === 0 ? (
            <Text style={styles.muted}>Noch kein Zeitplan hinterlegt.</Text>
          ) : (
            milestones.map((m) => (
              <View key={m.id} style={styles.milestoneRow} wrap={false}>
                <Text style={styles.colTime}>{timeRange(m.at, m.end_at, job.start_date)}</Text>
                <View style={styles.colTitle}>
                  <Text style={styles.milestoneTitle}>{m.title}</Text>
                  {includeInternal && m.notes && <Text style={styles.milestoneNote}>{m.notes}</Text>}
                  {includeInternal && (m.assignees?.length ?? 0) > 0 && (
                    <Text style={styles.milestoneCrew}>
                      {m.assignees!.map((a) => a.profile?.full_name).filter(Boolean).join(", ")}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Zugesagte Fremdgewerke</Text>
            {services.map((s) => (
              <View key={s.id} style={styles.serviceRow}>
                <Text>
                  {s.supplier?.name ?? "Partner"}
                  {s.supplier?.trade ? ` (${s.supplier.trade})` : ""}
                  {includeInternal && s.supplier?.phone ? ` · ${s.supplier.phone}` : ""}
                </Text>
                <Text style={styles.muted}>{s.on_site_at ? formatTime(s.on_site_at) : "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {includeInternal && job.notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Job-Notiz</Text>
            <Text>{job.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            {company.name}
            {company.phone ? ` · ${company.phone}` : ""}
            {company.email ? ` · ${company.email}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
