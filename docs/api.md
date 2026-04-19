# Tài liệu API - English Speaking Practice App

Tài liệu này đặc tả các endpoint backend (Next.js Route Handlers trong `src/app/api/`) và trạng thái triển khai trong codebase.

**Xác thực:** Các API ghi `Require Token: Yes` cần header `Authorization: Bearer <token>` (JWT do server cấp sau đăng nhập Google).

---

## Quy ước trường trạng thái code

Mỗi endpoint có trường **`code_status`** với một trong các giá trị sau:

| Giá trị | Ý nghĩa |
|---------|---------|
| `có` | Đã có file route, gọi API trả về JSON theo luồng chính (kết nối DB khi cần). |
| `có (AI mock)` | Route đã có; phần gọi LLM / chấm điểm / TTS / gợi ý nằm trong `src/lib/ai-service.ts` và hiện **chưa** nối provider thật (trả về dữ liệu giả lập). |
| `không` | Chưa có route tương ứng trong repo (chỉ ghi trong tài liệu kế hoạch / requirement). |

Đường dẫn file tham chiếu nhanh: `src/app/api/<...>/route.ts`.

---

## 0. Xác thực (Auth)

### 0.1 Đăng nhập Google (OAuth) — cấp JWT

- **Endpoint:** `/api/auth/google`
- **Method:** `POST`
- **Require Token:** No
- **code_status:** `có` — `src/app/api/auth/google/route.ts`
- **Logic:** Nhận `idToken` từ Google Sign-In, xác thực, tạo/cập nhật user trong DB, trả về JWT ký bằng `JWT_SECRET`.
- **Request body:**
  ```json
  { "idToken": "<google credential JWT>" }
  ```
- **Response Example:**
  ```json
  {
    "success": true,
    "data": {
      "token": "<app-jwt>",
      "user": {
        "_id": "...",
        "name": "...",
        "email": "...",
        "avatar_url": "...",
        "total_speaking_minutes": 0
      }
    }
  }
  ```

---

## 1. Nhóm API Chủ đề (Topics & Subtopics)

### 1.1 Lấy danh sách Topic

- **Endpoint:** `/api/topics`
- **Method:** `GET`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/topics/route.ts`
- **Logic:** Truy xuất danh sách chủ đề, sắp xếp theo `order` (Dashboard).
- **Request:** Không có body.
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
- **code_status:** `có` — `src/app/api/topics/[id]/sub-topics/route.ts`
- **Logic:** Lấy sub-topic thuộc `topic_id` = `:id`.
- **Request:** `param` `id` — Topic ID.
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
- **code_status:** `có` — `src/app/api/personas/route.ts`
- **Logic:** Trả về toàn bộ persona (gồm `name`, `prompt_context`, `avatar_url`, …).
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "...",
        "name": "Giám khảo IELTS nghiêm khắc",
        "prompt_context": "...",
        "avatar_url": "https://..."
      }
    ]
  }
  ```

### 2.2 Lấy ngẫu nhiên Nhiệm vụ ẩn (Missions)

- **Endpoint:** `/api/missions/random`
- **Method:** `GET`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/missions/random/route.ts`
- **Logic:** Lấy ngẫu nhiên tối đa 3 mission; nếu có `sub_topic_id` thì lọc theo sub-topic.
- **Query:** `sub_topic_id` (optional).
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "mis_123...",
        "content": "Negotiate a discount",
        "content_vi": "Mặc cả để được giảm giá",
        "difficulty": "MEDIUM"
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
- **code_status:** `có` — `src/app/api/conversations/route.ts`
- **Logic:** Tạo conversation gắn `user_id` từ JWT; load persona để lưu `persona_name`, `persona_prompt_context`. `chat_mode` hợp lệ: `SAMPLE_TOPIC` | `CUSTOM_TOPIC` | `FREE_TALK` (UI có thể gửi alias `CUSTOM` → server map sang `CUSTOM_TOPIC`).
- **Request body:**
  ```json
  {
    "chat_mode": "SAMPLE_TOPIC",
    "sub_topic_id": "64b1f4...",
    "custom_topic_name": "Booking a hotel room",
    "persona_id": "..."
  }
  ```
- **Response:** `201` — `{ "success": true, "data": <Conversation document> }`

### 3.2 Lấy chi tiết một cuộc hội thoại

- **Endpoint:** `/api/conversations/:id`
- **Method:** `GET`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/conversations/[id]/route.ts`
- **Logic:** Chỉ trả về nếu conversation thuộc user trong JWT.
- **Response Example:**
  ```json
  {
    "success": true,
    "data": {
      "_id": "...",
      "user_id": "...",
      "chat_mode": "SAMPLE_TOPIC",
      "sub_topic_id": "...",
      "custom_topic_name": "...",
      "persona_id": "...",
      "persona_name": "...",
      "persona_prompt_context": "...",
      "status": "ACTIVE"
    }
  }
  ```

### 3.3 Cập nhật / Đóng phòng chat

- **Endpoint:** `/api/conversations/:id`
- **Method:** `PATCH`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/conversations/[id]/route.ts`
- **Logic:** Cập nhật field (ví dụ `status: "ARCHIVED"`); chỉ owner mới được sửa.
- **Request body (ví dụ):**
  ```json
  { "status": "ARCHIVED" }
  ```
- **Response Example:**
  ```json
  {
    "success": true,
    "message": "Conversation updated.",
    "data": { "...": "..." }
  }
  ```

---

## 4. Nhóm API Tin nhắn & Gợi ý (Messages & Hint)

### 4.1 Lấy lịch sử tin nhắn trong phòng

- **Endpoint:** `/api/conversations/:id/messages`
- **Method:** `GET`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/conversations/[id]/messages/route.ts`
- **Logic:** Trả về mảng message của conversation (sắp xếp theo thời gian); chỉ owner.
- **Response Example:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "...",
        "conversation_id": "...",
        "sender": "USER",
        "content": "...",
        "original_transcript": "...",
        "evaluation": { "pronunciation_score": 90, "grammar_score": 85, "details": [] }
      }
    ]
  }
  ```

### 4.2 Gửi tin nhắn User & nhận phản hồi AI (Dual-Transcript)

- **Endpoint:** `/api/conversations/:id/messages`
- **Method:** `POST`
- **Require Token:** Yes
- **code_status:** `có (AI mock)` — `src/app/api/conversations/[id]/messages/route.ts` + `src/lib/ai-service.ts`
- **Logic:** Chuẩn hóa transcript, đánh giá, sinh câu trả lời AI, TTS (hiện mock), lưu 2 bản ghi message (USER + AI).
- **Request body:**
  ```json
  {
    "original_transcript": "I goes to hotel yesterday.",
    "audio_url": "https://..."
  }
  ```
- **Response:** Trả về document Mongoose `user_message`, `ai_message` (field âm thanh AI: `audio_url`).

### 4.3 Gợi ý câu trả lời (Hint)

- **Endpoint:** `/api/conversations/:id/hint`
- **Method:** `GET`
- **Require Token:** Yes
- **code_status:** `có (AI mock)` — `src/app/api/conversations/[id]/hint/route.ts` + `src/lib/ai-service.ts`
- **Response Example:**
  ```json
  {
    "success": true,
    "data": "One complete sample reply in English (about 30–40 words)."
  }
  ```

---

## 5. Nhóm API Từ vựng & SRS

### 5.1 Lưu từ vựng (Quick Save)

- **Endpoint:** `/api/vocabularies`
- **Method:** `POST`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/vocabularies/route.ts`
- **Logic:** Lưu `topic_id` (ref `topics._id`) nếu có; nếu chỉ gửi `conversation_id` mà không có `topic_id`, server suy ra topic từ `sub_topic_id` của conversation. Khi có topic hợp lệ, **upsert** bảng `user_topics` (user + topic).
- **Request body:** `word`, `meaning`, `word_type` (bắt buộc); `ipa`, `example_sentence`, `user_note`, `conversation_id`, `topic_id`, `mastered` (tùy chọn).

### 5.2 Danh sách từ vựng

- **Endpoint:** `/api/vocabularies`
- **Method:** `GET`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/vocabularies/route.ts`
- **Query:**
  - `search` — tìm trong `word` hoặc `meaning` (optional).
  - `conversation_id` — chỉ từ trong một phiên chat (optional).
  - `topic_id` — lọc theo chủ đề (optional).
  - `date_from`, `date_to` — khoảng ngày tạo (`createdAt`), định dạng ISO date (optional).
  - `mastered` — `true` / `false` (optional).
  - `sort` — `date_desc` (mặc định), `date_asc`, `alpha_asc`, `alpha_desc`.
- **Response:** Mỗi phần tử populate `topic_id` (`name`, `name_vi`, …).

### 5.3 Cập nhật một từ vựng

- **Endpoint:** `/api/vocabularies/:id`
- **Method:** `PATCH`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/vocabularies/[id]/route.ts`
- **Logic:** Chỉ owner; có thể đổi `word`, `meaning`, `word_type`, `ipa`, `topic_id` (hoặc `null` để bỏ), `mastered`, … Nếu gán `topic_id` mới, upsert `user_topics`.

### 5.4 SRS Bubble — từ cần ôn

- **Endpoint:** `/api/srs-bubble`
- **Method:** `GET`
- **Require Token:** Yes
- **code_status:** `có` — `src/app/api/srs-bubble/route.ts`
- **Logic:** Tìm một từ của user có `next_review_date <= now`, trả về object câu hỏi trắc nghiệm; không có thì `data: null`.

---

## 6. Tiện ích phát triển / DB (không dùng production trực tiếp)

### 6.1 Seed dữ liệu mẫu

- **Endpoint:** `/api/seed`
- **Method:** `GET`
- **Require Token:** No
- **code_status:** `có` — `src/app/api/seed/route.ts`
- **Logic:** Xóa và nạp lại topic, sub-topic, persona, mission mẫu (nguy hiểm nếu public).
- **Ghi chú:** Chỉ bật trong môi trường dev / có bảo vệ (firewall, secret, v.v.).

### 6.2 Kiểm tra kết nối DB

- **Endpoint:** `/api/test-db`
- **Method:** `GET`
- **Require Token:** No
- **code_status:** `có` — `src/app/api/test-db/route.ts`
- **Logic:** Trả về trạng thái `mongoose.connection.readyState` và thông báo kết nối.

---

## Phụ lục — Tính năng đã mô tả trong requirement/plan nhưng **chưa có** `code_status: có`

Các mục sau **không** có route tương ứng trong `src/app/api/` tại thời điểm cập nhật tài liệu này:

| Mục | Mô tả ngắn |
|-----|------------|
| `DELETE /api/vocabularies/:id` | Xóa một từ khỏi kho (chưa có route). |
| API upload audio / STT | Nhận file giọng nói hoặc URL sau upload; có thể tách khỏi `POST .../messages`. |
| API “Luyện đọc lại” (retry pronunciation) | Luyện phát âm không tính là tin nhắn mới. |
| Lọc vocab theo tag | Field `tag` / query `tag` (chưa có). |

---

*Tài liệu đồng bộ với cấu trúc route trong repo; khi thêm endpoint mới, cập nhật bảng `code_status` và phụ lục tương ứng.*
