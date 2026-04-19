import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Mission from '@/models/Mission';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const sub_topic_id = searchParams.get('sub_topic_id');
    
    let query: any = {};
    if (sub_topic_id && mongoose.Types.ObjectId.isValid(sub_topic_id)) {
      query.sub_topic_id = new mongoose.Types.ObjectId(sub_topic_id);
    }
    
    // Lấy ngẫu nhiên 3 nhiệm vụ
    const missions = await Mission.aggregate([
      { $match: query },
      { $sample: { size: 3 } }
    ]);
    
    return NextResponse.json({ success: true, data: missions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
