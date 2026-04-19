"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import {
  StartConversationModal,
  type ChatMode,
  type SubTopicOption,
  type TopicOption,
} from "@/components/dashboard/StartConversationModal";
import { TopicCard } from "@/components/dashboard/TopicCard";
import { authHeaders } from "@/lib/api-client";
import { iconForTopic } from "@/lib/topic-icons";

export default function DashboardPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("SAMPLE_TOPIC");
  const [topicLabel, setTopicLabel] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopicOption[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedSubTopicId, setSelectedSubTopicId] = useState("");
  const [personas, setPersonas] = useState<{ id: string; name: string }[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [userName, setUserName] = useState("bạn");
  const [stats, setStats] = useState({ vocab: 0, streak: 5, xp: 68 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!localStorage.getItem("auth_token"));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw) as { name?: string };
        if (u.name) setUserName(u.name.split(" ")[0] ?? u.name);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      setTopics([]);
      setPersonas([]);
      return;
    }
    setLoadError(null);
    try {
      const [tRes, pRes, vRes] = await Promise.all([
        fetch("/api/topics", { headers: authHeaders() }),
        fetch("/api/personas", { headers: authHeaders() }),
        fetch("/api/vocabularies", { headers: authHeaders() }),
      ]);
      const tJson = await tRes.json();
      const pJson = await pRes.json();
      const vJson = await vRes.json();

      if (!tRes.ok || !tJson.success) {
        setLoadError(tJson.message || "Không tải được chủ đề.");
      } else if (Array.isArray(tJson.data)) {
        setTopics(tJson.data);
      }

      if (pRes.ok && pJson.success && Array.isArray(pJson.data)) {
        const list = pJson.data.map((x: { _id: string; name: string }) => ({
          id: String(x._id),
          name: x.name,
        }));
        setPersonas(list);
        setPersonaId((cur) => (cur && list.some((p: { id: string }) => p.id === cur) ? cur : list[0]?.id ?? ""));
      }

      if (vRes.ok && vJson.success && Array.isArray(vJson.data)) {
        setStats((s) => ({ ...s, vocab: vJson.data.length }));
      }
    } catch {
      setLoadError("Lỗi mạng khi tải dữ liệu.");
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!selectedTopicId) {
      setSubTopics([]);
      setSelectedSubTopicId("");
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/topics/${selectedTopicId}/sub-topics`, {
          headers: authHeaders(),
          signal: ac.signal,
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSubTopics(json.data);
          setSelectedSubTopicId("");
        }
      } catch {
        if (!ac.signal.aborted) setSubTopics([]);
      }
    })();
    return () => ac.abort();
  }, [selectedTopicId]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  const openModalWithTopic = (topicId: string) => {
    setChatMode("SAMPLE_TOPIC");
    setSelectedTopicId(topicId);
    setModalOpen(true);
  };

  const handleStartPractice = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const chat_mode =
      chatMode === "CUSTOM"
        ? "CUSTOM_TOPIC"
        : chatMode === "FREE_TALK"
          ? "FREE_TALK"
          : "SAMPLE_TOPIC";

    let custom_topic_name = "";
    let sub_topic_id: string | undefined;

    if (chat_mode === "FREE_TALK") {
      custom_topic_name = "Free talk";
    } else if (chat_mode === "CUSTOM_TOPIC") {
      custom_topic_name = topicLabel.trim();
      if (!custom_topic_name) {
        alert("Vui lòng nhập chủ đề / tình huống.");
        return;
      }
    } else {
      const st = subTopics.find((s) => s._id === selectedSubTopicId);
      if (!selectedSubTopicId || !st) {
        alert("Chọn chủ đề và một tình huống (sub-topic).");
        return;
      }
      custom_topic_name = st.title;
      sub_topic_id = selectedSubTopicId;
    }

    if (!personaId) {
      alert("Chưa có danh sách persona — hãy seed DB hoặc thử lại sau.");
      return;
    }

    setStarting(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          chat_mode,
          sub_topic_id,
          custom_topic_name,
          persona_id: personaId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Không tạo được phòng chat.");
        return;
      }
      const id = json.data._id;
      const topicTitle = encodeURIComponent(custom_topic_name);
      router.push(`/practice?conversation=${id}&topic=${topicTitle}`);
    } catch {
      alert("Lỗi mạng khi tạo phòng.");
    } finally {
      setStarting(false);
      setModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppNav />

      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
          {loadError && (
            <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {loadError}
            </p>
          )}
          {!authed && (
            <p className="mb-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Đăng nhập để tải chủ đề, persona và lưu tiến độ.{" "}
              <button
                type="button"
                className="font-medium text-primary underline"
                onClick={() => router.push("/login")}
              >
                Đi tới đăng nhập
              </button>
            </p>
          )}

          <section className="glass mb-10 flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-lg font-bold text-primary-foreground shadow-lg">
                {userName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{greeting}</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {userName}! Sẵn sàng luyện nói chưa?
                </h1>
              </div>
            </div>

            <div className="grid w-full max-w-md gap-3 sm:shrink-0">
              <div>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Từ đã lưu</span>
                  <span>{stats.vocab} từ</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                    style={{ width: `${Math.min(100, stats.vocab * 2)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Streak</span>
                  <span>{stats.streak} ngày</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full gradient-progress animate-shimmer"
                    style={{ width: `${Math.min(100, stats.streak * 15)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">XP tuần này</span>
                  <span>{stats.xp}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-secondary to-accent"
                    style={{ width: `${stats.xp}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Khám phá chủ đề</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chọn tình huống phù hợp — bấm thẻ để mở hội thoại theo chủ đề đó.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.length === 0 && authed && (
                <p className="col-span-full text-sm text-muted-foreground">
                  Chưa có chủ đề trong DB. Gọi <code className="rounded bg-muted px-1">POST /api/seed</code> hoặc thêm dữ liệu.
                </p>
              )}
              {topics.map((t) => {
                const Icon = iconForTopic(t.icon);
                return (
                  <TopicCard
                    key={t._id}
                    title={t.name_vi}
                    subtitle={t.name}
                    icon={Icon}
                    progress={0}
                    onClick={() => openModalWithTopic(t._id)}
                  />
                );
              })}
            </div>
          </section>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition hover:scale-[1.02] active:scale-[0.98] gradient-primary sm:bottom-8 sm:right-8 sm:left-auto sm:translate-x-0"
        >
          <Plus className="h-5 w-5" />
          Bắt đầu hội thoại
        </button>
      </main>

      <StartConversationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        chatMode={chatMode}
        onChatModeChange={setChatMode}
        topicLabel={topicLabel}
        onTopicLabelChange={setTopicLabel}
        topics={topics}
        subTopics={subTopics}
        selectedTopicId={selectedTopicId}
        onSelectedTopicIdChange={setSelectedTopicId}
        selectedSubTopicId={selectedSubTopicId}
        onSelectedSubTopicIdChange={setSelectedSubTopicId}
        personas={personas}
        personaId={personaId}
        onPersonaIdChange={setPersonaId}
        onStart={handleStartPractice}
      />
      {starting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
