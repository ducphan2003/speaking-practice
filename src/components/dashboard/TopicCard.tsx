"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  progress: number;
  accent?: string;
  onClick?: () => void;
};

export function TopicCard({
  title,
  subtitle,
  icon: Icon,
  progress,
  accent = "from-primary/20 to-secondary/20",
  onClick,
}: Props) {
  return (
    <motion.article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-primary/10",
        onClick && "cursor-pointer",
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-primary",
          accent,
        )}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Tiến độ</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full gradient-progress transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.article>
  );
}
