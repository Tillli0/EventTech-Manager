import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";

/**
 * Rendert einen Code128-Barcode als Canvas. Wird für die Druckvorschau
 * von Geräte-Labels verwendet (z.B. 40x20mm Etiketten).
 */
export function BarcodeLabel({
  code,
  deviceName,
  className,
}: {
  code: string;
  deviceName?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: "code128",
        text: code,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      });
    } catch (err) {
      console.error("Barcode konnte nicht gerendert werden:", err);
    }
  }, [code]);

  return (
    <div
      className={className}
      style={{
        width: "40mm",
        height: "20mm",
        background: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2mm",
        boxSizing: "border-box",
      }}
    >
      {deviceName && (
        <p
          style={{
            fontSize: "7pt",
            color: "#000",
            margin: 0,
            marginBottom: "1mm",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {deviceName}
        </p>
      )}
      <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />
    </div>
  );
}

/** Öffnet einen Druckdialog mit einer Reihe von Labels (z.B. mehrere Geräte gleichzeitig drucken) */
export function printBarcodeLabels(items: { code: string; deviceName: string }[]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const labelsHtml = items
    .map(
      (item) => `
      <div class="label">
        <p class="device-name">${escapeHtml(item.deviceName)}</p>
        <svg class="barcode" data-code="${escapeHtml(item.code)}"></svg>
      </div>
    `,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Etiketten drucken</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/bwip-js/4.5.1/bwip-js-min.js"></script>
        <style>
          @page { margin: 4mm; }
          body { margin: 0; font-family: sans-serif; }
          .label {
            width: 40mm;
            height: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
            margin-bottom: 2mm;
          }
          .device-name {
            font-size: 7pt;
            margin: 0 0 1mm 0;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = () => {
            document.querySelectorAll('.barcode').forEach((el) => {
              BWIPJS.toSVG(el, { bcid: 'code128', text: el.dataset.code, scale: 2, height: 10, includetext: true, textxalign: 'center' });
            });
            setTimeout(() => window.print(), 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
