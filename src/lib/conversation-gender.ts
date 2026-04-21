export const CONVERSATION_GENDERS = [
  { value: "UNSPECIFIED", labelVi: "Không nêu" },
  { value: "MALE", labelVi: "Nam" },
  { value: "FEMALE", labelVi: "Nữ" },
  { value: "OTHER", labelVi: "Khác" },
] as const;

export type ConversationGender = (typeof CONVERSATION_GENDERS)[number]["value"];

const SET = new Set(CONVERSATION_GENDERS.map((g) => g.value));

export function isValidGender(v: unknown): v is ConversationGender {
  return typeof v === "string" && SET.has(v as ConversationGender);
}

export function normalizeGender(v: unknown): ConversationGender {
  return isValidGender(v) ? v : "UNSPECIFIED";
}
