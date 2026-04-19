import mongoose, { Schema, Document } from 'mongoose';

export interface IUserTopic extends Document {
  user_id: mongoose.Types.ObjectId;
  topic_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Bảng quan hệ user ↔ chủ đề (upsert khi user lưu từ gắn topic). Collection: `user_topics`. */
const UserTopicSchema: Schema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topic_id: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  },
  { timestamps: true },
);

UserTopicSchema.index({ user_id: 1, topic_id: 1 }, { unique: true });

export default mongoose.models.UserTopic || mongoose.model<IUserTopic>('UserTopic', UserTopicSchema, 'user_topics');
