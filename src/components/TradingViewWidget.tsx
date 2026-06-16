"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => void;
    };
  }
}

export default function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const init = () => {
      if (!window.TradingView || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      new window.TradingView.widget({
        container_id: "tv-kse100-chart",
        width: "100%",
        height: 420,
        symbol: "PSX:KSE100",
        interval: "D",
        timezone: "Asia/Karachi",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        allow_symbol_change: false,
        save_image: false,
        hide_side_toolbar: false,
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://s3.tradingview.com/tv.js"]',
    );

    if (existing) {
      window.TradingView ? init() : existing.addEventListener("load", init);
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <p className="mb-3 text-xs font-medium text-white/40">
        KSE-100 Index{" "}
        <span className="text-white/25">· Pakistan Stock Exchange · TradingView</span>
      </p>
      <div id="tv-kse100-chart" ref={containerRef} />
    </div>
  );
}
