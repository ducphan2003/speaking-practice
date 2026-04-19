import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { normalizeTranscript, evaluateSpeaking, generateAIReply, textToSpeech } from '@/lib/ai-service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await params;
    const { original_transcript, audio_url } = await req.json();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }

    // 1. AI: Normalize transcript
    const normalized = await normalizeTranscript(original_transcript);

    // 2. AI: Evaluate speaking
    const evaluation = await evaluateSpeaking(original_transcript, normalized);

    // 3. Save User Message (Transcript 2/Normalized as content)
    const userMessage = await Message.create({
      conversation_id: id,
      sender: 'USER',
      content: normalized,
      original_transcript,
      audio_url,
      evaluation
    });

    // 4. Fetch history for context
    const history = await Message.find({ conversation_id: id }).sort({ createdAt: 1 });

    // 5. AI: Generate Reply
    const aiContent = await generateAIReply(history, normalized, conversation.persona_prompt_context || '');

    // 6. AI: Text-to-Speech
    const aiAudioUrl = await textToSpeech(aiContent);

    // 7. Save AI Message
    const aiMessage = await Message.create({
      conversation_id: id,
      sender: 'AI',
      content: aiContent,
      audio_url: aiAudioUrl
    });

    return NextResponse.json({
      success: true,
      user_message: userMessage,
      ai_message: aiMessage
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
