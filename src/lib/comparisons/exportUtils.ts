"use client";

// PNG/CSV export for comparison charts — native browser APIs only
// (XMLSerializer, Canvas, Blob), no new dependency.

import type { ChartPoint } from "./comparisonTransforms";
import type { ComparisonSeriesConfig } from "./comparisonRegistry";

export function exportChartAsPng(container: HTMLElement, filename: string, backgroundColor: string): void {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const width = rect.width || 800;
  const height = rect.height || 280;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2; // export at 2x for crisper PNGs
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.scale(scale, scale);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

export function exportChartAsCsv(
  data: ChartPoint[],
  seriesA: ComparisonSeriesConfig,
  seriesB: ComparisonSeriesConfig,
  filename: string,
): void {
  const header = `Date,${seriesA.label} (${seriesA.unit}),${seriesB.label} (${seriesB.unit})\n`;
  const rows = data
    .map((d) => `${d.key},${d.a ?? ""},${d.b ?? ""}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
