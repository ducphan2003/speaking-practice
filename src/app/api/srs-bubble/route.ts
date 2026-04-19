import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  await dbConnect();
  try {
    // In a real app, user_id comes from auth token
    const user_id = new mongoose.Types.ObjectId('60d5ec49f1b2c423456789ab'); // Dev mock ID
    
    // Find vocabularies due for review
    const dueVocab = await Vocabulary.findOne({
      // user_id, // Excluded for mock-dev flexibility, re-enable in prod
      'srs.next_review_date': { $lte: new Date() }
    }).sort({ 'srs.next_review_date': 1 });

    if (!dueVocab) {
      return NextResponse.json({ success: true, data: null });
    }

    // Shuffle and inject options in the real app, here is a mock slice
    const srsBubble = {
      vocab_id: dueVocab._id,
      word: dueVocab.word,
      question: "What is the meaning of this word?",
      options: [dueVocab.meaning, "To create something new", "To make an effort"],
      correct_answer: dueVocab.meaning
    };

    return NextResponse.json({ success: true, data: srsBubble });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
