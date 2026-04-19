"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Home, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/practice", label: "Luyện tập", icon: MessageCircle },
  { href: "/vocabulary", label: "Từ vựng", icon: BookOpen },
];

export function AppNav() {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw) as { name?: string };
        setUserName(u.name ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md shadow-primary/25">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-semibold tracking-tight text-foreground">
            SpeakLab
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 opacity-80" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="hidden md:inline text-sm text-muted-foreground max-w-[140px] truncate">
              Xin chào, <span className="font-medium text-foreground">{userName}</span>
            </span>
          )}
          <Link
            href="/login"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            {userName ? "Tài khoản" : "Đăng nhập"}
          </Link>
        </div>
      </div>
    </header>
  );
}
