import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  GraduationCap,
  MessageCircle,
  Plane,
  Utensils,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  plane: Plane,
  travel: Plane,
  food: Utensils,
  work: Briefcase,
  academic: GraduationCap,
  daily: MessageCircle,
};

export function iconForTopic(icon?: string | null): LucideIcon {
  if (!icon) return MessageCircle;
  const k = icon.toLowerCase().replace(/\s+/g, "_");
  return map[k] ?? MessageCircle;
}
