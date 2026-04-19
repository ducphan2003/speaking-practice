import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Topic from '@/models/Topic';
import { getUserIdFromRequest, unauthorized } from '@/lib/auth';

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return unauthorized();

  await dbConnect();
  try {
    const topics = await Topic.find().sort({ order: 1 });
    return NextResponse.json({ success: true, data: topics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
