import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';
import mongoose from 'mongoose';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';
import { upsertUserTopic } from '@/lib/user-topic';

async function getOwnedVocab(id: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Vocabulary.findById(id);
  if (!doc || String(doc.user_id) !== userId) return null;
  return doc;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const { id } = await params;
    const existing = await getOwnedVocab(id, userId);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Vocabulary not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.word === 'string') updates.word = body.word.trim();
    if (typeof body.meaning === 'string') updates.meaning = body.meaning.trim();
    if (typeof body.word_type === 'string') updates.word_type = body.word_type.trim();
    if (body.ipa !== undefined) updates.ipa = typeof body.ipa === 'string' ? body.ipa.trim() : body.ipa;
    if (typeof body.example_sentence === 'string') updates.example_sentence = body.example_sentence;
    if (typeof body.user_note === 'string') updates.user_note = body.user_note;
    if (typeof body.mastered === 'boolean') updates.mastered = body.mastered;

    if (body.topic_id !== undefined) {
      if (body.topic_id === null || body.topic_id === '') {
        updates.topic_id = null;
      } else if (mongoose.Types.ObjectId.isValid(body.topic_id)) {
        updates.topic_id = new mongoose.Types.ObjectId(body.topic_id);
      } else {
        return NextResponse.json({ success: false, message: 'Invalid topic_id' }, { status: 400 });
      }
    }

    const updated = await Vocabulary.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Update failed' }, { status: 500 });
    }

    const newTopicId = updated.topic_id ? String(updated.topic_id) : null;
    if (newTopicId) {
      await upsertUserTopic(userId, newTopicId);
    }

    const populated = await Vocabulary.findById(updated._id).populate('topic_id', 'name name_vi icon order');

    return NextResponse.json({ success: true, data: populated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
