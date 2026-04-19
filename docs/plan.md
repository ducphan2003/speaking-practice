# Kế hoạch Phát triển - Ứng dụng Luyện Nói Tiếng Anh (English Speaking Practice App)

Dựa trên các tài liệu yêu cầu (requirement.md), thiết kế kỹ thuật (technical_design.md) và thiết kế giao diện (ui_design.md), dưới đây là chi tiết các bước phát triển cho Backend và Frontend.

---

## Giai đoạn 1: Khởi tạo và Cấu hình Dự án (Project Setup)

### 1.1 Khởi tạo Project

- Thiết lập Next.js App Router với TypeScript, Tailwind CSS.
- Định hình cấu trúc thư mục (folders cho `components`, `app`, `lib`, `models`, `types`, `docs`).
- Cấu hình các biến môi trường (Database, S3, OpenAI/Claude API, etc.).

### 1.2 Thiết lập Hệ thống Thiết kế (Design System & UI Library)

- Cấu hình Tailwind CSS theo `ui_design.md`:
  - **Colors**: Set up Light/Dark mode, tông màu chính (Xanh dương, Tím, Cam).
  - **Typography**: Import Web Fonts (`Inter`, `Roboto`, hoặc `Outfit`).
  - **Utilities**: Thêm các class hiệu ứng Glassmorphism, Micro-animations, Drop shadows.
- Cài đặt và cấu hình thư viện UI Components (vd: shadcn/ui hoặc Framer Motion để xử lý animation như slide up/fade-in, vòng sáng micro).

### 1.3 Thiết lập Database và ORM

- Cài đặt MongoDB và Mongoose.
- Xây dựng file kết nối đến DB (`lib/mongodb.ts`).

---

## Giai đoạn 2: Phát triển Backend (BE - API Routes & Models)

### 2.1 Cấu trúc Dữ liệu (Schemas)

- Định nghĩa các file schema theo `technical_design.md` trong thư mục `models`:
  - `User.ts`, `Topic.ts`, `SubTopic.ts`
  - `Persona.ts`, `Mission.ts`
  - `Conversation.ts`, `Message.ts`
  - `Vocabulary.ts` (kèm logic SRS: `repetition_count`, `ease_factor`, `interval`, `next_review_date`).

### 2.2 APIs cho Danh mục và Cài đặt Hội thoại

- Nhóm API `Topic / Subtopic`: GET danh sách chủ đề mẫu, chủ đề chi tiết.
- Nhóm API `Persona & Mission`: GET danh sách tính cách, lấy ngẫu nhiên 3 tasks nhiệm vụ và tính năng xoay vòng (Refresh).

### 2.3 APIs cho Quá trình Hội thoại (Practice Flow)

- **Quản lý Conversation**:
  - API tạo phòng chat mới (truyền `chat_mode`, `sub_topic_id`, `persona_id`...).
  - API kết thúc / reload trạng thái cuộc hội thoại.
- **Quản lý Message & LLM Integration**:
  - Tích hợp Speech-to-Text API (Google) phục vụ đầu vào.
  - Xây dựng luồng **Dual-Transcript Detection**: Nhận `Transcript 1` (raw text + audio URL) từ client, chạy đánh giá lỗi (phát âm, ngữ pháp), sinh ra `Transcript 2` (text chuẩn hóa).
  - Tích hợp LLM (OpenAI/Claude): Lấy lịch sử chat (đã chuẩn hóa gốc) + Prompt Persona -> Xin phản hồi của AI.
  - API phục vụ "Luyện đọc lại".
  - Chức năng Gợi ý Câu trả lời (Hint API): Gợi ý idea / câu trả lời nhanh giữa hội thoại.

### 2.4 APIs Quản lý Từ vựng và SRS Bubble

- Nhóm API `Vocabulary`: Thêm/Sửa/Xóa từ vựng cá nhân, lưu trữ ngữ cảnh hội thoại, lấy danh sách (Grid/List filter).
- Xây dựng cron/cron-logic (SRS Trigger): `GET /api/srs-bubble` để query danh sách từ vựng cá nhân có `next_review_date <= NOW()`. Insert một message hệ thống vào bảng text dưới vai `SYSTEM_SRS`.

---

## Giai đoạn 3: Phát triển Frontend (FE)

### 3.1 Màn hình Trang Chủ (Dashboard)

- **Hero/Header**: Chứa Avatar, lời chào, Progression Bar thể hiện số lượng từ vựng, số phút học, Streak.
- **Main Area**: Render lưới Card các Topics, gắn hiệu ứng hover.
- **Float Action Button & Modal**: Nút CTA "+ Bắt đầu hội thoại". Click mở Modal setup phòng chat (chọn Chủ đề, Subtopic, dropdown Persona).

### 3.2 Màn hình Luyện Tập / Chat (Practice Room)

- **Layout Split**: Thiết kế layout chia tỉ lệ trái/phải (`70% Main Chat - 30% Side Panel`).
- **Header Structure**: Tiêu đề phòng + Mission Banner có tính năng xoay nút tròn (Refresh 3 task ngẫu nhiên).
- **Core Chat UI**:
  - _User Message_: Component hiển thị `Transcript 1` + Highlight đánh dấu lỗi phát âm/ngữ pháp. Có nút "Luyện đọc lại" nhỏ khi tooltip xuất hiện.
  - _AI Message_: Component văn bản, hỗ trợ tra từ tại chỗ (Highlight Text / Tap to translate modal), nút Audio icon (Text-to-Speech).
  - _SRS Bubble_: Component chat bubble pop-up đặc biệt hỏi test từ vựng (Multiple choices / input). User bắt buộc tương tác để tiếp tục session.
- **Tap To Translate Popover**: Logic click vào từng chữ trong tin nhắn -> gọi từ điển popup hiển thị Nghĩa, IPA + nút "Save" vào bảng Vocabulary.
- **Bottom Action Bar**: Component Micro thu âm tĩnh -> Khi click sẽ chuyển sang viền sóng âm (Voice Wave Animation). Có icon Bóng đèn sinh Idea câu trả lời.
- **Side Drawer**: Panel bên phải hiển thị ds list các thẻ từ vựng thu lượm trong phiên (Có nút collapse/hide).

### 3.3 Màn hình Kho Từ vựng (Vocabulary Hub)

- UI Header chứa SearchBar và các Filter tags (bộ lọc thời gian, chữ cái).
- Toggle View mode: Table List vs. Flashcard Grid.
- Tích hợp CRUD từ vựng trực tiếp trên các card list (Hover hiện ra Edit, Delete).
- Nút bấm tham gia Kiểm tra/Ôn tập nhanh trực tiếp nếu có từ mới đến hạn.

---

## Giai đoạn 4: Tích hợp, Testing và Tối ưu (Integration & Optimization)

### 4.1 Kết nối FE -> BE

- Sử dụng các state management (Zustand/Redux) hoặc React Query/SWR để quản lý và cache trạng thái dữ liệu (List topic, Chat history, Vocab list).
- Kết nối các luồng audio từ browser (Web Audio API) lên Storage và API nhận dạng STT.
- Map Real-time/Streaming response với chat để tạo trải nghiệm mượt mà khi AI gõ phím.

### 4.2 Luyện tập & Tinh chỉnh Prompt

- Cân đối các Role-play Prompts trong BE để AI cư xử đúng mực, trả về đoạn văn ngắn để dễ trò chuyện.
- Kiểm tra tính ổn định của luồng _Dual-Transcript_, xử lý độ trễ nhận diện giọng nói và chấm điểm phát âm.
- Tinh chỉnh thông số SRS.

### 4.3 UI/UX Polish

- Kiểm tra và sửa các lỗi responsive trên các thiết bị.
- Cải thiện Dark Mode/Light Mode.
- Review lại hệ thống micro-animations đảm bảo load trơn tru, không làm nặng máy.

## Giai đoạn 5: Triển khai (Deployment)

- Chuẩn bị hệ thống CI/CD, Containerization với Docker.
- Đẩy Docker images và configs (Env vars) lên môi trường Server/Staging (ví dụ: Vercel, AWS, GCP).
- Liên kết domain, cấu hình SSL.
- Viết file `README.md` mới nếu cần, mô tả cách khởi động và bảo trì.
