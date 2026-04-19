# Tài liệu API - English Speaking Practice App

Tài liệu này đặc tả chi tiết về các hệ thống API (BE endpoint) cần được triển khai dựa trên kế hoạch `docs/plan.md`. Tất cả các API yêu cầu Auth sẽ truyền token vào Header `Authorization: Bearer <token>`.

---

## 1. Nhóm API Chủ đề (Topics & Subtopics)

### 1.1 Lấy danh sách Topic
- **Endpoint:** `/api/topics`
- **Method:** `GET`
- **Require Token:** Yes
- **Logic:** Truy xuất danh sách các chủ đề chính (categories) có trong hệ thống, sắp xếp theo thứ tự `order` dành cho màn hình Trang chủ (Dashboard).
- **Request:** 
  - `None`
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60d5ec49f1b2c4...",
        "name": "Travel",
        "name_vi": "Du lịch",
        "icon": "plane",
        "order": 1
      }
    ]
  }
  ```

### 1.2 Lấy danh sách Sub-topics của một Topic
- **Endpoint:** `/api/topics/:id/sub-topics`
- **Method:** `GET`
- **Require Token:** Yes
- **Logic:** Lấy các tình huống hội thoại nhánh (sub-topics) khi user nhấn vào một category lớn ở Trang chủ.
- **Request:** 
  - `param:` `id` (Topic ID)
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "64b1f4...",
        "topic_id": "60d5ec49f1b2c4...",
        "title": "Booking a hotel room",
        "title_vi": "Đặt phòng khách sạn"
      }
    ]
  }
  ```

---

## 2. Nhóm API Thiết lập (Personas & Missions)

### 2.1 Lấy danh sách Tính cách AI (Personas)
- **Endpoint:** `/api/personas`
- **Method:** `GET`
- **Require Token:** Yes
- **Logic:** Lấy danh sách các nhân vật mẫu (personas) để hiển thị trên tùy chọn Dropdown khi Setup Room phòng chat.
- **Request:** 
  - `None`
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "per_123...",
        "name": "Giám khảo IELTS nghiêm khắc",
        "avatar_url": "https://..."
      }
    ]
  }
  ```

### 2.2 Lấy ngẫu nhiên Nhiệm vụ ẩn (Missions)
- **Endpoint:** `/api/missions/random`
- **Method:** `GET`
- **Require Token:** Yes
- **Logic:** Lấy ngẫu nhiên 3 nhiệm vụ để giúp điều hướng cuộc trò chuyện. Phục vụ tính năng xoay vòng (nút Refresh task icon).
- **Request:**
  - `query:` `sub_topic_id` (Tùy chọn, dùng để query nhiệm vụ theo hoàn cảnh).
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "mis_123...",
        "content": "Negotiate a discount",
        "content_vi": "Mặc cả để được giảm giá"
      }
    ]
  }
  ```

---

## 3. Nhóm API Quản lý Cuộc Hội Thoại (Conversations)

### 3.1 Khởi tạo Phòng luyện nói
- **Endpoint:** `/api/conversations`
- **Method:** `POST`
- **Require Token:** Yes
- **Logic:** Tạo bản ghi mới cho một phiên hội thoại, lưu cấu hình (sub-topic, mode, persona context) để làm bối cảnh hệ thống cho AI dựa theo lựa chọn của UI Modal.
- **Request:**
  - `body:`
    ```json
    {
      "chat_mode": "SAMPLE_TOPIC",
      "sub_topic_id": "64b1f4...",
      "custom_topic_name": "Booking a hotel room",
      "persona_id": "per_123..."
    }
    ```
- **Response Example:**
  ```json
  {
    "success": true,
    "data": {
      "_id": "conv_999...",
      "status": "ACTIVE",
      "created_at": "2026-04-19T09:30:00Z"
    }
  }
  ```

### 3.2 Kết thúc/Đóng phòng chat
- **Endpoint:** `/api/conversations/:id`
- **Method:** `PATCH`
- **Require Token:** Yes
- **Logic:** Chuyển đổi trạng thái `status` sang `ARCHIVED` để dừng luyện tập.
- **Request:**
  - `param:` `id` (Conversation ID)
  - `body:`
    ```json
    { "status": "ARCHIVED" }
    ```
- **Response Example:**
  ```json
  { "success": true, "message": "Conversation archived." }
  ```

---

## 4. Nhóm API Tương tác Chat & Phân tích (Messages & AI Evaluation)

### 4.1 Gửi tin nhắn User & Lấy AI Reply (Dual-Transcript System)
- **Endpoint:** `/api/conversations/:id/messages`
- **Method:** `POST`
- **Require Token:** Yes
- **Logic:** 
  1. FE gửi chuỗi VTT transcript thực tế (Gồm lỗi vấp, sai ngữ pháp) và audio url.
  2. BE gọi API LLM xử lý ra "Transcript 2 chuẩn hóa" & Phân tích lỗi (Đánh giá).
  3. Gửi Transcript 2 đó để nhờ Persona bot sinh câu trả lời chat (AI Reply).
  4. Lưu cùng lúc nội dung User nói và nội dung AI trả lời vào db.
- **Request:**
  - `param:` `id` (Conversation ID)
  - `body:`
    ```json
    {
      "original_transcript": "I goes to hotel yesterday.",
      "audio_url": "https://s3.bucket.../voice.webm"
    }
    ```
- **Response Example:**
  ```json
  {
    "success": true,
    "user_message": {
      "content": "I went to the hotel yesterday.",
      "original_transcript": "I goes to hotel yesterday.",
      "evaluation": {
        "pronunciation_score": 85,
        "grammar_score": 70,
        "details": [{ "error_type": "GRAMMAR", "word": "goes", "correction": "went", "explanation": "Dùng sai thì ở Quá khứ đơn." }]
      }
    },
    "ai_message": {
      "content": "Oh, how was your experience staying there?",
      "audio_url_tts": "https://s3.bucket.../ai_reply.webm"
    }
  }
  ```

### 4.2 Gợi ý câu trả lời (Hint AI)
- **Endpoint:** `/api/conversations/:id/hint`
- **Method:** `GET`
- **Require Token:** Yes
- **Logic:** Sử dụng History context của phòng chat và nhờ LLM sinh ra 2-3 mẫu ý tưởng/câu trả lời giúp user khi bị bí (Click vào bóng đèn vàng).
- **Request:**
  - `param:` `id` (Conversation ID)
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      "The room was smaller than I expected.",
      "I had a wonderful night out."
    ]
  }
  ```

---

## 5. Nhóm API Quản lý Từ vựng & Spaced Repetition (SRS)

### 5.1 Lưu Từ Vựng mới (Quick Save)
- **Endpoint:** `/api/vocabularies`
- **Method:** `POST`
- **Require Token:** Yes
- **Logic:** Khi người dùng tra Pop-up dịch và nhấn "Save", lưu từ này vào Warehouse. Tạo thông số gốc cho thuật toán SRS.
- **Request:**
  - `body:`
    ```json
    {
      "conversation_id": "conv_999...",
      "word": "Procrastinate",
      "meaning": "Trì hoãn",
      "word_type": "Verb",
      "ipa": "/prəˈkræs.tə.neɪt/",
      "example_sentence": "I usually procrastinate on tasks."
    }
    ```
- **Response Example:**
  ```json
  { "success": true, "data": { "_id": "voc_111..." } }
  ```

### 5.2 Lọc và Xem kho Từ Vựng
- **Endpoint:** `/api/vocabularies`
- **Method:** `GET`
- **Require Token:** Yes
- **Logic:** Lấy danh sách cho Màn hình Vocabulary Hub. Có thể search hoặc lọc theo thời gian.
- **Request:**
  - `query:` `search` (Search text - Optional)
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "voc_111...",
        "word": "Procrastinate",
        "meaning": "Trì hoãn",
        "srs": { "repetition_count": 0 }
      }
    ]
  }
  ```

### 5.3 Fetch Từ vựng cho SRS Bubble
- **Endpoint:** `/api/srs-bubble`
- **Method:** `GET`
- **Require Token:** Yes
- **Logic:** Hệ thống poll tìm kiếm xem User hiện tại có bất kỳ từ nào đạt điều kiện `next_review_date <= NOW()` hay không. Nếu có, bốc 1 từ sinh ra bài trắc nghiệm nhanh hiển thị xen kẽ màn hình chat.
- **Request:** `None`
- **Response Example:**
  ```json
  {
    "success": true,
    "data": {
      "vocab_id": "voc_111...",
      "word": "Procrastinate",
      "question": "Choose the correct meaning:",
      "options": ["Trì hoãn", "Sáng tạo", "Nỗ lực"],
      "correct_answer": "Trì hoãn"
    }
  }
  ```
  *(Trả về `data: null` nếu không có từ vựng nào cần ôn tập hôm nay)*
