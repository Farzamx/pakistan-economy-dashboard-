"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/academy/types";
import { useLanguage } from "@/components/LanguageProvider";

interface QuizBlockProps {
  questions: QuizQuestion[];
}

export default function QuizBlock({ questions }: QuizBlockProps) {
  const { t, language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];
  const isCorrect = selected === q.correctIndex;

  function handleSelect(idx: number) {
    if (submitted) return;
    setSelected(idx);
  }

  function handleSubmit() {
    if (selected === null || submitted) return;
    setSubmitted(true);
    if (selected === q.correctIndex) setScore((s) => s + 1);
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setFinished(true);
    }
  }

  function handleRestart() {
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <div className="text-4xl font-bold text-[var(--neon-blue)]">{pct}%</div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("academy.quizScore")}: {score}/{questions.length}
        </p>
        <button
          onClick={handleRestart}
          className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
        >
          ↺ Restart Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--neon-blue)]">
          {t("academy.quiz")}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {current + 1} / {questions.length}
        </span>
      </div>

      <p className="mb-5 text-sm font-medium leading-relaxed text-[var(--text-primary)]">
        {q.question[language]}
      </p>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let cls =
            "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ";
          if (!submitted) {
            cls +=
              selected === idx
                ? "border-[var(--neon-blue)] bg-[var(--neon-blue)]/10 text-[var(--text-primary)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]";
          } else {
            if (idx === q.correctIndex) {
              cls += "border-emerald-500 bg-emerald-500/10 text-emerald-400";
            } else if (selected === idx) {
              cls += "border-red-500 bg-red-500/10 text-red-400";
            } else {
              cls += "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]";
            }
          }

          return (
            <button key={idx} className={cls} onClick={() => handleSelect(idx)}>
              <span className="mr-2 font-mono text-xs opacity-60">
                {String.fromCharCode(65 + idx)}.
              </span>
              {opt[language]}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            isCorrect
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <span className="font-semibold">
            {isCorrect ? `✓ ${t("academy.quizCorrect")}` : `✗ ${t("academy.quizIncorrect")}`}
          </span>
          <p className="mt-1 text-[var(--text-secondary)]">{q.explanation[language]}</p>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="rounded-lg bg-[var(--neon-blue)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-40"
          >
            {t("academy.quizSubmit")}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="rounded-lg bg-[var(--neon-blue)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
          >
            {current < questions.length - 1 ? t("academy.quizNext") : "Finish →"}
          </button>
        )}
      </div>
    </div>
  );
}
