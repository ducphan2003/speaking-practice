/** Cách AI điều chỉnh độ khó / phong cách luyện nói trong hội thoại. */
export const PRACTICE_MODES = ['EVERYDAY', 'PROFESSIONAL', 'IELTS_SPEAKING'] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const PRACTICE_MODE_DEFAULT: PracticeMode = 'EVERYDAY';

export const PRACTICE_MODE_UI: Record<
  PracticeMode,
  { titleVi: string; descriptionVi: string }
> = {
  EVERYDAY: {
    titleVi: 'Hằng ngày',
    descriptionVi: 'Dễ, thông dụng trong trò chuyện hằng ngày',
  },
  PROFESSIONAL: {
    titleVi: 'Chuyên ngành',
    descriptionVi: 'Tiếng Anh công việc / chuyên môn theo chủ đề',
  },
  IELTS_SPEAKING: {
    titleVi: 'IELTS Speaking',
    descriptionVi: 'Gần với phần thi nói IELTS (câu hỏi mở rộng, mức độ trang trọng vừa phải)',
  },
};

export function normalizePracticeMode(raw: unknown): PracticeMode {
  if (raw === 'PROFESSIONAL' || raw === 'IELTS_SPEAKING' || raw === 'EVERYDAY') {
    return raw;
  }
  return PRACTICE_MODE_DEFAULT;
}

/** Nhãn ngắn cho UI (trang practice, v.v.). */
export function practiceModeShortLabelVi(mode: PracticeMode): string {
  return PRACTICE_MODE_UI[mode].titleVi;
}

/**
 * Khối hướng dẫn tiếng Anh gắn vào system instruction (Gemini) cùng persona.
 */
export function practiceModeSystemAppendix(mode: PracticeMode): string {
  switch (mode) {
    case 'EVERYDAY':
      return `## Practice style: Everyday conversation
- Use **simple, high-frequency vocabulary** and natural spoken English from daily life.
- Keep sentences **clear and conversational** — like chatting with a friend or colleague, not an exam or a lecture.
- Avoid unnecessary jargon and academic phrasing unless the topic clearly requires it.
- If the learner seems stuck, **rephrase in simpler words** and stay warm and encouraging.`;

    case 'PROFESSIONAL':
      return `## Practice style: Professional / domain English
- Use a **professional register** that fits the topic (workplace, industry, or specialist context).
- Deploy **precise terminology** where a professional naturally would; if a term is rare, keep the sentence clear or add a brief gloss.
- Prefer **structured, clear** delivery suitable for meetings, briefings, or professional dialogue — not slang-heavy casual chat unless the scenario is informal workplace banter.`;

    case 'IELTS_SPEAKING':
      return `## Practice style: IELTS Speaking-like practice
- Mirror the **IELTS Speaking test feel**: familiar questions, **follow-ups that invite elaboration** (reasons, examples, comparisons), and Part 2–3 style depth when the flow fits.
- Use **slightly more formal** English than casual small talk, but stay natural — not scripted or robotic.
- **Do not** give band scores or say "Band X" unless the learner **explicitly** asks for scoring; focus on **examiner-like prompts** and rich interaction.
- Encourage **fluency and extended answers** rather than stopping at short yes/no replies from the learner.`;
  }
}
