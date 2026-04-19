import mongoose from 'mongoose';
import UserTopic from '@/models/UserTopic';

/** Ghi nhận user đã tương tác với chủ đề (khi lưu từ có topic). */
export async function upsertUserTopic(userId: string, topicId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(topicId)) return;
  await UserTopic.findOneAndUpdate(
    {
      user_id: new mongoose.Types.ObjectId(userId),
      topic_id: new mongoose.Types.ObjectId(topicId),
    },
    { $set: { updatedAt: new Date() } },
    { upsert: true, new: true },
  );
}
