"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mars, MessageCircle, UserRound, Venus } from "lucide-react";
import { authHeaders } from "@/lib/api-client";
import { getAvatarIcon } from "@/lib/conversation-avatars";
import { cn } from "@/lib/utils";

export type ConversationSpaceItem = {
  _id: string;
  custom_topic_name: string;
  persona_name?: string;
  canvas_x?: number | null;
  canvas_y?: number | null;
  updatedAt?: string;
  gender?: string;
  avatar_code?: string;
  avatar_url?: string | null;
  summary?: string | null;
};

function convId(c: { _id: unknown }): string {
  const raw = c._id;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "$oid" in (raw as object)) {
    return String((raw as { $oid: string }).$oid);
  }
  return String(raw ?? "");
}

function defaultSlot(index: number): { x: number; y: number } {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: Math.min(0.88, 0.1 + col * 0.22),
    y: Math.min(0.82, 0.1 + row * 0.2),
  };
}

/** API / Mongo có thể trả số hoặc chuỗi — chuẩn hóa để khớp vị trí đã lưu */
function numFromUnknown(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

type Props = {
  conversations: ConversationSpaceItem[];
  onOpenConversation: (id: string, topicTitle: string) => void;
  onPositionSaved?: (id: string, x: number, y: number) => void;
  className?: string;
};

const DRAG_THRESHOLD_PX = 10;

export function ConversationSpace({
  conversations,
  onOpenConversation,
  onPositionSaved,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
    lastX: number;
    lastY: number;
  } | null>(null);

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      conversations.forEach((c, i) => {
        const id = convId(c);
        if (!next[id]) {
          const sx = numFromUnknown(c.canvas_x);
          const sy = numFromUnknown(c.canvas_y);
          const slot = defaultSlot(i);
          next[id] = {
            x: sx !== null ? sx : slot.x,
            y: sy !== null ? sy : slot.y,
          };
        }
      });
      const alive = new Set(conversations.map(convId));
      Object.keys(next).forEach((k) => {
        if (!alive.has(k)) delete next[k];
      });
      return next;
    });
  }, [conversations]);

  const savePosition = useCallback(
    async (id: string, x: number, y: number) => {
      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: authHeaders(true),
          body: JSON.stringify({ canvas_x: x, canvas_y: y }),
        });
        const json = (await res.json()) as { success?: boolean; message?: string };
        if (res.ok && json.success) {
          onPositionSaved?.(id, x, y);
        }
      } catch {
        /* network */
      }
    },
    [onPositionSaved],
  );

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    const pos = positions[id];
    if (!pos || !containerRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
      lastX: pos.x,
      lastY: pos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) d.moved = true;
    const ndx = dx / rect.width;
    const ndy = dy / rect.height;
    const nx = Math.max(0.04, Math.min(0.96, d.originX + ndx));
    const ny = Math.max(0.04, Math.min(0.96, d.originY + ndy));
    d.lastX = nx;
    d.lastY = ny;
    setPositions((prev) => ({ ...prev, [d.id]: { x: nx, y: ny } }));
  };

  const handlePointerUp = (e: React.PointerEvent, id: string, topicTitle: string) => {
    const d = dragRef.current;
    if (!d || d.id !== id || e.pointerId !== d.pointerId) return;
    const moved = d.moved;
    const lastX = d.lastX;
    const lastY = d.lastY;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (moved) {
      void savePosition(id, lastX, lastY);
    } else {
      onOpenConversation(id, topicTitle);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent, id: string) => {
    const d = dragRef.current;
    if (!d || d.id !== id || e.pointerId !== d.pointerId) return;
    const moved = d.moved;
    const lastX = d.lastX;
    const lastY = d.lastY;
    dragRef.current = null;
    if (moved) {
      void savePosition(id, lastX, lastY);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate w-full overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-muted/40 to-muted/10",
        "min-h-[max(28rem,calc(100dvh-9rem))]",
        "touch-none select-none",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px]" />

      {conversations.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            Chưa có hội thoại nào. Bấm biểu tượng{" "}
            <span className="whitespace-nowrap font-medium text-foreground">người bí ẩn</span> ở góc để bắt đầu
            cuộc trò chuyện mới.
          </p>
        </div>
      )}

      {conversations.map((c) => {
        const id = convId(c);
        const pos = positions[id] ?? { x: 0.5, y: 0.5 };
        const label = c.custom_topic_name || "Hội thoại";
        const summaryText =
          typeof c.summary === "string" && c.summary.trim() ? c.summary.trim() : "";
        const gender = c.gender;
        const avatarUrl =
          typeof c.avatar_url === "string" && c.avatar_url.trim() ? c.avatar_url.trim() : null;
        const AvatarIcon = getAvatarIcon(c.avatar_code);

        return (
          <button
            key={id}
            type="button"
            title={summaryText || undefined}
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
            className={cn(
              "group/card absolute z-10 flex w-[5.75rem] flex-col items-center gap-1 rounded-2xl border border-border/90 bg-card/95 p-2.5 text-center shadow-lg backdrop-blur-sm transition-shadow",
              "hover:border-primary/40 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary",
              "cursor-grab active:cursor-grabbing",
            )}
            onPointerDown={(e) => handlePointerDown(e, id)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, id, label)}
            onPointerCancel={(e) => handlePointerCancel(e, id)}
            aria-label={`Tiếp tục: ${label}`}
          >
            {summaryText ? (
              <div
                role="tooltip"
                className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-56 max-w-[85vw] -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-left text-xs leading-snug text-popover-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover/card:visible group-hover/card:opacity-100 max-md:hidden"
              >
                {summaryText}
              </div>
            ) : null}

            {gender && gender !== "UNSPECIFIED" && (
              <span className="flex h-4 items-center justify-center" aria-hidden>
                {gender === "MALE" && <Mars className="h-3.5 w-3.5 text-sky-400" />}
                {gender === "FEMALE" && <Venus className="h-3.5 w-3.5 text-pink-400" />}
                {gender === "OTHER" && <UserRound className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            )}

            {avatarUrl ? (
              <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/25">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              </span>
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md">
                <AvatarIcon className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
            )}
            <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight text-foreground">
              {label}
            </span>
            {c.persona_name && (
              <span className="line-clamp-1 w-full text-[10px] text-muted-foreground">{c.persona_name}</span>
            )}
            <MessageCircle className="mt-0.5 h-3.5 w-3.5 text-primary/70" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
