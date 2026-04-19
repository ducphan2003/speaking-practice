import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import { generateHint } from '@/lib/ai-service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await params;
    const history = await Message.find({ conversation_id: id }).sort({ createdAt: 1 });
    
    // AI: Generate hints
    const hints = await generateHint(history);

    return NextResponse.json({ success: true, data: hints });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
