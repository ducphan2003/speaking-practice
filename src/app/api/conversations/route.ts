import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    
    // Hardcoded user_id for now as token validation isn't injected in this route yet.
    const user_id = new mongoose.Types.ObjectId(); 
    
    const newConversation = await Conversation.create({
      user_id,
      chat_mode: body.chat_mode,
      sub_topic_id: body.sub_topic_id,
      custom_topic_name: body.custom_topic_name,
      persona_id: body.persona_id,
      status: 'ACTIVE'
    });

    return NextResponse.json({ success: true, data: newConversation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
