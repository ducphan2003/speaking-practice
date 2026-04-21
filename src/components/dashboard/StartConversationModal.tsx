"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { CONVERSATION_AVATARS } from "@/lib/conversation-avatars";
import { CONVERSATION_GENDERS } from "@/lib/conversation-gender";
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
  /** Chọn persona có sẵn hoặc nhập mô tả tùy chỉnh */
  personaInputMode: "library" | "custom";
  onPersonaInputModeChange: (m: "library" | "custom") => void;
  customPersonaName: string;
  onCustomPersonaNameChange: (v: string) => void;
  customPersonaPrompt: string;
  onCustomPersonaPromptChange: (v: string) => void;
  gender: string;
  onGenderChange: (v: string) => void;
  avatarCode: string;
  onAvatarCodeChange: (v: string) => void;
  summary: string;
  onSummaryChange: (v: string) => void;
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
  personaInputMode,
  onPersonaInputModeChange,
  customPersonaName,
  onCustomPersonaNameChange,
  customPersonaPrompt,
  onCustomPersonaPromptChange,
  gender,
  onGenderChange,
  avatarCode,
  onAvatarCodeChange,
  summary,
  onSummaryChange,
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
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["SAMPLE_TOPIC", "Chủ đề mẫu"],
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

              {chatMode === "FREE_TALK" && (
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
                <label className="mb-1.5 block text-sm font-medium">Giới tính (hiển thị trên thẻ)</label>
                <select
                  value={gender}
                  onChange={(e) => onGenderChange(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                >
                  {CONVERSATION_GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.labelVi}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Biểu tượng nghề / dịch vụ</p>
                <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                  {CONVERSATION_AVATARS.map(({ code, labelVi, Icon }) => (
                    <button
                      key={code}
                      type="button"
                      title={labelVi}
                      onClick={() => onAvatarCodeChange(code)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-medium transition",
                        avatarCode === code
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/50",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="line-clamp-2 text-center leading-tight">{labelVi.split(" / ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Tính cách AI (Persona)</p>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onPersonaInputModeChange("library")}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition",
                      personaInputMode === "library"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 hover:bg-muted",
                    )}
                  >
                    Chọn có sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => onPersonaInputModeChange("custom")}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition",
                      personaInputMode === "custom"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 hover:bg-muted",
                    )}
                  >
                    Nhập mô tả
                  </button>
                </div>

                {personaInputMode === "library" ? (
                  <select
                    id="persona"
                    value={personaId}
                    onChange={(e) => onPersonaIdChange(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                  >
                    {personas.length === 0 ? (
                      <option value="">Chưa có persona — seed DB</option>
                    ) : (
                      personas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="persona-custom-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Tên gợi nhớ (tuỳ chọn)
                      </label>
                      <input
                        id="persona-custom-name"
                        value={customPersonaName}
                        onChange={(e) => onCustomPersonaNameChange(e.target.value)}
                        placeholder="Ví dụ: Giáo viên IELTS, Bạn đồng hành du lịch…"
                        maxLength={120}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring focus:ring-2"
                      />
                    </div>
                    <div>
                      <label htmlFor="persona-custom-prompt" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Mô tả tính cách &amp; phong cách nói
                      </label>
                      <textarea
                        id="persona-custom-prompt"
                        value={customPersonaPrompt}
                        onChange={(e) => onCustomPersonaPromptChange(e.target.value)}
                        rows={4}
                        placeholder="Ví dụ: Bạn là giáo viên tiếng Anh kiên nhẫn, sửa lỗi nhẹ nhàng, khuyến khích người học. Trả lời ngắn gọn, dùng tiếng Anh đơn giản…"
                        className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">Tối thiểu 8 ký tự. Nội dung này hướng dẫn AI đóng vai trong hội thoại.</p>
                    </div>
                  </div>
                )}
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
