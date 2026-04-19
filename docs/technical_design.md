# Technical Design - Database Architecture

Tài liệu này mô tả thiết kế cơ sở dữ liệu (MongoDB) cho Ứng dụng Luyện Nói Tiếng Anh. Thiết kế tập trung vào việc đáp ứng các tính năng cốt lõi: lưu trữ cuộc trò chuyện ngữ cảnh kép (dual-transcript), quản lý từ vựng thông minh (kèm SRS), và cấu trúc chủ đề / nhập vai.

---

## 1. Tổng quan các Collections (Bảng dữ liệu)

1. **`users`**: Lưu thông tin người dùng.
2. **`topics`**: Lưu các chủ đề chính (Category).
3. **`sub_topics`**: Lưu các tình huống cụ thể thuộc về Topic chính.
4. **`personas`**: Lưu cấu hình tính cách nhập vai của AI.
5. **`missions`**: Lưu các nhiệm vụ ẩn dành cho mỗi tình huống.
6. **`conversations`**: Lưu thông tin một phiên luyện tập (phòng chat).
7. **`messages`**: Lưu nội dung từng tin nhắn trong cuộc trò chuyện (hỗ trợ lưu cả Transcript 1 và 2).
8. **`vocabularies`**: Kho từ vựng của user với các metadata hỗ trợ ôn tập ngắt quãng (SRS).

---

## 2. Chi tiết Schema cho từng Collection

Dưới đây là cấu trúc dạng JSON / Mongoose Schema representation:

### 2.1. `users`
Lưu trữ thông tin cá nhân và cài đặt của người dùng.
```typescript
{
  _id: ObjectId,
  name: String,
  email: String,
  avatar_url: String,
  total_speaking_minutes: Number, // Tổng thời gian luyện tập
  created_at: Date,
  updated_at: Date
}
```

### 2.2. `topics` & `sub_topics`
Chứa kho chủ đề mẫu có sẵn trên ứng dụng.
```typescript
// Collection: topics
{
  _id: ObjectId,
  name: String,        // Tiếng Anh (VD: Travel)
  name_vi: String,     // Tiếng Việt (VD: Du lịch)
  icon: String,        // URL hình hoặc icon name
  order: Number        // Dùng để sắp xếp UI
}

// Collection: sub_topics
{
  _id: ObjectId,
  topic_id: ObjectId,  // Ref -> topics
  title: String,       // VD: "Booking a hotel room"
  title_vi: String,    // VD: "Đặt phòng khách sạn"
  description: String,
}
```

### 2.3. `personas`
Thiết lập tính cách khi bắt đầu chat. AI sẽ dựa vào prompt này để sinh câu trả lời.
```typescript
{
  _id: ObjectId,
  name: String,           // VD: "Giám khảo IELTS Hắc Ám"
  prompt_context: String, // VD: "You are a strict examiner who uses advanced vocabulary..."
  avatar_url: String,
}
```

### 2.4. `missions`
Mỗi tình huống (sub_topic) hoặc tính cách đều có thể có ngân hàng nhiệm vụ để user sinh ngẫu nhiên khi chat (3 nhiệm vụ/lần refresh).
```typescript
{
  _id: ObjectId,
  sub_topic_id: ObjectId, // (Optional) Ref -> sub_topics. Nếu null, có thể hiểu là nhiệm vụ chung.
  content: String,        // Tiếng Anh (VD: "Negotiate a 10% discount")
  content_vi: String,     // Tiếng Việt (VD: "Mặc cả giảm giá 10%")
  difficulty: String      // Enum ['EASY', 'MEDIUM', 'HARD']
}
```

### 2.5. `conversations` (Cuộc hội thoại)
Quản lý trạng thái và meta-data cho mỗi phiên luyện tập.
```typescript
{
  _id: ObjectId,
  user_id: ObjectId,              // Ref -> users
  chat_mode: String,              // Enum ['SAMPLE_TOPIC', 'CUSTOM_TOPIC', 'FREE_TALK']
  
  sub_topic_id: ObjectId,         // (Optional) Ref -> sub_topics. Có thể null nếu user chọn nhập ngoài hoặc free talk
  custom_topic_name: String,      // (Bắt buộc) Tên hiển thị của topic. Dù là tự nhập hay chọn từ sub_topic_id cũng đều gán vào đây
  active_mission_ids: [ObjectId], // Danh sách 3 ref -> missions (đang hiện trên UI)
  
  persona_id: ObjectId,           // (Optional) Ref -> personas. Có thể null nếu tự custom
  persona_name: String,           // Tên của persona dùng cho ngữ cảnh này (để tránh mất mát nếu bản ghi gốc bị xóa / hoặc cho persona custom)
  persona_prompt_context: String, // Prompt chỉ định tính cách AI

  status: String,                 // Enum ['ACTIVE', 'ARCHIVED']
  created_at: Date,
  updated_at: Date
}
```

### 2.6. `messages` (Tin nhắn / Dual-Transcript)
Thiết kế mấu chốt để phân tích đánh giá, chứa đầy đủ nguyên liệu của Transcript 1 (thực tế) và Transcript 2 (chuẩn hóa).
```typescript
{
  _id: ObjectId,
  conversation_id: ObjectId,  // Ref -> conversations
  sender: String,             // Enum ['USER', 'AI', 'SYSTEM_SRS'] 
                              // (SYSTEM_SRS là loại tin nhắn bong bóng hỏi từ vựng)

  // 1. Phục vụ việc AI đọc hiểu & UI hiển thị Text chính (Dành cho cả AI và User)
  content: String,            // - Nếu là User: Đây là Transcript 2 (Đã sửa lỗi logic/ngữ pháp nhẹ)
                              // - Nếu là AI / SYSTEM: Đây là lời AI nói.
  
  // 2. Phục vụ đánh giá (Chỉ dành cho tin nhắn của User)
  original_transcript: String, // Transcript 1 (Raw Voice-to-Text). Chứa các lỗi lặp từ, "ờ à".
  audio_url: String,           // (Optional) link file ghi âm trên S3/Cloud Storage, phục vụ tính năng "Luyện đọc lại".
  
  // 3. Phân tích lỗi (Được tính toán từ việc so khớp Transcript 1 và Transcript 2)
  evaluation: {
    pronunciation_score: Number,  // 0 - 100
    grammar_score: Number,        // 0 - 100
    details: [
      {
        error_type: String,      // Enum ['PRONUNCIATION', 'GRAMMAR', 'VOCAB']
        word: String,            // Chữ bị sai (VD: "goes")
        correction: String,      // Gợi ý sửa (VD: "went")
        explanation: String      // Giải thích ngắn gọn
      }
    ]
  },

  created_at: Date
}
```

### 2.7. `vocabularies` (Kho từ vựng & Ôn tập SRS)
Lưu từ vựng của user kèm tham số tính toán thời điểm xuất hiện của bong bóng ôn tập.
```typescript
{
  _id: ObjectId,
  user_id: ObjectId,          // Ref -> users
  conversation_id: ObjectId,  // (Optional) Lưu lại ngữ cảnh lấy từ cuộc chat nào
  
  word: String,               // VD: "Procrastinate"
  meaning: String,            // Nghĩa tiếng việt
  word_type: String,          // Danh, Động, Tính từ
  ipa: String,                // VD: /prəˈkræs.tə.neɪt/
  example_sentence: String,   // VD: "I often procrastinate when..."
  user_note: String,          // Ghi chú tự edit của user
  
  // Thuộc tính SRS (Spaced Repetition System: Ví dụ thuật toán SuperMemo-2)
  srs: {
    repetition_count: Number, // Số lần đã ôn tập (Mặc định 0)
    ease_factor: Number,      // (Mặc định 2.5) Trị số thay đổi dựa theo user nhớ/quên
    interval: Number,         // (Mặc định 0) Số ngày đến lần ôn tiếp theo
    next_review_date: Date    // Ngày tới hạn ôn tập (Dựa vào ngày này để trích xuất xuất hiện thành bong bóng chat)
  },

  created_at: Date,
  updated_at: Date
}
```

---

## 3. Một số Logic Truy Vấn Chính (Key Database Queries)

1. **Lấy lịch sử hội thoại cho AI (Get AI Context):**
   - Chỉ SELECT cột `sender` và cột `content` của bảng `messages` (bỏ qua `original_transcript` và `evaluation`) của một `conversation_id`. Điều này giúp tối ưu hóa Token khi truyền input vào Model (GPT/Claude).
2. **Kích hoạt System SRS Bubble (Bong bóng ôn tập ngắt quãng):**
   - `SELECT * FROM vocabularies WHERE user_id = ? AND srs.next_review_date <= NOW() ORDER BY next_review_date ASC LIMIT 1`
   - Khi thỏa mãn, hệ thống append một message dạng `sender: 'SYSTEM_SRS'` vào bảng `messages`.
3. **Thống kê luyện tập nhanh UI Dashboard:**
   - Đếm User Vocab: `Count(vocabularies WHERE user_id = ?)`
   - Cập nhật số phút luyện nói có thể build một trigger móc vào trường `audio_url` thời lượng hoặc update độc lập.
