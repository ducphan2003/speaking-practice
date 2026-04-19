import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SubTopic from '@/models/SubTopic';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const { id } = await params;
    const subTopics = await SubTopic.find({ topic_id: id });
    return NextResponse.json({ success: true, data: subTopics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
