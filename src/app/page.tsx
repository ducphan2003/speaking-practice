"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import {
  StartConversationModal,
  type ChatMode,
  type SubTopicOption,
  type TopicOption,
} from "@/components/dashboard/StartConversationModal";
import {
  ConversationSpace,
  type ConversationSpaceItem,
} from "@/components/dashboard/ConversationSpace";
import { authHeaders } from "@/lib/api-client";
import { DEFAULT_AVATAR_CODE } from "@/lib/conversation-avatars";
import {
  PRACTICE_MODE_DEFAULT,
  type PracticeMode,
} from "@/lib/conversation-practice-mode";

export default function DashboardPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("SAMPLE_TOPIC");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(PRACTICE_MODE_DEFAULT);
  const [topicLabel, setTopicLabel] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopicOption[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedSubTopicId, setSelectedSubTopicId] = useState("");
  const [personas, setPersonas] = useState<{ id: string; name: string }[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [personaInputMode, setPersonaInputMode] = useState<"library" | "custom">("library");
  const [customPersonaName, setCustomPersonaName] = useState("");
  const [customPersonaPrompt, setCustomPersonaPrompt] = useState("");
  const [conversationGender, setConversationGender] = useState("UNSPECIFIED");
  const [avatarCode, setAvatarCode] = useState(DEFAULT_AVATAR_CODE);
  const [conversationSummary, setConversationSummary] = useState("");
  const [userName, setUserName] = useState("bạn");
  const [stats, setStats] = useState({ vocab: 0, streak: 5, xp: 68 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [conversations, setConversations] = useState<ConversationSpaceItem[]>([]);

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

  const loadConversations = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      setConversations([]);
      return;
    }
    try {
      const res = await fetch("/api/conversations", { headers: authHeaders() });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setConversations(json.data);
      }
    } catch {
      setConversations([]);
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
    if (authed) loadConversations();
  }, [authed, loadConversations]);

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

  const openConversation = useCallback(
    (id: string, topicTitle: string) => {
      router.push(`/practice?conversation=${encodeURIComponent(id)}&topic=${encodeURIComponent(topicTitle)}`);
    },
    [router],
  );

  const mergeCanvas = useCallback((id: string, x: number, y: number) => {
    setConversations((prev) =>
      prev.map((c) => {
        const raw = c._id;
        const sid =
          typeof raw === "string"
            ? raw
            : raw && typeof raw === "object" && "$oid" in (raw as object)
              ? String((raw as { $oid: string }).$oid)
              : String(raw ?? "");
        return sid === id ? { ...c, canvas_x: x, canvas_y: y } : c;
      }),
    );
  }, []);

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

    if (personaInputMode === "library") {
      if (!personaId) {
        alert("Chưa có persona có sẵn — hãy seed DB hoặc chọn «Nhập mô tả».");
        return;
      }
    } else {
      const prompt = customPersonaPrompt.trim();
      if (prompt.length < 8) {
        alert("Mô tả tính cách AI cần ít nhất 8 ký tự.");
        return;
      }
    }

    setStarting(true);
    try {
      const personaPayload =
        personaInputMode === "custom"
          ? {
              persona_prompt_custom: customPersonaPrompt.trim(),
              ...(customPersonaName.trim()
                ? { persona_name_custom: customPersonaName.trim() }
                : {}),
            }
          : { persona_id: personaId };

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          chat_mode,
          practice_mode: practiceMode,
          sub_topic_id,
          custom_topic_name,
          ...personaPayload,
          gender: conversationGender,
          avatar_code: avatarCode,
          ...(conversationSummary.trim()
            ? { summary: conversationSummary.trim() }
            : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Không tạo được phòng chat.");
        return;
      }
      const id = json.data._id;
      router.push(`/practice?conversation=${id}&topic=${encodeURIComponent(custom_topic_name)}`);
    } catch {
      alert("Lỗi mạng khi tạo phòng.");
    } finally {
      setStarting(false);
      setModalOpen(false);
      void loadConversations();
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

        <div className="relative mx-auto w-full max-w-[min(100vw,2000px)] px-3 pb-24 pt-6 sm:px-6 lg:px-10">
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

          <section className="glass mb-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 sm:gap-4 md:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-sm font-bold text-primary-foreground shadow-md">
                {userName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{greeting}</p>
                <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg md:text-xl">
                  {userName}! Sẵn sàng luyện nói chưa?
                </h1>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <span className="rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium">
                Từ đã lưu: {stats.vocab}
              </span>
              <span className="rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium">
                Streak: {stats.streak} ngày
              </span>
              <span className="rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium">
                XP tuần: {stats.xp}%
              </span>
            </div>
          </section>

          <section>
            {!authed ? (
              <p className="rounded-2xl border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Đăng nhập để xem các hội thoại của bạn.
              </p>
            ) : (
              <ConversationSpace
                conversations={conversations}
                onOpenConversation={openConversation}
                onPositionSaved={mergeCanvas}
              />
            )}
          </section>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="Hội thoại mới"
          aria-label="Bắt đầu hội thoại mới"
          className="group fixed bottom-6 right-6 z-30 flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-dashed border-primary/45 bg-card/95 text-center shadow-lg backdrop-blur-sm transition hover:border-primary hover:shadow-xl sm:bottom-8 sm:right-8 sm:h-[4.5rem] sm:w-[4.5rem]"
        >
          <UserRound className="h-7 w-7 text-muted-foreground transition group-hover:text-primary sm:h-8 sm:w-8" />
          <span className="mt-0.5 max-w-[4.5rem] px-1 text-[9px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
            Mới
          </span>
        </button>
      </main>

      <StartConversationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        chatMode={chatMode}
        onChatModeChange={setChatMode}
        practiceMode={practiceMode}
        onPracticeModeChange={setPracticeMode}
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
        personaInputMode={personaInputMode}
        onPersonaInputModeChange={setPersonaInputMode}
        customPersonaName={customPersonaName}
        onCustomPersonaNameChange={setCustomPersonaName}
        customPersonaPrompt={customPersonaPrompt}
        onCustomPersonaPromptChange={setCustomPersonaPrompt}
        gender={conversationGender}
        onGenderChange={setConversationGender}
        avatarCode={avatarCode}
        onAvatarCodeChange={setAvatarCode}
        summary={conversationSummary}
        onSummaryChange={setConversationSummary}
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
