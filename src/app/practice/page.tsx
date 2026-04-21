"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Lightbulb,
  Mic,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Loader2,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { authHeaders } from "@/lib/api-client";
import { readSseResponse } from "@/lib/sse-client";
import { cn } from "@/lib/utils";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { useInlineAudioPlayer } from "@/hooks/useInlineAudioPlayer";

/** Đặt `true` khi bật lại khối «Nhiệm vụ ẩn» + gọi `/api/missions/random`. */
const SHOW_HIDDEN_MISSIONS = false;

type EvalDetail = {
  error_type?: string;
  word?: string;
  correction?: string;
  explanation?: string;
};

type ApiMessage = {
  _id: string;
  sender: "USER" | "AI" | "SYSTEM_SRS";
  content: string;
  original_transcript?: string;
  audio_url?: string;
  evaluation?: {
    pronunciation_score?: number;
    grammar_score?: number;
    details?: EvalDetail[];
  };
  practice_reading?: {
    evaluation?: {
      pronunciation_score?: number;
      grammar_score?: number;
      details?: EvalDetail[];
    };
    audio_url?: string;
    transcript?: string;
    createdAt?: string;
  };
  createdAt?: string;
};

type MissionRow = { _id: string; content?: string; content_vi?: string };

type VocabRow = {
  _id: string;
  word: string;
  meaning: string;
  ipa?: string;
  word_type?: string;
};

/** Chuẩn hóa _id từ API/Mongoose (string hoặc { $oid }) để so khớp tin nhắn và URL. */
function apiMessageId(msg: { _id: unknown }): string {
  const raw = msg._id;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "$oid" in (raw as object)) {
    return String((raw as { $oid: string }).$oid);
  }
  return String(raw ?? "");
}

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const topicParam = searchParams.get("topic") ?? "Luyện tập";

  const [panelOpen, setPanelOpen] = useState(true);
  const { isRecording: recording, start: startMic, stop: stopMic } = useVoiceCapture();
  const { playingId, play: playMessageAudio, stop: stopMessageAudio } = useInlineAudioPlayer();
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintsLoading, setHintsLoading] = useState(false);
  const [translateOpen, setTranslateOpen] = useState<{
    word: string;
    x: number;
    y: number;
    loading: boolean;
    meaning: string | null;
    ipa: string | null;
    wordType: string | null;
    error: string | null;
    systemVocabularyId: string | null;
    fromCache?: boolean;
  } | null>(null);
  const [errorPopup, setErrorPopup] = useState<EvalDetail | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [personaName, setPersonaName] = useState("—");
  const [chatModeLabel, setChatModeLabel] = useState("—");
  const [sessionVocab, setSessionVocab] = useState<VocabRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [redoMessage, setRedoMessage] = useState<ApiMessage | null>(null);
  /** Giữ state ở parent để không mất khi modal bị remount (React Strict Mode / dev). */
  const [redoPracticeResult, setRedoPracticeResult] = useState<ApiMessage | null>(null);

  const modeLabel = useMemo(() => {
    if (chatModeLabel === "FREE_TALK") return "Free-talk";
    if (chatModeLabel === "CUSTOM_TOPIC") return "Chủ đề tự nhập";
    if (chatModeLabel === "SAMPLE_TOPIC") return "Chủ đề mẫu";
    return chatModeLabel;
  }, [chatModeLabel]);

  const loadRoom = useCallback(async () => {
    if (!conversationId) return;
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setLoadError(null);
    try {
      const [cRes, mRes, vRes] = await Promise.all([
        fetch(`/api/conversations/${conversationId}`, { headers: authHeaders() }),
        fetch(`/api/conversations/${conversationId}/messages`, { headers: authHeaders() }),
        fetch(`/api/vocabularies?conversation_id=${encodeURIComponent(conversationId)}`, {
          headers: authHeaders(),
        }),
      ]);

      const cJson = await cRes.json();
      if (!cRes.ok || !cJson.success) {
        setLoadError(cJson.message || "Không tải được phòng.");
        return;
      }
      const conv = cJson.data;
      setPersonaName(conv.persona_name || "—");
      setChatModeLabel(conv.chat_mode || "—");

      if (SHOW_HIDDEN_MISSIONS) {
        const subQ = conv.sub_topic_id
          ? `?sub_topic_id=${encodeURIComponent(String(conv.sub_topic_id))}`
          : "";
        const missRes = await fetch(`/api/missions/random${subQ}`, { headers: authHeaders() });
        const missJson = await missRes.json();
        if (missRes.ok && missJson.success && Array.isArray(missJson.data)) {
          setMissions(missJson.data);
        }
      } else {
        setMissions([]);
      }

      const msgJson = await mRes.json();
      if (mRes.ok && msgJson.success && Array.isArray(msgJson.data)) {
        setMessages(msgJson.data);
      }

      const vJson = await vRes.json();
      if (vRes.ok && vJson.success && Array.isArray(vJson.data)) {
        setSessionVocab(
          vJson.data.map((x: { _id: string; word: string; meaning: string }) => ({
            _id: x._id,
            word: x.word,
            meaning: x.meaning,
          })),
        );
      }
    } catch {
      setLoadError("Lỗi mạng khi tải phòng.");
    }
  }, [conversationId, router]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const onRefreshMissions = useCallback(async () => {
    if (!conversationId || !SHOW_HIDDEN_MISSIONS) return;
    setRefreshSpin(true);
    try {
      const cRes = await fetch(`/api/conversations/${conversationId}`, { headers: authHeaders() });
      const cJson = await cRes.json();
      const subId = cJson.data?.sub_topic_id;
      const subQ = subId ? `?sub_topic_id=${encodeURIComponent(String(subId))}` : "";
      const missRes = await fetch(`/api/missions/random${subQ}`, { headers: authHeaders() });
      const missJson = await missRes.json();
      if (missRes.ok && missJson.success && Array.isArray(missJson.data)) {
        setMissions(missJson.data);
      }
    } finally {
      window.setTimeout(() => setRefreshSpin(false), 550);
    }
  }, [conversationId]);

  const fetchHints = useCallback(async () => {
    if (!conversationId) return;
    setHintsLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/hint`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success && typeof json.data === "string") {
        setHintText(json.data);
      } else {
        setHintText("");
      }
    } catch {
      setHintText("");
    } finally {
      setHintsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (hintsOpen && conversationId) fetchHints();
  }, [hintsOpen, conversationId, fetchHints]);

  const sendMessageToApi = useCallback(
    async (originalTranscript: string, audioBase64?: string, audioMimeType?: string) => {
      if (!conversationId || sending) return;
      setSending(true);
      try {
        const baseHeaders = authHeaders(true) as Record<string, string>;
        const body: Record<string, string> = {
          original_transcript: originalTranscript,
        };
        if (audioBase64) {
          body.audio_base64 = audioBase64;
          body.audio_mime_type = audioMimeType ?? "audio/webm";
        }

        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: {
            ...baseHeaders,
            Accept: "text/event-stream",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const msg =
            errJson && typeof errJson === "object" && "message" in errJson
              ? String((errJson as { message: string }).message)
              : `HTTP ${res.status}`;
          alert(msg);
          return;
        }

        await readSseResponse(res, (event, data) => {
          if (event === "error" && data && typeof data === "object" && "message" in data) {
            throw new Error(String((data as { message: string }).message));
          }
          if (event === "complete" && data && typeof data === "object") {
            const d = data as {
              user_message?: ApiMessage;
              ai_message?: ApiMessage;
            };
            if (d.user_message && d.ai_message) {
              setMessages((prev) => [...prev, d.user_message!, d.ai_message!]);
            }
          }
        });
      } catch (e) {
        alert(e instanceof Error ? e.message : "Lỗi mạng.");
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending],
  );

  const handleMicClick = useCallback(async () => {
    stopMessageAudio();
    if (!conversationId || sending || redoMessage) return;
    if (!recording) {
      try {
        await startMic();
      } catch {
        alert("Không bật được mic. Hãy cấp quyền truy cập microphone.");
      }
      return;
    }
    try {
      const { transcript, audioBase64, mimeType } = await stopMic();
      await sendMessageToApi(transcript, audioBase64, mimeType);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi khi dừng ghi âm.");
    }
  }, [conversationId, sending, recording, startMic, stopMic, sendMessageToApi, stopMessageAudio, redoMessage]);

  const applyRedoResult = useCallback((updated: ApiMessage) => {
    const id = apiMessageId(updated);
    setMessages((prev) =>
      prev.map((m) => (apiMessageId(m) === id ? { ...updated, _id: id } : m)),
    );
  }, []);

  const onRedoPracticeComplete = useCallback(
    (updated: ApiMessage) => {
      applyRedoResult(updated);
      setRedoPracticeResult(updated);
    },
    [applyRedoResult],
  );

  const saveHoveredWord = async () => {
    if (!translateOpen || !conversationId) return;
    if (translateOpen.loading || !translateOpen.meaning) {
      alert("Đợi tra từ xong (hoặc thử bấm lại từ khác).");
      return;
    }
    try {
      const res = await fetch("/api/vocabularies", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          conversation_id: conversationId,
          word: translateOpen.word,
          meaning: translateOpen.meaning,
          word_type: translateOpen.wordType?.trim() || "—",
          ipa: translateOpen.ipa?.trim() ?? "",
          example_sentence: "",
          ...(translateOpen.systemVocabularyId
            ? { system_vocabulary_id: translateOpen.systemVocabularyId }
            : {}),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSessionVocab((prev) => [
          ...prev,
          {
            _id: String(json.data._id),
            word: translateOpen.word,
            meaning: translateOpen.meaning ?? "",
            ...(translateOpen.ipa ? { ipa: translateOpen.ipa } : {}),
            ...(translateOpen.wordType ? { word_type: translateOpen.wordType } : {}),
          },
        ]);
      }
      setTranslateOpen(null);
    } catch {
      /* ignore */
    }
  };

  if (!conversationId) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <AppNav />
        <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-muted-foreground">
            Chưa có phòng luyện tập. Hãy tạo từ trang chủ (nút &quot;Bắt đầu hội thoại&quot;).
          </p>
          <Link
            href="/"
            onClick={() => stopMessageAudio()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <AppNav />

      <div className="shrink-0 border-b border-border bg-card/50 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <Link
            href="/"
            onClick={() => stopMessageAudio()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Trang chủ
          </Link>
          <span className="text-border">|</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {modeLabel}
          </span>
        </div>
      </div>

      {loadError && (
        <div className="mx-auto w-full max-w-7xl shrink-0 px-4 py-2 text-sm text-red-600">{loadError}</div>
      )}

      <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col lg:flex-row lg:items-stretch">
        <section className="flex min-h-0 flex-1 flex-col border-border lg:min-w-0 lg:border-r">
          <header className="shrink-0 space-y-3 border-b border-border px-4 py-4 sm:px-6">
            <div>
              <h1 className="text-lg font-semibold sm:text-xl">{decodeURIComponent(topicParam)}</h1>
              <p className="text-sm text-muted-foreground">
                Persona:{" "}
                <span className="font-medium text-foreground">{personaName}</span>
              </p>
            </div>

            {SHOW_HIDDEN_MISSIONS && (
              <div className="rounded-2xl border border-border/80 bg-muted/30 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nhiệm vụ ẩn
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshMissions}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", refreshSpin && "animate-spin-once")}
                    />
                    Làm mới
                  </button>
                </div>
                <ul className="space-y-2">
                  {missions.length === 0 ? (
                    <li className="text-sm text-muted-foreground">Chưa có nhiệm vụ — thử làm mới hoặc seed DB.</li>
                  ) : (
                    missions.map((m) => (
                      <li key={m._id} className="flex items-start gap-2 text-sm">
                        <input type="checkbox" readOnly className="mt-0.5 rounded border-border" />
                        <span>{m.content_vi || m.content}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col bg-muted/20">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Chưa có tin nhắn. Bấm mic để nói (tiếng Anh), bấm lần nữa để gửi tới API.
                </p>
              )}

              {messages.map((msg) =>
                msg.sender === "AI" ? (
                  <div key={msg._id} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 shadow-sm">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">AI</span>
                        {msg.audio_url && (
                          <button
                            type="button"
                            onClick={() => playMessageAudio(msg._id, msg.audio_url!)}
                            className="rounded-full p-1 hover:bg-muted"
                            aria-label={playingId === msg._id ? "Tạm dừng" : "Phát âm thanh"}
                          >
                            {playingId === msg._id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">
                        {msg.content.split(" ").map((w, i) => (
                          <button
                            key={`${msg._id}-${i}`}
                            type="button"
                            className="mr-1 inline rounded px-0.5 hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              const word = w.replace(/[.,?!]/g, "").trim();
                              if (!word) return;
                              setTranslateOpen({
                                word,
                                x: r.left,
                                y: r.bottom + 6,
                                loading: true,
                                meaning: null,
                                ipa: null,
                                wordType: null,
                                error: null,
                                systemVocabularyId: null,
                              });
                              void (async () => {
                                try {
                                  const res = await fetch("/api/vocabulary-lookup", {
                                    method: "POST",
                                    headers: authHeaders(true),
                                    body: JSON.stringify({ word }),
                                  });
                                  const json = await res.json();
                                  setTranslateOpen((prev) => {
                                    if (!prev || prev.word !== word) return prev;
                                    if (json.success && json.data) {
                                      return {
                                        ...prev,
                                        loading: false,
                                        meaning: String(json.data.meaning ?? ""),
                                        ipa:
                                          json.data.ipa != null && json.data.ipa !== ""
                                            ? String(json.data.ipa)
                                            : null,
                                        wordType:
                                          json.data.word_type != null && json.data.word_type !== ""
                                            ? String(json.data.word_type)
                                            : null,
                                        systemVocabularyId: String(
                                          json.data.system_vocabulary_id ?? "",
                                        ),
                                        error: null,
                                        fromCache: Boolean(json.data.from_cache),
                                      };
                                    }
                                    return {
                                      ...prev,
                                      loading: false,
                                      error: String(json.message ?? "Không tra được từ."),
                                      meaning: null,
                                      ipa: null,
                                      wordType: null,
                                      systemVocabularyId: null,
                                    };
                                  });
                                } catch {
                                  setTranslateOpen((prev) =>
                                    prev && prev.word === word
                                      ? {
                                          ...prev,
                                          loading: false,
                                          error: "Lỗi mạng.",
                                          meaning: null,
                                          ipa: null,
                                          wordType: null,
                                          systemVocabularyId: null,
                                        }
                                      : prev,
                                  );
                                }
                              })();
                            }}
                          >
                            {w}
                          </button>
                        ))}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={msg._id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md border border-primary/20 bg-primary/5 px-4 py-3 text-right shadow-sm">
                      <div className="mb-1 flex items-center justify-end gap-2 text-xs">
                        {msg.audio_url && (
                          <button
                            type="button"
                            onClick={() => playMessageAudio(msg._id, msg.audio_url!)}
                            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={playingId === msg._id ? "Tạm dừng" : "Nghe lại giọng bạn"}
                          >
                            {playingId === msg._id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <span className="font-medium text-primary">Bạn</span>
                      </div>
                      <p className="text-sm leading-relaxed text-left">
                        {renderUserTranscript(msg, setErrorPopup, false)}
                      </p>
                      {msg.evaluation &&
                        ((msg.evaluation.details?.length ?? 0) > 0 ||
                          typeof msg.evaluation.pronunciation_score === "number") && (
                          <button
                            type="button"
                            onClick={() => {
                              stopMessageAudio();
                              setRedoPracticeResult(null);
                              setRedoMessage(msg);
                            }}
                            className="mt-2 text-xs font-medium text-primary hover:underline"
                          >
                            Luyện đọc lại
                          </button>
                        )}
                      {msg.practice_reading?.evaluation && (
                        <div className="mt-3 rounded-xl border border-primary/25 bg-background/60 p-3 text-left shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-primary">Luyện đọc lại</p>
                            {msg.practice_reading.audio_url && (
                              <button
                                type="button"
                                onClick={() =>
                                  playMessageAudio(`${msg._id}__redo`, msg.practice_reading!.audio_url!)
                                }
                                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label={
                                  playingId === `${msg._id}__redo` ? "Tạm dừng" : "Nghe bản luyện"
                                }
                              >
                                {playingId === `${msg._id}__redo` ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Volume2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Phát âm{" "}
                            <span className="font-medium text-foreground">
                              {msg.practice_reading.evaluation.pronunciation_score ?? "—"}
                            </span>
                            {" · "}
                            Ngữ pháp{" "}
                            <span className="font-medium text-foreground">
                              {msg.practice_reading.evaluation.grammar_score ?? "—"}
                            </span>
                          </p>
                          <div className="mt-2">
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              Điểm phát âm / ngữ pháp do AI phân tích từ file ghi. Dòng dưới là bản ghi Web
                              Speech (tham khảo, có thể thiếu/sai); dùng nút loa để nghe lại âm thanh.
                            </p>
                            <p className="mt-1 text-sm leading-relaxed">
                              {renderUserTranscript(msg, setErrorPopup, true)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="shrink-0 border-t border-border bg-card/80 px-4 py-5 backdrop-blur-md sm:px-6">
              <div className="mx-auto flex max-w-lg items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleMicClick()}
                    disabled={sending || !!redoMessage}
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground shadow-lg transition",
                      recording
                        ? "gradient-primary animate-pulse-ring ring-4 ring-primary/30"
                        : "bg-gradient-to-br from-primary to-secondary hover:opacity-95",
                      sending && "opacity-50",
                    )}
                    aria-pressed={recording}
                  >
                    <Mic className="h-7 w-7" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {redoMessage
                      ? "Đang luyện đọc lại…"
                      : sending
                        ? "Đang gửi…"
                        : recording
                          ? "Bấm lần nữa để gửi"
                          : "Bật mic → nói xong → bấm gửi"}
                  </span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      stopMessageAudio();
                      setHintsOpen((v) => !v);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-400/15 text-amber-700 shadow-sm hover:bg-amber-400/25 dark:text-amber-300"
                    aria-expanded={hintsOpen}
                  >
                    <Lightbulb className="h-6 w-6" />
                  </button>
                  {hintsOpen && (
                    <div className="absolute bottom-full right-0 z-20 mb-2 w-72 max-w-[min(100vw-2rem,20rem)] rounded-2xl border border-border bg-card p-3 text-left text-sm shadow-xl">
                      <p className="text-xs font-semibold text-muted-foreground">Gợi ý (API)</p>
                      {hintsLoading ? (
                        <p className="mt-2 text-muted-foreground">Đang tải…</p>
                      ) : hintText ? (
                        <p className="mt-2 leading-relaxed text-foreground/90">{hintText}</p>
                      ) : (
                        <p className="mt-2 text-muted-foreground">Chưa có gợi ý.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside
          className={cn(
            "flex min-h-0 max-h-[min(42vh,22rem)] shrink-0 flex-col border-t border-border bg-card/90 backdrop-blur-xl transition-[width] lg:max-h-none lg:self-stretch lg:border-t-0 lg:border-l",
            panelOpen ? "w-full lg:w-[30%] lg:max-w-sm" : "w-full lg:w-14",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2 lg:px-4">
            <span
              className={cn(
                "text-sm font-semibold truncate",
                !panelOpen && "hidden lg:block lg:w-0 lg:opacity-0",
              )}
            >
              Từ vựng buổi học
            </span>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              className="rounded-full p-2 hover:bg-muted"
              aria-label={panelOpen ? "Thu gọn panel" : "Mở panel"}
            >
              {panelOpen ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRightOpen className="h-5 w-5" />
              )}
            </button>
          </div>
          {panelOpen && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 lg:p-4">
              <ul className="space-y-2">
                {sessionVocab.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Chưa có từ trong phiên này.</li>
                ) : (
                  sessionVocab.map((v) => (
                    <li
                      key={v._id}
                      className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold">{v.word}</span>
                      {v.word_type && (
                        <span className="text-muted-foreground"> ({v.word_type})</span>
                      )}
                      {v.ipa && (
                        <span className="block text-xs text-muted-foreground">{v.ipa}</span>
                      )}
                      <span className="text-muted-foreground"> — {v.meaning}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {translateOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Đóng"
            onClick={() => setTranslateOpen(null)}
          />
          <div
            className="glass fixed z-50 flex w-[min(92vw,19rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-2xl backdrop-blur-md"
            style={{ left: translateOpen.x, top: translateOpen.y }}
          >
            <div className="border-b border-border/60 bg-muted/25 px-3.5 py-2">
              <p className="text-[15px] font-bold leading-tight tracking-tight text-foreground">
                {translateOpen.word}
              </p>
            </div>

            <div className="min-h-13 px-3 py-1">
              {translateOpen.loading && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary/80" aria-hidden />
                  <span>Đang tra…</span>
                </div>
              )}
              {translateOpen.error && (
                <p className="text-sm leading-snug text-red-600 dark:text-red-400">{translateOpen.error}</p>
              )}
              {!translateOpen.loading && translateOpen.meaning && (
                <div className="space-y-2.5">
                  <p className="text-[14px]  leading-relaxed text-foreground">{translateOpen.meaning}</p>
                  {(translateOpen.wordType || translateOpen.ipa) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {translateOpen.wordType && (
                        <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                          {translateOpen.wordType}
                        </span>
                      )}
                      {translateOpen.ipa && (
                        <span className="rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[12px] leading-none text-muted-foreground tabular-nums">
                          {translateOpen.ipa}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border/60 bg-muted/10 px-3.5 pb-2">
              <button
                type="button"
                onClick={saveHoveredWord}
                disabled={translateOpen.loading || !translateOpen.meaning}
                className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lưu vào kho của tôi
              </button>
            </div>
          </div>
        </>
      )}

      {redoMessage && conversationId && (
        <RedoPracticeModal
          message={redoMessage}
          conversationId={conversationId}
          practiceResult={redoPracticeResult}
          onClose={() => {
            setRedoMessage(null);
            setRedoPracticeResult(null);
          }}
          onPracticeComplete={onRedoPracticeComplete}
          onClearPracticeResult={() => setRedoPracticeResult(null)}
          stopGlobalAudio={stopMessageAudio}
          onEvalDetail={setErrorPopup}
        />
      )}

      {errorPopup && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            aria-label="Đóng"
            onClick={() => setErrorPopup(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <p className="text-sm font-semibold">Gợi ý sửa</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {errorPopup.explanation ||
                `Thử dùng "${errorPopup.correction || "…"}" thay cho "${errorPopup.word}".`}
            </p>
            <button
              type="button"
              onClick={() => setErrorPopup(null)}
              className="mt-4 w-full rounded-xl border border-border py-2 text-sm font-medium"
            >
              Đã hiểu
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const PRACTICE_MODAL_AUDIO_ID = "__practice_modal_redo__";

function RedoPracticeModal({
  message,
  conversationId,
  practiceResult,
  onClose,
  onPracticeComplete,
  onClearPracticeResult,
  stopGlobalAudio,
  onEvalDetail,
}: {
  message: ApiMessage;
  conversationId: string;
  /** Kết quả lần ghi gần nhất — state nằm ở parent để không bị mất khi remount */
  practiceResult: ApiMessage | null;
  onClose: () => void;
  onPracticeComplete: (m: ApiMessage) => void;
  onClearPracticeResult: () => void;
  stopGlobalAudio: () => void;
  onEvalDetail: (d: EvalDetail) => void;
}) {
  const { isRecording, start, stop } = useVoiceCapture();
  const { playingId, play: playModalAudio, stop: stopModalAudio } = useInlineAudioPlayer();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    stopGlobalAudio();
  }, [stopGlobalAudio]);

  useEffect(() => {
    return () => stopModalAudio();
  }, [stopModalAudio]);

  const showResult = Boolean(practiceResult?.practice_reading?.evaluation);

  const handleMic = async () => {
    if (busy || showResult) return;
    if (!isRecording) {
      try {
        await start();
      } catch {
        alert("Không bật được mic. Hãy cấp quyền truy cập microphone.");
      }
      return;
    }
    setBusy(true);
    try {
      const { transcript, audioBase64, mimeType } = await stop();
      if (!audioBase64) {
        alert("Không ghi được file âm thanh. Hãy thử lại (kiểm tra mic và quyền trình duyệt).");
        return;
      }
      const mid = apiMessageId(message);
      const res = await fetch(
        `/api/conversations/${conversationId}/messages/${mid}/practice-read`,
        {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({
            original_transcript: transcript,
            audio_base64: audioBase64,
            audio_mime_type: mimeType ?? "audio/webm",
          }),
        },
      );
      const json = (await res.json()) as { success?: boolean; message?: string; data?: ApiMessage };
      if (!res.ok || !json.success || !json.data) {
        alert(typeof json.message === "string" ? json.message : `Lỗi chấm điểm (${res.status}).`);
        return;
      }
      onPracticeComplete(json.data);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi mạng.");
    } finally {
      setBusy(false);
    }
  };

  const handlePracticeAgain = () => {
    onClearPracticeResult();
  };

  const handleDone = () => {
    onClose();
  };

  const ev = practiceResult?.practice_reading?.evaluation;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[45] cursor-default bg-black/40"
        aria-label="Đóng"
        onClick={() => {
          if (!isRecording && !busy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="redo-practice-title"
        className="fixed left-1/2 top-1/2 z-50 max-h-[min(92dvh,640px)] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        {showResult && practiceResult && ev ? (
          <>
            <h2 id="redo-practice-title" className="text-base font-semibold">
              Kết quả luyện đọc
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">So với câu mẫu phía trên trong khung chat</p>
            <div className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-3 text-left text-sm leading-relaxed text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wide">Câu mẫu</span>
              <p className="mt-1 text-foreground">{message.content}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm">
              <span>
                Phát âm:{" "}
                <strong className="text-foreground">{ev.pronunciation_score ?? "—"}</strong>
              </span>
              <span className="text-border">|</span>
              <span>
                Ngữ pháp:{" "}
                <strong className="text-foreground">{ev.grammar_score ?? "—"}</strong>
              </span>
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Bạn đã nói (bản ghi chữ)</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Điểm phát âm / ngữ pháp do AI phân tích từ file âm thanh. Dòng dưới chỉ là Web Speech
                    (tham khảo); nghe lại bản ghi bên cạnh để đối chiếu.
                  </p>
                </div>
                {practiceResult.practice_reading?.audio_url ? (
                  <button
                    type="button"
                    onClick={() =>
                      playModalAudio(PRACTICE_MODAL_AUDIO_ID, practiceResult.practice_reading!.audio_url!)
                    }
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={playingId === PRACTICE_MODAL_AUDIO_ID ? "Tạm dừng" : "Nghe bản ghi luyện đọc"}
                  >
                    {playingId === PRACTICE_MODAL_AUDIO_ID ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-left text-sm leading-relaxed">
                {renderUserTranscript(practiceResult, onEvalDetail, true)}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handlePracticeAgain}
                className="rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted sm:min-w-[8rem]"
              >
                Luyện tiếp
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 sm:min-w-[8rem]"
              >
                Xong
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="redo-practice-title" className="text-base font-semibold">
              Luyện đọc lại
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Đọc to câu sau bằng tiếng Anh</p>
            <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-3 text-left text-sm leading-relaxed">
              {message.content}
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => void handleMic()}
                disabled={busy}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg transition",
                  isRecording
                    ? "gradient-primary animate-pulse-ring ring-4 ring-primary/30"
                    : "bg-gradient-to-br from-primary to-secondary hover:opacity-95",
                  busy && "opacity-60",
                )}
                aria-pressed={isRecording}
              >
                <Mic className="h-6 w-6" />
              </button>
              <span className="text-center text-xs text-muted-foreground">
                {busy
                  ? "Đang chấm điểm…"
                  : isRecording
                    ? "Bấm lần nữa để gửi và chấm điểm"
                    : "Bật mic → đọc xong → bấm gửi"}
              </span>
            </div>
            <button
              type="button"
              disabled={isRecording || busy}
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Đóng
            </button>
          </>
        )}
      </div>
    </>
  );
}

function renderUserTranscript(
  msg: ApiMessage,
  onDetail: (d: EvalDetail) => void,
  usePracticeReading: boolean,
): React.ReactNode {
  let text: string;
  let details: EvalDetail[];

  if (usePracticeReading && msg.practice_reading?.evaluation) {
    const t = (msg.practice_reading.transcript ?? "").trim();
    if (!t) {
      return (
        <span className="italic text-muted-foreground">
          Không có bản ghi chữ từ trình duyệt — điểm dựa trên file âm thanh đã gửi.
        </span>
      );
    }
    text = t;
    details = msg.practice_reading.evaluation?.details ?? [];
  } else {
    text = msg.original_transcript || msg.content;
    details = msg.evaluation?.details ?? [];
  }

  const detailByWord = new Map(details.map((d) => [d.word?.toLowerCase(), d]));

  return (
    <>
      {text.split(/(\s+)/).map((chunk, i) => {
        const trimmed = chunk.replace(/[.,?!]/g, "").toLowerCase();
        const hit = detailByWord.get(trimmed);
        if (!chunk.trim()) return <span key={i}>{chunk}</span>;
        if (hit) {
          const heavy = hit.error_type === "GRAMMAR" || hit.error_type === "PRONUNCIATION";
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDetail(hit)}
              className={cn(
                "rounded px-0.5 underline decoration-2 underline-offset-2",
                heavy
                  ? "text-red-600 decoration-red-500/80"
                  : "text-amber-600 decoration-amber-500/80",
              )}
            >
              {chunk}
            </button>
          );
        }
        return <span key={i}>{chunk}</span>;
      })}
    </>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-background text-muted-foreground">
          Đang tải phòng luyện…
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
