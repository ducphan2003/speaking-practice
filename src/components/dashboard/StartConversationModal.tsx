"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMode = "SAMPLE_TOPIC" | "CUSTOM" | "FREE_TALK";

type PersonaOption = { id: string; name: string };

export type TopicOption = { _id: string; name: string; name_vi: string; icon?: string };
export type SubTopicOption = { _id: string; title: string; title_vi: string };

type Props = {
  open: boolean;
  onClose: () => void;
  chatMode: ChatMode;
  onChatModeChange: (m: ChatMode) => void;
  topicLabel: string;
  onTopicLabelChange: (v: string) => void;
  topics: TopicOption[];
  subTopics: SubTopicOption[];
  selectedTopicId: string;
  onSelectedTopicIdChange: (id: string) => void;
  selectedSubTopicId: string;
  onSelectedSubTopicIdChange: (id: string) => void;
  personas: PersonaOption[];
  personaId: string;
  onPersonaIdChange: (id: string) => void;
  onStart: () => void | Promise<void>;
};

export function StartConversationModal({
  open,
  onClose,
  chatMode,
  onChatModeChange,
  topicLabel,
  onTopicLabelChange,
  topics,
  subTopics,
  selectedTopicId,
  onSelectedTopicIdChange,
  selectedSubTopicId,
  onSelectedSubTopicIdChange,
  personas,
  personaId,
  onPersonaIdChange,
  onStart,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Đóng"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 id="modal-title" className="text-lg font-semibold">
                Thiết lập hội thoại
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-6 max-h-[min(70vh,560px)]">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Chế độ chủ đề
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["SAMPLE_TOPIC", "Chủ đề mẫu"],
                      ["CUSTOM", "Tự nhập"],
                      ["FREE_TALK", "Free-talk"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onChatModeChange(value)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition",
                        chatMode === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {chatMode === "SAMPLE_TOPIC" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Chọn chủ đề
                    </label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => onSelectedTopicIdChange(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                    >
                      <option value="">— Chọn danh mục —</option>
                      {topics.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name_vi} ({t.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Tình huống (sub-topic)
                    </label>
                    <select
                      value={selectedSubTopicId}
                      onChange={(e) => onSelectedSubTopicIdChange(e.target.value)}
                      disabled={!selectedTopicId || subTopics.length === 0}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
                    >
                      <option value="">
                        {!selectedTopicId
                          ? "Chọn chủ đề trước"
                          : subTopics.length === 0
                            ? "Đang tải hoặc chưa có sub-topic…"
                            : "— Chọn tình huống —"}
                      </option>
                      {subTopics.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.title_vi || s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {chatMode === "CUSTOM" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Chủ đề / tình huống
                  </label>
                  <input
                    value={topicLabel}
                    onChange={(e) => onTopicLabelChange(e.target.value)}
                    placeholder="Ví dụ: Phỏng vấn xin việc tại startup"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="persona"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Tính cách AI (Persona)
                </label>
                <select
                  id="persona"
                  value={personaId}
                  onChange={(e) => onPersonaIdChange(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                >
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={onStart}
                className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.99]"
              >
                Bắt đầu phòng luyện
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
