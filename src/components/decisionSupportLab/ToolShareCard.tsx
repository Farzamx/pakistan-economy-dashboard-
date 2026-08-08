"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { SITE_NAME } from "@/lib/seoConfig";
import { exportCanvasAsPdf, exportCanvasAsPng } from "@/lib/decisionSupportLab/exportFramework";
import { buildShareMessage, useCanNativeShare, copyShareLink, nativeShare, shareToLinkedIn, shareToWhatsApp, shareToX } from "@/lib/decisionSupportLab/shareFramework";

export interface ToolShareCardBar {
  label: string;
  value: number;
  color: string;
}

export interface ToolShareCardProps {
  /** e.g. "My Personal Inflation Rate", "My Purchasing Power Today" */
  title: string;
  /** The big number, already formatted — e.g. "11.3%", "Rs 62,470" */
  headlineValue: string;
  headlineTone?: "up" | "down" | "neutral";
  /** e.g. "vs. Official CPI 11.0%" */
  comparisonLine?: string;
  /** e.g. "+0.3 percentage points" */
  deltaLine?: string;
  /** Up to 2 horizontal comparison bars (values on the same scale). */
  bars?: ToolShareCardBar[];
  /** Right-side "VERIFIED" badge lines, e.g. ["Pakistan Bureau of Statistics", "Data as of 2026-06-30"] */
  badgeLines: string[];
  /** Absolute canonical URL for this tool — embedded in the card footer and every share link. */
  shareUrl: string;
  /** One-sentence, plain-English summary used for X/WhatsApp/native share text (not shown on the card image itself). */
  shareSummary: string;
  /** e.g. "my-personal-inflation-rate" — used for both the .png and .pdf download filenames. */
  filenameBase: string;
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

const TONE_COLOR: Record<"up" | "down" | "neutral", string> = {
  up: "#fb7185",
  down: "#34d399",
  neutral: "#9b8afb",
};

function drawShareCard(canvas: HTMLCanvasElement, props: ToolShareCardProps) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const accent = TONE_COLOR[props.headlineTone ?? "neutral"];

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
  ctx.fillText(props.title, 64, 128);

  ctx.fillStyle = accent;
  ctx.font = "700 104px Arial";
  ctx.fillText(props.headlineValue, 64, 250);

  let y = 292;
  if (props.comparisonLine) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "400 24px Arial";
    ctx.fillText(props.comparisonLine, 64, y);
    y += 40;
  }
  if (props.deltaLine) {
    ctx.fillStyle = accent;
    ctx.font = "600 26px Arial";
    ctx.fillText(props.deltaLine, 64, y);
    y += 40;
  }

  // Comparison bars
  if (props.bars && props.bars.length > 0) {
    const barX = 64;
    const barMaxW = 500;
    const barH = 30;
    const maxVal = Math.max(...props.bars.map((b) => Math.abs(b.value)), 1);
    let barY = 400;
    for (const bar of props.bars) {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "500 16px Arial";
      ctx.fillText(bar.label.toUpperCase(), barX, barY - 10);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(barX, barY, barMaxW, barH);
      ctx.fillStyle = bar.color;
      ctx.fillRect(barX, barY, Math.max(4, (Math.abs(bar.value) / maxVal) * barMaxW), barH);
      barY += barH + 46;
    }
  }

  // Right-side badge
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(CARD_WIDTH - 340, 60, 276, 120);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 14px Arial";
  ctx.fillText("VERIFIED", CARD_WIDTH - 320, 90);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "400 15px Arial";
  props.badgeLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, CARD_WIDTH - 320, 118 + i * 24));

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "400 16px Arial";
  ctx.fillText(`Calculate yours at ${props.shareUrl.replace("https://", "")}`, 64, CARD_HEIGHT - 40);
}

/**
 * The Lab's shared shareable-result card — every tool (Personal Inflation,
 * Purchasing Power, Budget Allocation, and whatever comes next) hands this
 * component a title/headline/comparison/bars/badge and gets the exact same
 * Canvas-drawn image, PNG/PDF export, and X/LinkedIn/WhatsApp/Copy/Native
 * Share buttons — all routed through the one shareFramework/exportFramework
 * pair, so a fix or a new platform only has to happen here once.
 */
export default function ToolShareCard(props: ToolShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const canShareNative = useCanNativeShare();

  function showError(message: string) {
    setActionError(message);
    window.setTimeout(() => setActionError(null), 4000);
  }

  useEffect(() => {
    if (canvasRef.current) drawShareCard(canvasRef.current, props);
    // Redraw whenever any visible content changes — props is a fresh object
    // each render, so depend on the specific fields instead of the object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.title, props.headlineValue, props.headlineTone, props.comparisonLine, props.deltaLine, props.bars, props.badgeLines, props.shareUrl]);

  async function handleDownload() {
    if (!canvasRef.current) return;
    const ok = await exportCanvasAsPng(canvasRef.current, `${props.filenameBase}.png`);
    if (!ok) showError("Couldn't download image — try again.");
  }

  async function handleDownloadPdf() {
    if (!canvasRef.current) return;
    setPdfGenerating(true);
    try {
      await exportCanvasAsPdf(canvasRef.current, `${props.filenameBase}.pdf`);
    } catch {
      showError("Couldn't generate PDF — try again.");
    } finally {
      setPdfGenerating(false);
    }
  }

  async function handleCopyLink() {
    const ok = await copyShareLink(props.shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      showError("Couldn't copy link — try again.");
    }
  }

  function message(): string {
    return buildShareMessage({ summary: props.shareSummary });
  }

  function handleShareX() {
    shareToX(message(), props.shareUrl);
  }
  function handleShareLinkedIn() {
    shareToLinkedIn(props.shareUrl);
  }
  function handleShareWhatsApp() {
    shareToWhatsApp(message(), props.shareUrl);
  }
  async function handleNativeShare() {
    await nativeShare({ title: props.title, text: props.shareSummary, url: props.shareUrl });
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
          aria-label={`${props.title}: ${props.headlineValue}${props.comparisonLine ? `, ${props.comparisonLine}` : ""}`}
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
          disabled={pdfGenerating}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 disabled:opacity-50 light:text-slate-700"
        >
          {pdfGenerating ? t("decisionSupportLab.generatingReport") : t("personalInflation.shareDownloadPdf")}
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 light:text-slate-700"
        >
          {copied ? t("personalInflation.shareCopied") : t("personalInflation.shareCopyLink")}
        </button>
        {canShareNative && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue active:scale-95 light:text-slate-700"
          >
            {t("personalInflation.shareNative")}
          </button>
        )}
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

      {actionError && <p className="text-sm font-medium text-rose-400" role="alert">{actionError}</p>}
    </div>
  );
}
