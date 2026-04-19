import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    
    // In a real app, user_id comes from auth token
    const user_id = new mongoose.Types.ObjectId('60d5ec49f1b2c423456789ab'); // Dev mock ID
    
    let query: any = {}; // In production: { user_id }
    if (search) {
      query.word = { $regex: search, $options: 'i' };
    }
    
    const vocabularies = await Vocabulary.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: vocabularies });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    
    // In a real app, user_id comes from auth token
    const user_id = new mongoose.Types.ObjectId('60d5ec49f1b2c423456789ab'); // Dev mock ID
    
    const newVocab = await Vocabulary.create({
      user_id,
      conversation_id: body.conversation_id,
      word: body.word,
      meaning: body.meaning,
      word_type: body.word_type,
      ipa: body.ipa,
      example_sentence: body.example_sentence,
      user_note: body.user_note
    });

    return NextResponse.json({ success: true, data: newVocab }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
