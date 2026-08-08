// Decision Support Lab — shared export framework. Any tool that draws a
// Canvas-based share card (see ShareCard.tsx) exports it through these two
// functions rather than re-implementing toBlob/jsPDF wiring per tool.
"use client";

/** Resolves false (never rejects) if the canvas couldn't be encoded — callers surface that as a visible error rather than a silent no-op. */
export function exportCanvasAsPng(canvas: HTMLCanvasElement, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        resolve(true);
      }, "image/png");
    } catch {
      resolve(false);
    }
  });
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
