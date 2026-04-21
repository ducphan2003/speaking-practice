import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Building2,
  Car,
  ChefHat,
  Code2,
  Coffee,
  GraduationCap,
  Hammer,
  Headphones,
  HeartHandshake,
  Mic2,
  Palette,
  Plane,
  Stethoscope,
  Wrench,
} from "lucide-react";

/** Mã lưu DB — ánh xạ sang icon Lucide (nghề / dịch vụ) */
export const CONVERSATION_AVATARS: ReadonlyArray<{
  code: string;
  labelVi: string;
  Icon: LucideIcon;
}> = [
  { code: "doctor", labelVi: "Y tế / bác sĩ", Icon: Stethoscope },
  { code: "chef", labelVi: "Ẩm thực / đầu bếp", Icon: ChefHat },
  { code: "travel", labelVi: "Du lịch / hàng không", Icon: Plane },
  { code: "teacher", labelVi: "Giáo dục", Icon: GraduationCap },
  { code: "office", labelVi: "Văn phòng / công sở", Icon: Briefcase },
  { code: "tech", labelVi: "Công nghệ / lập trình", Icon: Code2 },
  { code: "support", labelVi: "Hỗ trợ / tư vấn", Icon: Headphones },
  { code: "legal", labelVi: "Pháp lý / tư vấn", Icon: BookOpen },
  { code: "design", labelVi: "Thiết kế / sáng tạo", Icon: Palette },
  { code: "media", labelVi: "Truyền thông / MC", Icon: Mic2 },
  { code: "coffee", labelVi: "Dịch vụ / F&B", Icon: Coffee },
  { code: "building", labelVi: "Bất động sản / xây dựng", Icon: Building2 },
  { code: "driver", labelVi: "Vận tải / lái xe", Icon: Car },
  { code: "craft", labelVi: "Kỹ thuật / thợ", Icon: Wrench },
  { code: "construction", labelVi: "Xây dựng", Icon: Hammer },
  { code: "nonprofit", labelVi: "Xã hội / tình nguyện", Icon: HeartHandshake },
] as const;

export const DEFAULT_AVATAR_CODE = "office";

const CODE_SET = new Set(CONVERSATION_AVATARS.map((a) => a.code));

export function isValidAvatarCode(code: unknown): code is string {
  return typeof code === "string" && CODE_SET.has(code);
}

export function normalizeAvatarCode(code: unknown): string {
  return isValidAvatarCode(code) ? code : DEFAULT_AVATAR_CODE;
}

export function getAvatarIcon(code: unknown): LucideIcon {
  const c = normalizeAvatarCode(code);
  const row = CONVERSATION_AVATARS.find((a) => a.code === c);
  return row?.Icon ?? Briefcase;
}
