"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClick: () => void;
}

export default function AssistantAvatar({ isOpen, onClick }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [isWaving, setIsWaving] = useState(false);

  // Wave animation: fires every 12–15s, plays once, then reschedules.
  // setTimeout only — no setInterval, no RAF loop.
  useEffect(() => {
    if (prefersReducedMotion) return;

    let waveTimeout: ReturnType<typeof setTimeout>;
    let resetTimeout: ReturnType<typeof setTimeout>;

    function schedule() {
      const delay = 12000 + Math.random() * 3000;
      waveTimeout = setTimeout(() => {
        setIsWaving(true);
        resetTimeout = setTimeout(() => {
          setIsWaving(false);
          schedule();
        }, 750);
      }, delay);
    }

    schedule();
    return () => {
      clearTimeout(waveTimeout);
      clearTimeout(resetTimeout);
    };
  }, [prefersReducedMotion]);

  const animClass = isWaving
    ? "assistant-wave"
    : prefersReducedMotion
      ? ""
      : "assistant-breathe";

  return (
    <motion.button
      onClick={onClick}
      aria-label={isOpen ? "Close AI assistant" : "Open Pakistan Economic Intelligence Assistant"}
      className="relative w-16 h-16 cursor-pointer focus:outline-none"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
    >
      {/* Outer glow halo */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: isOpen
            ? "0 0 28px rgba(56, 189, 248, 0.55), 0 0 8px rgba(56, 189, 248, 0.4)"
            : "0 0 16px rgba(56, 189, 248, 0.35)",
          borderRadius: "50%",
          transition: "box-shadow 0.3s ease",
        }}
      />

      {/* Animated SVG robot */}
      <span className={`block w-16 h-16 ${animClass}`}>
        <svg
          viewBox="0 0 64 64"
          className="w-16 h-16"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Dark background disc */}
          <circle cx="32" cy="32" r="30" fill="#060c1a" />

          {/* Neon border ring — pulses via CSS */}
          <circle
            cx="32"
            cy="32"
            r="30"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            className="assistant-glow-ring"
          />

          {/* Antenna stem */}
          <line
            x1="32" y1="3"
            x2="32" y2="13"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Antenna tip */}
          <circle cx="32" cy="3" r="2.5" fill="#38bdf8" />
          <circle cx="32" cy="3" r="1" fill="white" opacity="0.6" />

          {/* Face plate */}
          <rect x="9" y="15" width="46" height="36" rx="8" fill="#0b1829" />
          <rect
            x="9" y="15" width="46" height="36" rx="8"
            fill="none"
            stroke="rgba(56,189,248,0.12)"
            strokeWidth="0.75"
          />

          {/* Left eye — blinks via CSS class on <g> */}
          <g className="assistant-eye">
            <rect x="12" y="20" width="17" height="11" rx="3.5" fill="#081425" />
            <rect x="13" y="21" width="15" height="9" rx="2.5" fill="#38bdf8" opacity="0.88" />
            <rect x="14" y="22" width="5" height="5" rx="1.5" fill="white" opacity="0.35" />
          </g>

          {/* Right eye — blinks via CSS, slight delay via assistant-eye-r */}
          <g className="assistant-eye assistant-eye-r">
            <rect x="35" y="20" width="17" height="11" rx="3.5" fill="#081425" />
            <rect x="36" y="21" width="15" height="9" rx="2.5" fill="#38bdf8" opacity="0.88" />
            <rect x="37" y="22" width="5" height="5" rx="1.5" fill="white" opacity="0.35" />
          </g>

          {/* Divider line between eyes and mouth */}
          <line
            x1="14" y1="35"
            x2="50" y2="35"
            stroke="rgba(56,189,248,0.08)"
            strokeWidth="0.5"
          />

          {/* Mouth / status indicator bar */}
          <rect x="12" y="38" width="40" height="8" rx="4" fill="#081425" />
          {/* Active segments — implies processing / readiness */}
          <rect x="13" y="39" width="16" height="6" rx="3" fill="#38bdf8" opacity="0.7" />
          <rect x="31" y="39" width="9" height="6" rx="3" fill="#38bdf8" opacity="0.28" />
          <rect x="42" y="39" width="4" height="6" rx="2" fill="#38bdf8" opacity="0.12" />
        </svg>
      </span>

      {/* Pulsing availability dot — only when chat is closed */}
      {!isOpen && (
        <span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#38bdf8] border-2 border-[#05060f]"
          style={{ animation: "assistant-dot-pulse 2s ease-in-out infinite" }}
        />
      )}
    </motion.button>
  );
}
