import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';
import Conversation from '@/models/Conversation';
import SubTopic from '@/models/SubTopic';
import mongoose from 'mongoose';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';
import { upsertUserTopic } from '@/lib/user-topic';

function parseSort(sortParam: string | null): Record<string, 1 | -1> {
  switch (sortParam) {
    case 'date_asc':
      return { createdAt: 1 };
    case 'alpha_asc':
      return { word: 1 };
    case 'alpha_desc':
      return { word: -1 };
    case 'date_desc':
    default:
      return { createdAt: -1 };
  }
}

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const conversationId = searchParams.get('conversation_id');
    const topicId = searchParams.get('topic_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const masteredOnly = searchParams.get('mastered');
    const sortParam = searchParams.get('sort');

    const query: Record<string, unknown> = {
      user_id: new mongoose.Types.ObjectId(userId),
    };

    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      query.conversation_id = new mongoose.Types.ObjectId(conversationId);
    }

    if (topicId && mongoose.Types.ObjectId.isValid(topicId)) {
      query.topic_id = new mongoose.Types.ObjectId(topicId);
    }

    if (masteredOnly === 'true') {
      query.mastered = true;
    } else if (masteredOnly === 'false') {
      query.mastered = false;
    }

    if (dateFrom || dateTo) {
      const range: { $gte?: Date; $lte?: Date } = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          range.$lte = d;
        }
      }
      if (Object.keys(range).length) query.createdAt = range;
    }

    if (search?.trim()) {
      const s = search.trim();
      query.$or = [
        { word: { $regex: s, $options: 'i' } },
        { meaning: { $regex: s, $options: 'i' } },
      ];
    }

    const sort = parseSort(sortParam);

    const vocabularies = await Vocabulary.find(query).sort(sort).populate('topic_id', 'name name_vi icon order');

    return NextResponse.json({ success: true, data: vocabularies });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

async function resolveTopicIdFromConversation(conversationId: string | undefined): Promise<string | null> {
  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) return null;
  const conv = await Conversation.findById(conversationId)
    .lean<{ sub_topic_id?: mongoose.Types.ObjectId | null }>()
    .exec();
  if (!conv?.sub_topic_id) return null;
  const st = await SubTopic.findById(conv.sub_topic_id)
    .lean<{ topic_id?: mongoose.Types.ObjectId | null }>()
    .exec();
  if (!st?.topic_id) return null;
  return String(st.topic_id);
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const body = await req.json();

    let topicId: string | null = body.topic_id || null;
    if (topicId && !mongoose.Types.ObjectId.isValid(topicId)) {
      topicId = null;
    }
    if (!topicId && body.conversation_id) {
      topicId = await resolveTopicIdFromConversation(body.conversation_id);
    }

    const newVocab = await Vocabulary.create({
      user_id: new mongoose.Types.ObjectId(userId),
      conversation_id: body.conversation_id,
      topic_id: topicId ? new mongoose.Types.ObjectId(topicId) : null,
      mastered: Boolean(body.mastered),
      word: body.word,
      meaning: body.meaning,
      word_type: body.word_type,
      ipa: body.ipa,
      example_sentence: body.example_sentence,
      user_note: body.user_note,
    });

    if (topicId) {
      await upsertUserTopic(userId, topicId);
    }

    const populated = await Vocabulary.findById(newVocab._id).populate('topic_id', 'name name_vi icon order');

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
