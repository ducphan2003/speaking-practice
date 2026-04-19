import mongoose, { Schema, Document } from 'mongoose';

export interface ISubTopic extends Document {
  topic_id: mongoose.Types.ObjectId;
  title: string;
  title_vi: string;
  description: string;
}

const SubTopicSchema: Schema = new Schema({
  topic_id: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  title: { type: String, required: true },
  title_vi: { type: String, required: true },
  description: { type: String },
});

export default mongoose.models.SubTopic || mongoose.model<ISubTopic>('SubTopic', SubTopicSchema);
