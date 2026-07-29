// Decision Support Lab — shared export framework. Any tool that draws a
// Canvas-based share card (see ShareCard.tsx) exports it through these two
// functions rather than re-implementing toBlob/jsPDF wiring per tool.
"use client";

export function exportCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

// jsPDF is dynamically imported so it never enters a tool's initial
// bundle — fetched only the first time a visitor actually clicks
// "Download as PDF".
export async function exportCanvasAsPdf(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}
