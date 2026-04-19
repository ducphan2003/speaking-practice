import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';
import mongoose from 'mongoose';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const dueVocab = await Vocabulary.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      'srs.next_review_date': { $lte: new Date() },
    }).sort({ 'srs.next_review_date': 1 });

    if (!dueVocab) {
      return NextResponse.json({ success: true, data: null });
    }

    const srsBubble = {
      vocab_id: dueVocab._id,
      word: dueVocab.word,
      question: 'What is the meaning of this word?',
      options: [dueVocab.meaning, 'To create something new', 'To make an effort'],
      correct_answer: dueVocab.meaning,
    };

    return NextResponse.json({ success: true, data: srsBubble });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
