"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronUp, SlidersHorizontal } from "lucide-react";
import { authHeaders } from "@/lib/api-client";
import {
  PRACTICE_MODES,
  PRACTICE_MODE_UI,
  type PracticeMode,
} from "@/lib/conversation-practice-mode";
import { cn } from "@/lib/utils";

type Props = {
  conversationId: string;
  value: PracticeMode;
  onChange: (mode: PracticeMode) => void;
  disabled?: boolean;
};

export function PracticeModeMenu({ conversationId, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selectMode = useCallback(
    async (m: PracticeMode) => {
      if (m === value) {
        setOpen(false);
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: authHeaders(true),
          body: JSON.stringify({ practice_mode: m }),
        });
        const json = (await res.json()) as { success?: boolean; message?: string };
        if (!res.ok || !json.success) {
          alert(json.message || "Không cập nhật được chế độ luyện.");
          return;
        }
        onChange(m);
        setOpen(false);
      } catch {
        alert("Lỗi mạng khi cập nhật chế độ.");
      } finally {
        setSaving(false);
      }
    },
    [conversationId, value, onChange],
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Chế độ luyện nói — mở danh sách"
        className={cn(
          "flex h-12 min-w-[7.25rem] flex-col items-stretch justify-center rounded-2xl border px-2.5 py-1 text-left shadow-sm transition sm:min-w-[8.25rem]",
          open
            ? "border-primary bg-primary/15 text-primary"
            : "border-border bg-muted/40 hover:bg-muted",
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Chế độ luyện
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{PRACTICE_MODE_UI[value].titleVi}</span>
          <ChevronUp
            className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-30 mb-2 w-[min(calc(100vw-2rem),19rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          role="listbox"
          aria-label="Chọn chế độ luyện nói"
        >
          <p className="border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            Áp dụng cho tin nhắn AI tiếp theo
          </p>
          <ul className="max-h-[min(70vh,16rem)] overflow-y-auto py-1">
            {PRACTICE_MODES.map((m) => {
              const { titleVi, descriptionVi } = PRACTICE_MODE_UI[m];
              const sel = m === value;
              return (
                <li key={m}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={sel}
                    disabled={saving}
                    onClick={() => void selectMode(m)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-muted/80",
                      sel && "bg-primary/10",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                      )}
                      aria-hidden
                    >
                      {sel ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("font-medium", sel ? "text-primary" : "text-foreground")}>
                        {titleVi}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground">
                        {descriptionVi}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
