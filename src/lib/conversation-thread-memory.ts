import { normalizePracticeMode, practiceModeShortLabelVi } from '@/lib/conversation-practice-mode';

export type DialogueLine = { sender: string; content: string };

export function filterUserAiDialogue(
  messages: Array<{ sender: string; content: string }>,
): DialogueLine[] {
  return messages
    .filter((m) => m.sender === 'USER' || m.sender === 'AI')
    .map((m) => ({ sender: m.sender, content: m.content }));
}

/**
 * Khối system instruction: tóm tắt luân phiên + 5 dòng USER/AI gần nhất.
 */
export function buildConversationMemorySystemBlock(
  allMessages: Array<{ sender: string; content: string }>,
  threadSummary: string | null | undefined,
): string | undefined {
  const dialogue = filterUserAiDialogue(allMessages);
  const recent = dialogue.slice(-5);
  const summary = (threadSummary || '').trim();
  if (!summary && recent.length === 0) return undefined;

  const parts: string[] = [
    '## Conversation memory (use together with the full message history below)',
  ];
  if (summary) {
    parts.push(`**Rolling summary (earlier in this session):**\n${summary}`);
  }
  if (recent.length > 0) {
    parts.push(
      `**Five most recent USER/AI lines (local context):**\n${recent
        .map((m) => `${m.sender}: ${m.content}`)
        .join('\n')}`,
    );
  }
  return parts.join('\n\n');
}

/** Mô tả ngắn cho bước tóm tắt — topic, persona, mode, ghi chú người học. */
export function buildThreadSummaryBriefDescription(input: {
  custom_topic_name?: string | null;
  persona_name?: string | null;
  chat_mode?: string | null;
  practice_mode?: string | null;
  /** Ghi chú lúc tạo phòng (field summary trên Conversation) */
  learner_session_note?: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`Topic / situation: ${(input.custom_topic_name || 'English practice').trim()}`);
  if (input.persona_name?.trim()) lines.push(`AI persona: ${input.persona_name.trim()}`);
  if (input.chat_mode?.trim()) lines.push(`Chat mode: ${input.chat_mode.trim()}`);
  const pm = normalizePracticeMode(input.practice_mode);
  lines.push(`Practice style: ${practiceModeShortLabelVi(pm)} (${pm})`);
  const note = (input.learner_session_note || '').trim();
  if (note) lines.push(`Learner note from setup: ${note.slice(0, 600)}`);
  lines.push(
    'Your task in the separate summarization call: merge prior summary with new lines; keep English; focus on topics, goals, mistakes, vocabulary, and open threads useful for continuing the chat.',
  );
  return lines.join('\n');
}
