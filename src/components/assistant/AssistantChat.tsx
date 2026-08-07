"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import type { CitationItem, ConfidenceLevel, SourceType } from "@/app/api/assistant/route";
import { useLanguage } from "@/components/LanguageProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: SourceType;
  dataSource?: string | null;
  confidence?: ConfidenceLevel;
  confidenceReason?: string;
  queryCategory?: string;
  citations?: CitationItem[];
  searchPerformed?: boolean;
  searchLatencyMs?: number | null;
  sourcesFound?: number;
  modelDisplayName?: string;
  translation?: string;
  translationVisible?: boolean;
  translating?: boolean;
}

interface Props {
  context: DashboardSnapshot;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  "Dashboard Data":  "text-[#38bdf8]",
  "Official Source": "text-[#34d399]",
  "Financial Media": "text-[#a78bfa]",
  "External Sources":"text-[#a78bfa]",
  "AI Knowledge":    "text-[#a855f7]",
  "Hybrid Analysis": "text-[#34d399]",
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { dot: string; text: string; label: string }> = {
  High:   { dot: "bg-[#34d399]", text: "text-[#34d399]", label: "High" },
  Medium: { dot: "bg-[#fbbf24]", text: "text-[#fbbf24]", label: "Medium" },
  Low:    { dot: "bg-[#f87171]", text: "text-[#f87171]", label: "Low"  },
};

const TIER_STYLES: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-400",
  B: "bg-blue-500/15 text-blue-400",
  C: "bg-white/8 text-white/35",
};

// ── Inline markdown renderer ───────────────────────────────────────────────────

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-white/95 light:text-slate-900">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const output: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    output.push(
      <ul key={`list-${output.length}`} className="mt-1 space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-1.5 items-baseline">
            <span className="text-[#38bdf8]/40 flex-shrink-0 text-[10px]">›</span>
            <span>{parseBold(item)}</span>
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("- ") || line.startsWith("• ")) {
      listBuffer.push(line.slice(2));
      continue;
    }

    flushList();

    if (line.trim() === "") {
      if (output.length > 0) {
        output.push(<div key={`gap-${i}`} className="h-1" />);
      }
    } else if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      output.push(
        <p key={`hdr-${i}`} className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55 light:text-slate-500">
          {line.trim().slice(2, -2)}
        </p>,
      );
    } else {
      output.push(
        <p key={`p-${i}`} className="leading-snug">
          {parseBold(line)}
        </p>,
      );
    }
  }

  flushList();
  return output;
}

// ── Citations sub-component ────────────────────────────────────────────────────

function MessageCitations({ citations }: { citations: CitationItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (citations.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-white/30 light:text-slate-400 hover:text-[#38bdf8]/60 transition-colors"
      >
        <span className="text-[9px]">{expanded ? "▾" : "▸"}</span>
        {citations.length} source{citations.length > 1 ? "s" : ""}
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1">
          {citations.map((c, i) => (
            <a
              key={i}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-white/40 light:text-slate-500 hover:text-[#38bdf8]/75 transition-colors"
            >
              <span
                className={`text-[8px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${TIER_STYLES[c.tier] ?? TIER_STYLES.C}`}
              >
                {c.tier}
              </span>
              <span className="truncate">{c.domain}</span>
              {c.publishedDate && (
                <span className="text-white/20 light:text-slate-400 flex-shrink-0">
                  {c.publishedDate.slice(0, 7)}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Roman Urdu translation block ──────────────────────────────────────────────

function TranslationSection({
  msg,
  msgIndex,
  onTranslate,
}: {
  msg: Message;
  msgIndex: number;
  onTranslate: (index: number, text: string) => void;
}) {
  const { t } = useLanguage();
  const hasTranslation = Boolean(msg.translation);
  const buttonLabel = msg.translating
    ? null
    : hasTranslation
      ? msg.translationVisible
        ? t("assistant.hide")
        : t("assistant.show")
      : t("assistant.show");

  return (
    <div className="mt-2">
      <button
        onClick={() => onTranslate(msgIndex, msg.content)}
        disabled={msg.translating}
        className="flex items-center gap-1 text-[10px] text-white/28 light:text-slate-400 hover:text-[#38bdf8]/55 transition-colors disabled:cursor-default"
        aria-label={buttonLabel ?? "Translating…"}
      >
        {msg.translating ? (
          <>
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/40 flex-shrink-0"
              style={{ animation: "assistant-dot-pulse 1.4s ease-in-out infinite" }}
            />
            <span className="text-white/25 light:text-slate-400">{t("assistant.translating")}</span>
          </>
        ) : (
          <>
            <span className="text-[11px]">🌐</span>
            <span>{buttonLabel}</span>
          </>
        )}
      </button>

      {msg.translationVisible && msg.translation && (
        <div className="mt-1.5 rounded-xl px-3 py-2.5 bg-[#071420] light:bg-blue-50 border border-[#38bdf8]/10 light:border-blue-100">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#38bdf8]/30 light:text-blue-500 mb-1.5">
            Roman Urdu
          </p>
          <div className="text-[12.5px] text-white/62 light:text-slate-700 space-y-0.5 leading-snug">
            {renderMarkdown(msg.translation)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Message footer (transparency block) ───────────────────────────────────────

function MessageFooter({ msg }: { msg: Message }) {
  const conf = msg.confidence ? CONFIDENCE_CONFIG[msg.confidence] : null;
  const showSearch = msg.searchPerformed && msg.sourcesFound !== undefined;

  return (
    <div className="mt-2 pt-2 border-t border-white/8 light:border-slate-200 space-y-1">
      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
        {msg.queryCategory && (
          <span className="text-[10px] font-medium text-white/35 light:text-slate-500">
            {msg.queryCategory}
          </span>
        )}
        {conf && (
          <>
            <span className="text-white/15 light:text-slate-300 text-[10px]">·</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${conf.dot}`} />
              <span className={`text-[10px] font-medium ${conf.text}`}>
                {conf.label}
              </span>
            </span>
          </>
        )}
        {msg.source && (
          <>
            <span className="text-white/15 light:text-slate-300 text-[10px]">·</span>
            <span className={`text-[10px] font-medium ${SOURCE_COLORS[msg.source] ?? "text-white/35"}`}>
              {msg.source}
            </span>
            {msg.dataSource && (
              <span className="text-[10px] text-white/30 light:text-slate-400 font-medium">
                via {msg.dataSource}
              </span>
            )}
          </>
        )}
        {msg.modelDisplayName && msg.modelDisplayName !== "Offline" && (
          <>
            <span className="text-white/15 light:text-slate-300 text-[10px]">·</span>
            <span className="text-[10px] text-white/25 light:text-slate-400 font-medium">
              {msg.modelDisplayName}
            </span>
          </>
        )}
      </div>

      {msg.confidenceReason && (
        <p className="text-[10px] text-white/25 light:text-slate-400 leading-tight">
          {msg.confidenceReason}
        </p>
      )}

      {showSearch && (
        <p className="text-[10px] text-white/20 light:text-slate-400">
          {msg.sourcesFound! > 0
            ? `Searched · ${msg.sourcesFound} trusted source${msg.sourcesFound! > 1 ? "s" : ""}${msg.searchLatencyMs ? ` · ${msg.searchLatencyMs}ms` : ""}`
            : `Searched · no trusted sources found`}
        </p>
      )}

      {msg.citations && msg.citations.length > 0 && (
        <MessageCitations citations={msg.citations} />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AssistantChat({ context, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const SUGGESTED_QUESTIONS = [
    t("assistant.suggestedQ1"),
    t("assistant.suggestedQ2"),
    t("assistant.suggestedQ3"),
    t("assistant.suggestedQ4"),
    t("assistant.suggestedQ5"),
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as {
        reply: string;
        confidence: ConfidenceLevel;
        confidenceReason: string;
        source: SourceType;
        dataSource: string | null;
        queryCategory: string;
        citations: CitationItem[];
        searchPerformed: boolean;
        searchLatencyMs: number | null;
        sourcesFound: number;
        modelDisplayName: string;
      };

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
          source: data.source,
          dataSource: data.dataSource,
          confidence: data.confidence,
          confidenceReason: data.confidenceReason,
          queryCategory: data.queryCategory,
          citations: data.citations,
          searchPerformed: data.searchPerformed,
          searchLatencyMs: data.searchLatencyMs,
          sourcesFound: data.sourcesFound,
          modelDisplayName: data.modelDisplayName,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: t("assistant.error"),
          source: "AI Knowledge",
          confidence: "Low",
          confidenceReason: "Request failed",
          queryCategory: "Error",
          citations: [],
          searchPerformed: false,
          modelDisplayName: "Offline",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function translateMessage(msgIndex: number, text: string) {
    const msg = messages[msgIndex];
    if (!msg) return;

    if (msg.translation) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex ? { ...m, translationVisible: !m.translationVisible } : m,
        ),
      );
      return;
    }

    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, translating: true } : m)),
    );

    try {
      const res = await fetch("/api/assistant/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { translation: string };
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? { ...m, translating: false, translation: data.translation, translationVisible: true }
            : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? {
                ...m,
                translating: false,
                translation: "[Translation unavailable. Please try again.]",
                translationVisible: true,
              }
            : m,
        ),
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div
      className="flex flex-col w-[340px] max-w-[calc(100vw-2rem)] bg-[#07101f] light:bg-white border border-[#38bdf8]/25 light:border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
      style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.12)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#38bdf8]/15 light:border-slate-200 bg-[#060e1c] light:bg-slate-50">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
          <span className="text-sm font-semibold text-white/90 light:text-slate-900 tracking-tight">
            {t("assistant.title")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#38bdf8]/60 font-medium uppercase tracking-wider">
            {t("assistant.badge")}
          </span>
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 light:text-slate-400 hover:text-white/80 light:hover:text-slate-700 hover:bg-white/8 light:hover:bg-slate-100 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[260px] max-h-[400px] hide-scrollbar">

        {/* Suggested questions — only when empty */}
        {isEmpty && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-white/35 light:text-slate-500 font-medium uppercase tracking-wider px-0.5">
              {t("assistant.askAnything")}
            </p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => void send(q)}
                className="w-full text-left text-xs text-white/60 light:text-slate-600 hover:text-white/90 light:hover:text-slate-900 bg-white/4 light:bg-slate-50 hover:bg-[#38bdf8]/10 light:hover:bg-blue-50 border border-white/8 light:border-slate-200 hover:border-[#38bdf8]/30 light:hover:border-blue-200 rounded-xl px-3 py-2.5 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                msg.role === "user"
                  ? "bg-[#38bdf8]/20 light:bg-blue-50 text-white/90 light:text-slate-800 rounded-br-md border border-[#38bdf8]/25 light:border-blue-200"
                  : "bg-white/5 light:bg-slate-50 text-white/82 light:text-slate-700 rounded-bl-md border border-white/8 light:border-slate-200"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
              ) : (
                <p className="leading-snug">{msg.content}</p>
              )}
              {msg.role === "assistant" && msg.content.length > 10 && (
                <TranslationSection
                  msg={msg}
                  msgIndex={i}
                  onTranslate={translateMessage}
                />
              )}
              {msg.role === "assistant" && <MessageFooter msg={msg} />}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 light:bg-slate-100 border border-white/8 light:border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/70"
                style={{ animation: "assistant-typing-bounce 1.2s ease-in-out 0s infinite" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/70"
                style={{ animation: "assistant-typing-bounce 1.2s ease-in-out 0.2s infinite" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/70"
                style={{ animation: "assistant-typing-bounce 1.2s ease-in-out 0.4s infinite" }}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 pb-3 pt-2 border-t border-white/6 light:border-slate-200">
        <div className="flex items-center gap-2 bg-white/5 light:bg-slate-50 border border-white/10 light:border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#38bdf8]/40 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("assistant.placeholder")}
            disabled={isLoading}
            className="flex-1 bg-transparent text-[13px] text-white/85 light:text-slate-800 placeholder-white/25 light:placeholder-slate-400 outline-none disabled:opacity-50"
          />
          <button
            onClick={() => void send(input)}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#38bdf8]/20 hover:bg-[#38bdf8]/35 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-3.5 h-3.5"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.5 8.5L14.5 2l-4 6 4 6L1.5 8.5zM10.5 8H1.5"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-white/18 light:text-slate-400 text-center mt-1.5">
          as of {context.asOf} · {t("assistant.footer")}
        </p>
      </div>
    </div>
  );
}
