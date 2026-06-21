"use client";

// PNG/CSV export for budget charts — same native-browser-API approach as
// src/lib/comparisons/exportUtils.ts (XMLSerializer, Canvas, Blob), no new
// dependency.

import type { TrendPoint } from "./budgetData";

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
    const scale = 2;
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

export function exportTrendAsCsv(points: TrendPoint[], fieldLabels: Record<string, string>, filename: string): void {
  const fields = Object.keys(points[0]?.values ?? {});
  const header = `Fiscal Year,${fields.map((f) => fieldLabels[f] ?? f).join(",")}\n`;
  const rows = points
    .map((p) => `FY${p.fiscalYear},${fields.map((f) => p.values[f] ?? "").join(",")}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
