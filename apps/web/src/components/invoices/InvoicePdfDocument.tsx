import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { Invoice } from "@/types/database";
import { offerItemTotal, offerTotals, invoicePaidSum } from "@/types/database";
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
  draftBanner: {
    marginBottom: 16,
    padding: 6,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    color: "#992222",
    borderWidth: 1,
    borderColor: "#992222",
  },
  stornoBanner: {
    marginBottom: 16,
    padding: 6,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    color: "#992222",
  },
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

/**
 * Adresszeilen: bevorzugt der beim Stellen eingefrorene Snapshot; bei Entwürfen
 * (noch kein Snapshot) die aktuellen Kundendaten.
 */
function customerBlock(invoice: Invoice): string[] {
  if (invoice.address_snapshot) return invoice.address_snapshot.split("\n");
  const c = invoice.customer;
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

export function InvoicePdfDocument({ invoice, company = COMPANY_INFO }: { invoice: Invoice; company?: CompanyInfo }) {
  const items = invoice.items ?? [];
  const { net, tax, gross } = offerTotals(items, invoice.tax_rate);
  const paid = invoicePaidSum(invoice.payments);
  const open = Math.max(0, gross - paid);
  const isDraft = invoice.status === "entwurf";
  const isStorno = invoice.status === "storniert";
  const docTitle = isDraft ? "Rechnungsentwurf" : `Rechnung ${invoice.invoice_number}`;

  return (
    <Document title={docTitle}>
      <Page size="A4" style={styles.page}>
        {isDraft && <Text style={styles.draftBanner}>ENTWURF — keine gültige Rechnung</Text>}
        {isStorno && <Text style={styles.stornoBanner}>STORNIERT</Text>}

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
            <Text style={styles.title}>Rechnung</Text>
            <Text style={styles.muted}>{invoice.invoice_number ?? "Entwurf"}</Text>
            <Text style={styles.muted}>Rechnungsdatum: {formatDate(invoice.invoice_date ?? invoice.created_at)}</Text>
            {invoice.service_date && (
              <Text style={styles.muted}>Leistungsdatum: {formatDate(invoice.service_date)}</Text>
            )}
            {invoice.due_date && <Text style={styles.muted}>Zahlbar bis: {formatDate(invoice.due_date)}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Rechnungsempfänger</Text>
          {customerBlock(invoice).map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Betreff</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{invoice.title}</Text>
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
            <Text style={styles.muted}>zzgl. {invoice.tax_rate} % USt.</Text>
            <Text>{formatCurrency(tax)}</Text>
          </View>
          <View style={styles.totalsGrand}>
            <Text>Rechnungsbetrag</Text>
            <Text>{formatCurrency(gross)}</Text>
          </View>
          {paid > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.muted}>Bereits gezahlt</Text>
                <Text>−{formatCurrency(paid)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Offener Betrag</Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatCurrency(open)}</Text>
              </View>
            </>
          )}
        </View>

        {invoice.due_date && open > 0 && !isStorno && (
          <View style={styles.notes}>
            <Text>
              Bitte überweisen Sie den offenen Betrag bis zum {formatDate(invoice.due_date)} auf das unten
              genannte Konto.
            </Text>
          </View>
        )}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>Anmerkungen</Text>
            <Text>{invoice.notes}</Text>
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
