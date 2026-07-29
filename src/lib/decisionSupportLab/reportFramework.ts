// Decision Support Lab — shared report generator. This is the foundation
// every future tool exports a "Download Full Report" through: a tool
// hands generateReportPdf() a plain ReportDefinition (heading/paragraphs/
// facts per section) and gets a formatted multi-page PDF back, without
// touching jsPDF, pagination, or layout itself. Deliberately basic text
// layout for this phase — the architecture (one definition shape, one
// generator) is the deliverable, not print-quality typesetting.
"use client";

export interface ReportFact {
  label: string;
  value: string;
}

export interface ReportSection {
  heading: string;
  paragraphs?: string[];
  facts?: ReportFact[];
}

export interface ReportDefinition {
  toolName: string;
  subtitle?: string;
  /** Human-readable, already formatted (e.g. "29 July 2026") — this module does no date formatting itself. */
  generatedAt: string;
  sourceNote: string;
  sections: ReportSection[];
}

const MARGIN_X = 48;
const PAGE_BOTTOM = 760;
const BRAND_NAME = "PAKISTAN ECONOMIC INTELLIGENCE CENTER";

export async function generateReportPdf(definition: ReportDefinition, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const maxWidth = pageWidth - MARGIN_X * 2;
  let y = 64;

  function ensureRoom(lineHeight: number) {
    if (y > PAGE_BOTTOM - lineHeight) {
      pdf.addPage();
      y = 64;
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(130);
  pdf.text(BRAND_NAME, MARGIN_X, y);
  y += 26;

  pdf.setTextColor(20);
  pdf.setFontSize(19);
  pdf.text(definition.toolName, MARGIN_X, y);
  y += 20;

  if (definition.subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(90);
    pdf.text(definition.subtitle, MARGIN_X, y);
    y += 22;
  }

  pdf.setDrawColor(215);
  pdf.line(MARGIN_X, y, pageWidth - MARGIN_X, y);
  y += 26;

  for (const section of definition.sections) {
    ensureRoom(30);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12.5);
    pdf.setTextColor(20);
    pdf.text(section.heading, MARGIN_X, y);
    y += 18;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(60);
    for (const para of section.paragraphs ?? []) {
      const lines: string[] = pdf.splitTextToSize(para, maxWidth);
      for (const line of lines) {
        ensureRoom(14);
        pdf.text(line, MARGIN_X, y);
        y += 14;
      }
      y += 6;
    }

    for (const fact of section.facts ?? []) {
      ensureRoom(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${fact.label}:`, MARGIN_X, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(fact.value, MARGIN_X + 150, y);
      y += 16;
    }

    y += 14;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(140);
  pdf.text(`${definition.sourceNote} · Generated ${definition.generatedAt}`, MARGIN_X, 800);

  pdf.save(filename);
}
