import { Tabs } from "@/components/ui/Tabs";
import type { YearValue } from "@/lib/listGrouping";

/**
 * Jahr-Umschalter fürs Archiv: Jahre kommen aus den Daten (availableYears),
 * Standard setzt die Seite (laufendes Jahr). Blendet sich aus, solange es
 * höchstens ein Jahr gibt — dann gäbe es nichts umzuschalten.
 */
export function YearFilter({
  years,
  value,
  onChange,
  className,
}: {
  years: number[];
  value: YearValue;
  onChange: (value: YearValue) => void;
  className?: string;
}) {
  if (years.length <= 1) return null;
  return (
    <Tabs<YearValue>
      size="sm"
      className={className}
      options={[...years.map((y) => ({ value: y as YearValue, label: String(y) })), { value: "alle", label: "Alle" }]}
      value={value}
      onChange={onChange}
    />
  );
}
