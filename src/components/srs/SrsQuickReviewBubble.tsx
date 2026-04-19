"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import { authHeaders } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const SRS_DISMISSED_KEY = "srs_dismissed_vocab_ids";

type SrsPayload = {
  vocab_id: string;
  word: string;
  question: string;
  options: string[];
  correct_answer: string;
};

function normalizeMeaning(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SRS_DISMISSED_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr.map(String));
  } catch {
    return new Set();
  }
}

function addDismissedId(id: string) {
  const s = getDismissedIds();
  s.add(id);
  sessionStorage.setItem(SRS_DISMISSED_KEY, JSON.stringify([...s]));
}

/**
 * Ôn tập nhanh (SRS) — CTA nổi góc dưới trái, mọi màn hình (không nằm trong khung chat).
 */
export function SrsQuickReviewBubble() {
  const pathname = usePathname();
  const [srsData, setSrsData] = useState<SrsPayload | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const loadSrs = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setSrsData(null);
      return;
    }
    try {
      const res = await fetch("/api/srs-bubble", { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setSrsData(null);
        return;
      }
      const data = json.data as SrsPayload;
      const id = String(data.vocab_id);
      if (getDismissedIds().has(id)) {
        setSrsData(null);
        return;
      }
      setSrsData(data);
    } catch {
      setSrsData(null);
    }
  }, []);

  useEffect(() => {
    loadSrs();
  }, [loadSrs, pathname]);

  useEffect(() => {
    const t = setInterval(() => loadSrs(), 120_000);
    return () => clearInterval(t);
  }, [loadSrs]);

  useEffect(() => {
    const onFocus = () => loadSrs();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadSrs]);

  useEffect(() => {
    setExpanded(false);
    setInput("");
    setShowFeedback(false);
  }, [srsData?.vocab_id]);

  const dismiss = (id: string) => {
    addDismissedId(id);
    setSrsData(null);
    setExpanded(false);
    setInput("");
    setShowFeedback(false);
  };

  const handleCheck = () => {
    if (!srsData) return;
    const u = normalizeMeaning(input);
    if (!u) {
      alert("Nhập nghĩa bạn nhớ được.");
      return;
    }
    const ok = u === normalizeMeaning(srsData.correct_answer);
    setWasCorrect(ok);
    setShowFeedback(true);
  };

  const handleDone = () => {
    if (srsData) addDismissedId(String(srsData.vocab_id));
    setSrsData(null);
    setExpanded(false);
    setInput("");
    setShowFeedback(false);
  };

  if (!srsData) return null;

  const vid = String(srsData.vocab_id);

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 z-[100] flex max-w-[calc(100vw-2rem)] flex-col items-start"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={vid + (expanded ? "-ex" : "-col")}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="pointer-events-auto w-full max-w-md shadow-2xl"
        >
          {!expanded ? (
            <div className="flex max-w-full items-stretch overflow-hidden rounded-full border-2 border-amber-400/70 bg-gradient-to-r from-amber-400/25 via-amber-300/15 to-orange-300/20 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/20 backdrop-blur-md dark:from-amber-900/40 dark:via-amber-950/30 dark:to-orange-950/30">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left transition hover:bg-amber-400/10"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/35 text-amber-900 dark:text-amber-100">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold leading-snug text-foreground">
                  Nghĩa của <strong className="text-amber-950 dark:text-amber-50">{srsData.word}</strong> là gì?
                </span>
              </button>
              <button
                type="button"
                onClick={() => dismiss(vid)}
                className="shrink-0 border-l border-amber-500/30 px-3.5 text-amber-900/80 transition hover:bg-amber-500/20 dark:text-amber-100/90"
                aria-label="Đóng ôn tập nhanh"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/45 bg-card/95 p-5 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    Nghĩa của <strong>{srsData.word}</strong> là gì?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(vid)}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!showFeedback ? (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Câu trả lời của bạn
                  </label>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCheck();
                      }
                    }}
                    placeholder="Gõ nghĩa (tiếng Việt hoặc Anh)…"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCheck}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-amber-950 shadow-md transition hover:bg-amber-400"
                  >
                    <Check className="h-4 w-4" />
                    Kiểm tra
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm",
                      wasCorrect
                        ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                        : "border-orange-400/50 bg-orange-500/10 text-orange-950 dark:text-orange-100",
                    )}
                  >
                    {wasCorrect ? (
                      <p className="font-medium">Chính xác — tốt lắm!</p>
                    ) : (
                      <p>
                        <span className="font-medium">Chưa khớp đáp án.</span>
                        <br />
                        <span className="text-muted-foreground">Đáp án: </span>
                        <span className="font-medium">{srsData.correct_answer}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold shadow-sm transition hover:bg-muted"
                  >
                    Hoàn tất
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
