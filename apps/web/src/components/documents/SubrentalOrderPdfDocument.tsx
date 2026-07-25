import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { Subrental } from "@/types/database";
import { subrentalItemTotal, subrentalTotals } from "@/lib/subrentals";
import { SUBRENTAL_LOGISTICS_OPTIONS } from "@/lib/subrentals";
import { COMPANY_INFO, type CompanyInfo } from "@/lib/companyInfo";
import { formatCurrency, formatDate } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1a1a1a", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  logo: { maxHeight: 56, maxWidth: 180, marginBottom: 8, objectFit: "contain" },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#666" },
  metaBox: { textAlign: "right" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  section: { marginBottom: 18 },
  label: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 3 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  colPos: { width: "6%" },
  colDesc: { width: "48%" },
  colQty: { width: "14%", textAlign: "right" },
  colPrice: { width: "16%", textAlign: "right" },
  colSum: { width: "16%", textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "auto", width: "45%" },
  totalsGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  notes: { marginTop: 24, fontSize: 9, color: "#444" },
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

function supplierBlock(subrental: Subrental): string[] {
  const s = subrental.supplier;
  if (!s) return ["—"];
  const lines: string[] = [s.name];
  if (s.contact_person) lines.push(s.contact_person);
  if (s.street) lines.push(s.street);
  const cityLine = [s.zip, s.city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines;
}

export function SubrentalOrderPdfDocument({
  subrental,
  company = COMPANY_INFO,
}: {
  subrental: Subrental;
  company?: CompanyInfo;
}) {
  const items = subrental.items ?? [];
  const { total } = subrentalTotals(items);
  const logisticsLabel = SUBRENTAL_LOGISTICS_OPTIONS.find((o) => o.value === subrental.logistics)?.label;

  return (
    <Document title={`Mietanfrage ${subrental.order_number ?? ""}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <Text style={styles.companyName}>{company.name}</Text>
            {company.addressLines.map((line, i) => (
              <Text key={i} style={styles.muted}>
                {line}
              </Text>
            ))}
            {company.phone && <Text style={styles.muted}>{company.phone}</Text>}
            {company.email && <Text style={styles.muted}>{company.email}</Text>}
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.title}>Mietanfrage</Text>
            <Text style={styles.muted}>{subrental.order_number}</Text>
            <Text style={styles.muted}>Datum: {formatDate(subrental.created_at)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>An</Text>
          {supplierBlock(subrental).map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Zeitraum</Text>
          <Text>
            {formatDate(subrental.start_date)} – {formatDate(subrental.end_date)}
          </Text>
          <Text style={styles.label}>Logistik</Text>
          <Text>{logisticsLabel}</Text>
        </View>

        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.colPos}>#</Text>
            <Text style={styles.colDesc}>Position</Text>
            <Text style={styles.colQty}>Menge</Text>
            <Text style={styles.colPrice}>Einzel</Text>
            <Text style={styles.colSum}>Summe</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={styles.colPos}>{i + 1}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unit_cost)}</Text>
              <Text style={styles.colSum}>{formatCurrency(subrentalItemTotal(item))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsGrand}>
            <Text>Netto-Summe</Text>
            <Text>{formatCurrency(total)}</Text>
          </View>
        </View>

        {subrental.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>Anmerkungen</Text>
            <Text>{subrental.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            {company.name}
            {company.taxId ? ` · USt-IdNr. ${company.taxId}` : ""}
            {company.bankLine ? ` · ${company.bankLine}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
