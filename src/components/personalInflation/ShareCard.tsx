"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { PersonalInflationResult } from "@/lib/personalInflation/engine";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

interface Props {
  result: PersonalInflationResult;
  observationDate: string;
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const PAGE_URL = `${SITE_URL}/tools/personal-inflation`;

function toneColor(differencePct: number): string {
  return differencePct > 0.3 ? "#fb7185" : differencePct < -0.3 ? "#34d399" : "#9b8afb";
}

// Fixed, always-dark "brand card" look regardless of the viewer's own site
// theme — a share image needs one consistent appearance wherever it lands
// (a tweet, a WhatsApp preview), the same reasoning OG images use a single
// rendered look rather than following the visitor's local theme.
function drawShareCard(canvas: HTMLCanvasElement, result: PersonalInflationResult, observationDate: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const accent = toneColor(result.differencePct);

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#05060f");
  bg.addColorStop(1, "#0b0e21");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = "#4d8df7";
  ctx.fillRect(0, 0, CARD_WIDTH, 6);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 20px Arial";
  ctx.fillText(SITE_NAME.toUpperCase(), 64, 68);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 38px Arial";
  ctx.fillText("My Personal Inflation Rate", 64, 128);

  ctx.fillStyle = accent;
  ctx.font = "700 104px Arial";
  ctx.fillText(`${result.personalCpiPct.toFixed(1)}%`, 64, 250);

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "400 24px Arial";
  ctx.fillText(`vs. Official CPI ${result.officialCpiPct.toFixed(1)}%`, 64, 292);

  const diffSign = result.differencePct > 0 ? "+" : "";
  ctx.fillStyle = accent;
  ctx.font = "600 26px Arial";
  ctx.fillText(`${diffSign}${result.differencePct.toFixed(1)} percentage points`, 64, 332);

  // Comparison bars
  const barX = 64;
  const barMaxW = 500;
  const barH = 30;
  const maxVal = Math.max(result.officialCpiPct, result.personalCpiPct, 1);
  let barY = 400;

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "500 16px Arial";
  ctx.fillText("OFFICIAL CPI", barX, barY - 10);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(barX, barY, barMaxW, barH);
  ctx.fillStyle = "#4d8df7";
  ctx.fillRect(barX, barY, Math.max(4, (result.officialCpiPct / maxVal) * barMaxW), barH);

  barY += barH + 46;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "500 16px Arial";
  ctx.fillText("YOUR PERSONAL CPI", barX, barY - 10);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(barX, barY, barMaxW, barH);
  ctx.fillStyle = accent;
  ctx.fillRect(barX, barY, Math.max(4, (result.personalCpiPct / maxVal) * barMaxW), barH);

  // Right-side badge
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(CARD_WIDTH - 340, 60, 276, 120);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 14px Arial";
  ctx.fillText("VERIFIED", CARD_WIDTH - 320, 90);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "400 15px Arial";
  ctx.fillText("Pakistan Bureau of Statistics", CARD_WIDTH - 320, 118);
  ctx.fillText(`Data as of ${observationDate}`, CARD_WIDTH - 320, 142);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "400 16px Arial";
  ctx.fillText(`Calculate yours at ${PAGE_URL.replace("https://", "")}`, 64, CARD_HEIGHT - 40);
}

export default function ShareCard({ result, observationDate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) drawShareCard(canvasRef.current, result, observationDate);
  }, [result, observationDate]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-personal-inflation-rate.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (older browser / permissions denied) — no
      // fallback needed here since Copy Link is a convenience, not the
      // primary share path (the PNG download and native share intents are).
    }
  }

  function shareText(): string {
    const diffSign = result.differencePct > 0 ? "+" : "";
    return `My personal inflation rate is ${result.personalCpiPct.toFixed(1)}% vs the official CPI of ${result.officialCpiPct.toFixed(1)}% (${diffSign}${result.differencePct.toFixed(1)}pp). Calculate yours:`;
  }

  function handleShareX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(PAGE_URL)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleShareLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(PAGE_URL)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleShareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText()} ${PAGE_URL}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // jsPDF is dynamically imported so it never enters the initial bundle —
  // only fetched the first time a visitor actually clicks "Download as
  // PDF," same lazy-loading rationale as the Recharts charts bundle.
  async function handleDownloadPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { jsPDF } = await import("jspdf");
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [CARD_WIDTH, CARD_HEIGHT] });
    pdf.addImage(imgData, "PNG", 0, 0, CARD_WIDTH, CARD_HEIGHT);
    pdf.save("my-personal-inflation-rate.pdf");
  }

  return (
    <div className="glass-card flex flex-col gap-4 rounded-xl p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white light:text-slate-900">{t("personalInflation.shareTitle")}</h3>

      <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
        <canvas
          ref={canvasRef}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          role="img"
          aria-label={`Personal inflation rate ${result.personalCpiPct.toFixed(1)}%, official CPI ${result.officialCpiPct.toFixed(1)}%`}
          className="block h-auto w-full"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-95"
        >
          {t("personalInflation.shareDownload")}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 light:text-slate-700"
        >
          {t("personalInflation.shareDownloadPdf")}
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 light:text-slate-700"
        >
          {copied ? t("personalInflation.shareCopied") : t("personalInflation.shareCopyLink")}
        </button>
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 light:text-slate-700"
        >
          {t("personalInflation.shareToWhatsApp")}
        </button>
        <button
          type="button"
          onClick={handleShareX}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 light:text-slate-700"
        >
          {t("personalInflation.shareToX")}
        </button>
        <button
          type="button"
          onClick={handleShareLinkedIn}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 light:text-slate-700"
        >
          {t("personalInflation.shareToLinkedIn")}
        </button>
      </div>
    </div>
  );
}
