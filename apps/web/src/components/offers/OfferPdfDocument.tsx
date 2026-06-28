import { Document, Page, View, Text, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Offer } from "@/types/database";
import { offerItemTotal, offerTotals } from "@/types/database";
import { COMPANY_INFO, type CompanyInfo } from "@/lib/companyInfo";
import { fetchCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency, formatDate } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1a1a1a", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
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
  colPos: { width: "5%" },
  colDesc: { width: "39%" },
  colQty: { width: "12%", textAlign: "right" },
  colDays: { width: "12%", textAlign: "right" },
  colPrice: { width: "16%", textAlign: "right" },
  colSum: { width: "16%", textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "auto", width: "45%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
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

function customerBlock(offer: Offer): string[] {
  const c = offer.customer;
  if (!c) return ["—"];
  const lines: string[] = [];
  const name = c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ");
  if (name) lines.push(name);
  if (c.company_name && (c.first_name || c.last_name)) {
    lines.push([c.first_name, c.last_name].filter(Boolean).join(" "));
  }
  if (c.address_street) lines.push(c.address_street);
  const cityLine = [c.address_zip, c.address_city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines.length > 0 ? lines : ["—"];
}

export function OfferPdfDocument({ offer, company = COMPANY_INFO }: { offer: Offer; company?: CompanyInfo }) {
  const items = offer.items ?? [];
  const { net, tax, gross } = offerTotals(items, offer.tax_rate);

  return (
    <Document title={`Angebot ${offer.offer_number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
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
            <Text style={styles.title}>Angebot</Text>
            <Text style={styles.muted}>{offer.offer_number}</Text>
            <Text style={styles.muted}>Datum: {formatDate(offer.created_at)}</Text>
            {offer.valid_until && <Text style={styles.muted}>Gültig bis: {formatDate(offer.valid_until)}</Text>}
            {offer.event_date && <Text style={styles.muted}>Eventdatum: {formatDate(offer.event_date)}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Kunde</Text>
          {customerBlock(offer).map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Betreff</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{offer.title}</Text>
        </View>

        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.colPos}>#</Text>
            <Text style={styles.colDesc}>Position</Text>
            <Text style={styles.colQty}>Menge</Text>
            <Text style={styles.colDays}>Tage</Text>
            <Text style={styles.colPrice}>Einzel/Tag</Text>
            <Text style={styles.colSum}>Summe</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={styles.colPos}>{i + 1}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colDays}>{item.rental_days}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unit_price)}</Text>
              <Text style={styles.colSum}>{formatCurrency(offerItemTotal(item))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Netto</Text>
            <Text>{formatCurrency(net)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>zzgl. {offer.tax_rate} % MwSt.</Text>
            <Text>{formatCurrency(tax)}</Text>
          </View>
          <View style={styles.totalsGrand}>
            <Text>Gesamt</Text>
            <Text>{formatCurrency(gross)}</Text>
          </View>
        </View>

        {offer.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>Anmerkungen</Text>
            <Text>{offer.notes}</Text>
          </View>
        )}
        {company.paymentTerms && (
          <View style={styles.notes}>
            <Text>{company.paymentTerms}</Text>
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

/** Erzeugt das Angebots-PDF und löst den Download aus (Muster wie lib/ics.ts). */
export async function downloadOfferPdf(offer: Offer) {
  const company = await fetchCompanySettings();
  const blob = await pdf(<OfferPdfDocument offer={offer} company={company} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Angebot-${offer.offer_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
