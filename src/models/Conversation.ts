import mongoose, { Schema, Document } from 'mongoose';
import { PRACTICE_MODES, PRACTICE_MODE_DEFAULT, type PracticeMode } from '@/lib/conversation-practice-mode';

export interface IConversation extends Document {
  user_id: mongoose.Types.ObjectId;
  chat_mode: string;
  /** Phong cách luyện: hằng ngày | chuyên ngành | kiểu IELTS Speaking */
  practice_mode: PracticeMode;
  sub_topic_id?: mongoose.Types.ObjectId | null;
  custom_topic_name: string;
  active_mission_ids: mongoose.Types.ObjectId[];
  persona_id?: mongoose.Types.ObjectId | null;
  persona_name?: string;
  persona_prompt_context?: string;
  status: string;
  /** Vị trí trên canvas trang chủ (0–1, góc trên-trái của vùng hiển thị) */
  canvas_x?: number | null;
  canvas_y?: number | null;
  /** Giới tính (ngữ cảnh nhân vật / người luyện — hiển thị trên thẻ) */
  gender?: string;
  /** Mã icon nghề/dịch vụ — ánh xạ Lucide trong app (xem `conversation-avatars`) */
  avatar_code?: string;
  /** Tuỳ chọn: URL ảnh — nếu có thì ưu tiên hơn `avatar_code` */
  avatar_url?: string | null;
  /** Tóm tắt cuộc trò chuyện — tooltip khi hover thẻ */
  summary?: string | null;
  /** Tóm tắt luân phiên (mỗi 10 tin USER+AI) — ngữ cảnh dài cho AI */
  thread_summary?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chat_mode: { type: String, enum: ['SAMPLE_TOPIC', 'CUSTOM_TOPIC', 'FREE_TALK'], required: true },
    practice_mode: {
      type: String,
      enum: PRACTICE_MODES,
      default: PRACTICE_MODE_DEFAULT,
    },
    sub_topic_id: { type: Schema.Types.ObjectId, ref: 'SubTopic', default: null },
    custom_topic_name: { type: String, required: true },
    active_mission_ids: [{ type: Schema.Types.ObjectId, ref: 'Mission' }],
    persona_id: { type: Schema.Types.ObjectId, ref: 'Persona', default: null },
    persona_name: { type: String },
    persona_prompt_context: { type: String },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    canvas_x: { type: Number, required: false },
    canvas_y: { type: Number, required: false },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'],
      default: 'UNSPECIFIED',
    },
    avatar_code: { type: String, default: 'office' },
    avatar_url: { type: String, required: false },
    summary: { type: String, required: false },
    thread_summary: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
