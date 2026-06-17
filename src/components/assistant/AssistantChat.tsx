"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardSnapshot } from "@/lib/assistantContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: string;
  modelDisplayName?: string;
}

interface Props {
  context: DashboardSnapshot;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  "What's driving the Economic Health Score?",
  "Why is recession probability at this level?",
  "Is Pakistan's default risk improving?",
  "How do remittances affect the current account?",
];

const SOURCE_COLORS: Record<string, string> = {
  "Dashboard Data": "text-[#38bdf8]",
  "AI Knowledge": "text-[#a855f7]",
  "Hybrid Analysis": "text-[#34d399]",
};

export default function AssistantChat({ context, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change or typing indicator appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
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
        source: string;
        modelDisplayName: string;
      };

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
          source: data.source,
          modelDisplayName: data.modelDisplayName,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          source: "AI Knowledge",
          modelDisplayName: "Offline",
        },
      ]);
    } finally {
      setIsLoading(false);
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
    <div className="flex flex-col w-80 bg-[#07101f] border border-[#38bdf8]/25 rounded-2xl shadow-2xl overflow-hidden"
         style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.12)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#38bdf8]/15 bg-[#060e1c]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
          <span className="text-sm font-semibold text-white/90 tracking-tight">
            Economic Intelligence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#38bdf8]/60 font-medium uppercase tracking-wider">
            Live Data
          </span>
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[220px] max-h-[340px] hide-scrollbar">

        {/* Suggested questions — only when chat is empty */}
        {isEmpty && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-white/35 font-medium uppercase tracking-wider px-0.5">
              Ask me anything
            </p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => void send(q)}
                className="w-full text-left text-xs text-white/60 hover:text-white/90 bg-white/4 hover:bg-[#38bdf8]/10 border border-white/8 hover:border-[#38bdf8]/30 rounded-xl px-3 py-2.5 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#38bdf8]/20 text-white/90 rounded-br-md border border-[#38bdf8]/25"
                  : "bg-white/5 text-white/85 rounded-bl-md border border-white/8"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && (msg.source ?? msg.modelDisplayName) && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/8">
                  {msg.source && (
                    <span className={`text-[10px] font-medium ${SOURCE_COLORS[msg.source] ?? "text-white/40"}`}>
                      {msg.source}
                    </span>
                  )}
                  {msg.modelDisplayName && msg.modelDisplayName !== "Offline" && (
                    <>
                      <span className="text-white/20 text-[10px]">·</span>
                      <span className="text-[10px] text-white/30 font-medium">
                        {msg.modelDisplayName}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/70"
                    style={{ animation: "assistant-typing-bounce 1.2s ease-in-out 0s infinite" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/70"
                    style={{ animation: "assistant-typing-bounce 1.2s ease-in-out 0.2s infinite" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/70"
                    style={{ animation: "assistant-typing-bounce 1.2s ease-in-out 0.4s infinite" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 pb-3 pt-2 border-t border-white/6">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#38bdf8]/40 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Pakistan's economy…"
            disabled={isLoading}
            className="flex-1 bg-transparent text-[13px] text-white/85 placeholder-white/25 outline-none disabled:opacity-50"
          />
          <button
            onClick={() => void send(input)}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#38bdf8]/20 hover:bg-[#38bdf8]/35 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-[#38bdf8]" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 8.5L14.5 2l-4 6 4 6L1.5 8.5zM10.5 8H1.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-white/18 text-center mt-1.5">
          as of {context.asOf}
        </p>
      </div>
    </div>
  );
}
