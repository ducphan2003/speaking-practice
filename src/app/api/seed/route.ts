/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Topic from '@/models/Topic';
import SubTopic from '@/models/SubTopic';
import Persona from '@/models/Persona';
import Mission from '@/models/Mission';
import MasterConfig from '@/models/MasterConfig';
import { AI_STEP_KEYS } from '@/lib/ai-step-keys';
import { invalidateMasterConfigCache } from '@/lib/master-config';

export async function GET() {
  await dbConnect();

  try {
    // Clear existing
    await Topic.deleteMany({});
    await SubTopic.deleteMany({});
    await Persona.deleteMany({});
    await Mission.deleteMany({});

    // 1. Seed Personas
    const personas = await Persona.insertMany([
      { name: "Friendly Guide", prompt_context: "You are a very friendly travel guide who uses simple English.", avatar_url: "" },
      { name: "Strict Examiner", prompt_context: "You are an IELTS examiner. Be strict and point out mistakes.", avatar_url: "" },
      { name: "Casual Friend", prompt_context: "You are my best friend. Talk very casually.", avatar_url: "" }
    ]);

    // 2. Seed Topics
    const topics = await Topic.insertMany([
      { name: "Travel", name_vi: "Du lịch", icon: "plane", order: 1 },
      { name: "Food", name_vi: "Ẩm thực", icon: "utensils", order: 2 },
      { name: "Work", name_vi: "Công việc", icon: "briefcase", order: 3 }
    ]);

    // 3. Seed SubTopics
    const subTopics = await SubTopic.insertMany([
      { topic_id: topics[0]._id, title: "Booking a hotel", title_vi: "Đặt phòng khách sạn" },
      { topic_id: topics[0]._id, title: "Asking for directions", title_vi: "Hỏi đường" },
      { topic_id: topics[1]._id, title: "Ordering food", title_vi: "Gọi món ăn" },
      { topic_id: topics[2]._id, title: "Job interview", title_vi: "Phỏng vấn xin việc" }
    ]);

    // 4. Seed Missions
    await Mission.insertMany([
      { sub_topic_id: subTopics[0]._id, content: "Ask for a discount", content_vi: "Xin giảm giá", difficulty: "MEDIUM" },
      { sub_topic_id: subTopics[0]._id, content: "Ask for a room with a view", content_vi: "Xin phòng có view đẹp", difficulty: "EASY" },
      { sub_topic_id: subTopics[0]._id, content: "Complain about the noise", content_vi: "Phàn nàn về tiếng ồn", difficulty: "HARD" },
      { sub_topic_id: subTopics[2]._id, content: "Ask for the menu", content_vi: "Hỏi xin thực đơn", difficulty: "EASY" }
    ]);

    const defaultModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    await MasterConfig.bulkWrite([
      {
        updateOne: {
          filter: { key: AI_STEP_KEYS.NORMALIZE_TRANSCRIPT },
          update: {
            $set: {
              value: { name: 'Chuẩn hóa transcript (Dual T2)', model: defaultModel },
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { key: AI_STEP_KEYS.EVALUATE_SPEAKING },
          update: {
            $set: {
              value: { name: 'Đánh giá phát âm / ngữ pháp', model: defaultModel },
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { key: AI_STEP_KEYS.CHAT_REPLY },
          update: {
            $set: {
              value: { name: 'Trả lời hội thoại (persona)', model: defaultModel },
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { key: AI_STEP_KEYS.HINT },
          update: {
            $set: {
              value: { name: 'Gợi ý câu trả lời', model: defaultModel },
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { key: AI_STEP_KEYS.GENERIC_TEXT },
          update: {
            $set: {
              value: { name: 'Prompt chữ tổng quát', model: defaultModel },
            },
          },
          upsert: true,
        },
      },
    ]);

    invalidateMasterConfigCache();

    return NextResponse.json({ success: true, message: "Database seeded successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
