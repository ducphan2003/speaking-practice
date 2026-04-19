# Yêu cầu Hệ thống - Ứng dụng Luyện Nói Tiếng Anh (English Speaking Practice App)

Tài liệu này mô tả chi tiết các yêu cầu chức năng, bố cục giao diện và các tính năng mở rộng nhằm xây dựng một ứng dụng luyện nói tiếng Anh tương tác, hiệu quả và thú vị dựa trên AI.

---

## 1. Các Chức Năng Cốt Lõi (Core Features)

Dựa trên yêu cầu, ứng dụng tập trung vào 6 nhóm chức năng chính:

### 1.1. Khám phá & Chọn Chủ đề (Topic Discovery)
- **Danh mục chủ đề (Categories):** User có thể duyệt qua danh sách các chủ đề luyện tập mẫu (Ví dụ: *Du lịch, Thức ăn, Công việc, Học thuật, Giao tiếp hàng ngày,...*).
- **Chủ đề chi tiết (Sub-topics):** Trong mỗi chủ đề lớn sẽ phân nhánh thành các tình huống/vấn đề cụ thể. 
  - *Ví dụ (Thức ăn):* "Nên ăn nhiều thịt hay ăn rau?", "Món ăn yêu thích của bạn là gì?"
  - *Ví dụ (Du lịch):* "Ở Sài Gòn có những điểm du lịch nào?", "Lên kế hoạch một chuyến đi biển."

### 1.2. Quản lý Cuộc trò chuyện (Chat Management)
- User có 3 lựa chọn để bắt đầu luyện tập:
  1. Bắt đầu hội thoại theo một **chủ đề mẫu** đã chọn.
  2. Tự nhập một **chủ đề mới** theo mong muốn hoặc tình huống thực tế của user.
  3. Bắt đầu một **cuộc trò chuyện tự do (Free-talk)**, AI sẽ chat như một người bạn không có kịch bản trước.
- **Thiết lập tính cách (Persona):** Trước khi bắt đầu bất kỳ cuộc trò chuyện nào, người dùng có thể tùy chỉnh tính cách cho AI (Role-play). Việc thiết lập này chỉ thực hiện được lúc bắt đầu tạo phiên chat (Ví dụ: Giám khảo IELTS, Lễ tân khách sạn, Người bạn thân...).

### 1.3. Luồng Luyện Nói & Phản hồi AI thông minh (Smart Speaking & Evaluation Flow)
Chức năng cốt lõi được chia làm hai luồng riêng biệt để tối ưu trải nghiệm:
- **Input của người dùng:** Bấm thu âm -> Speech-to-Text.
- **Dual-Transcript Detection (Xử lý 2 luồng kịch bản):**
  - **Transcript 1 (Thực tế):** Ghi lại chính xác những gì người dùng nói (kể cả lỗi sai, ngập ngừng). Bản này dùng để hệ thống phân tích lỗi, chấm điểm phát âm (Pronunciation), ngữ pháp (Grammar), v.v.
  - **Transcript 2 (Đã chuẩn hóa/Sửa lỗi nhẹ):** AI tự động phán đoán ý tưởng gốc để sửa các lỗi ngữ pháp cơ bản hoặc các từ bị phát âm sai lệch ý nghĩa. Bản Transcript 2 này sẽ được gửi tới AI (kèm theo context từ cache/tóm tắt lịch sử hội thoại) để lấy phản hồi chính thức cho cuộc hội thoại. Việc này giúp AI luôn hiểu đúng ý user dù user nói vấp, tránh việc AI trả lời lạc đề.
- **Luyện đọc lại (Retry Pronunciation):** Nếu user sai phát âm trên Transcript 1, user có thể bấm nút "Luyện đọc lại". Hành động này thuần túy là luyện tập phát âm (không tính là tin nhắn mới gửi cho AI).

### 1.4. Trợ giúp & Gợi ý (Hints & Suggestions)
- Chức năng **"Gợi ý câu trả lời" (Hint)**. Nếu người dùng không biết nói gì, có thể bấm nút gợi ý. AI sẽ dựa vào ngữ cảnh hiện tại để sinh ra 2-3 gợi ý (ideas hoặc mẫu câu) để duy trì cuộc hội thoại.

### 1.5. Tra cứu & Ghi chú Từ vựng Trực tiếp (In-context Vocabulary)
- **Tra từ (Tap to translate):** User có thể nhấp/bôi đen bất kỳ từ vựng nào xuất hiện trong tin nhắn của AI hoặc transcript của chính mình.
- **Thẻ từ chi tiết:** Hiển thị popup giải nghĩa chi tiết: Ý nghĩa (Meaning), Từ loại (Word type), Phiên âm (IPA), Câu ví dụ (Example).
- **Lưu từ (Save/Bookmark):** User có thể thêm từ vựng này vào danh sách cần học.
- **Side Panel Màn hình Chat:** Các từ đã được lưu trong cuộc hội thoại hiện tại sẽ hiển thị ở một bảng điều khiển bên phải/trái. Cung cấp nút `Show/Hide` giúp user theo dõi tập trung hơn.

### 1.6. Kho Từ vựng Cá nhân (Personal Vocabulary Space)
- Một khu vực riêng để user xem lại toàn bộ từ vựng đã từng lưu.
- Cung cấp các thao tác quản lý: Tìm kiếm (Search), Sửa ghi chú cá nhân (Edit notes), Chỉnh sửa nghĩa, Xóa từ (Delete).

---

## 2. Bố cục Giao diện (UI Layout)

Thiết kế giao diện ưu tiên sự rõ ràng, rộng rãi và tối ưu cho tính năng Role-play & Vocabulary.

### A. Màn hình Trang chủ (Dashboard / Home)
- **Hero/Header Section:** Xin chào user. Tóm tắt nhanh tiến độ cơ bản (Ví dụ: Số từ vựng đã lưu).
- **Main Area:** Hiển thị dạng thẻ (Card grid) các Chủ đề (Topics).
- **Floating Button:** Nút "+ Bắt đầu hội thoại". Khi bấm vào, sẽ xuất hiện popup/modal yêu cầu thiết lập **Chủ đề** và **Persona (Tính cách AI)**.

### B. Màn hình Luyện Tập / Chat (Practice Room)
- **Header:** Tiêu đề hệ thống/chủ đề đang sử dụng + Persona hiện hành của AI.
- **Main Chat Area (Trái/Giữa - chiếm khoảng 70%):**
  - Tin nhắn User: Bên dưới có huy hiệu chấm điểm. **Quan trọng:** Hiển thị từ bị nói sai (đỏ) hoặc sai ngữ pháp (vàng) trực tiếp trên câu. Nút **"Luyện đọc lại"** xuất hiện ngay dưới những câu mắc lỗi.
  - Tin nhắn AI: Text to, dễ bấm vào để tra từ. Có icon Loa để phát Audio.
  - **Bong bóng Ôn tập (SRS Chat Bubble):** Xen kẽ trong màn hình chat có thể hiển thị tự động một bong bóng (bubble) nhỏ bật lên từ hệ thống, tự động hỏi người dùng về một từ vựng bất kỳ nằm trong kho Vocab (dạng trắc nghiệm hoặc yêu cầu đọc từ đó) để phục vụ việc ôn tập ngắt quãng.
- **Nhiệm vụ Ẩn (Mission Banner):** Có một vùng nhỏ ngay dưới Header hoặc lơ lửng góc trên, đề xuất **3 nhiệm vụ nhỏ** cho cuộc chat hiện tại (Ví dụ: Hỏi về thời tiết, Mặc cả giá). User có thể bấm nút **Refresh** để lấy mục tiêu khác.
- **Bottom Action Bar:** Nút thu âm Micro to nổi bật. Cạnh đó là nút Bóng đèn (Gợi ý câu trả lời).
- **Side Drawer (Phải - chiếm khoảng 30%):** Side panel "Từ vựng của buổi học" có nút `[X]` / `[Hide]` tiện cho người dùng tập trung nhìn màn hình.

### C. Màn hình Kho Từ vựng (Vocabulary Hub)
- Danh sách từ vựng dạng bảng (Table) hoặc các Flashcards.
- Tích hợp các bộ lọc (Lọc theo ngày, bảng chữ cái, tag/chủ đề).

---

## 3. Các tính năng nâng cao phân tích sâu (High Engagement & Effectiveness Features)

Các tính năng này tập trung sâu vào chất lượng học thuật thuần túy hơn là giải trí bề nổi, đã được tinh chỉnh lại theo nhu cầu:

### 3.1. Nhập vai có chủ đích (Pre-defined Role-play)
- Tính cách của AI được cố định ngay từ lúc khởi tạo cuộc chat. Việc setup persona rõ ràng ("Phỏng vấn sinh viên xin việc", "Giao tiếp với tài xế taxi") giúp người dùng thu hẹp bức tranh từ vựng cần dùng, nâng cao tính chuyên môn hóa.

### 3.2. Nhiệm vụ Ẩn xoay vòng (Rotational Hidden Missions)
- Mỗi Topic sẽ sinh ra các nhiệm vụ ẩn phong phú. Trong lúc chat, hệ thống đề xuất sẵn 3 nhiệm vụ để dẫn dắt user.
- **Cơ chế Paging/Refresh:** Nếu user không thích hoặc đã hoàn thành các nhiệm vụ này, user có thể bấm vòng lặp (refresh tab) để load 3 nhiệm vụ khác từ kho nhiệm vụ ẩn của Topic đó, tạo động lực liên tục không bị bế tắc ý tưởng.

### 3.3. Ôn tập Ngắt quãng tích hợp luồng chat (Conversational SRS Bubble)
- Thay vì bắt user dừng lại để làm test dài, hệ thống ứng dụng SRS ngay trong màn hình trò chuyện luyện tập.
- Một bong bóng chat bot phụ sẽ lâu lâu nhảy ra hỏi nhanh người dùng về một từ vựng đã quên trong quá khứ ("Từ 'Procrastinate' nghĩa là gì? / Đọc lại từ này giúp mình nhé!") -> Trả lời xong lại đi tiếp kịch bản với AI chính.

### 3.4. Phân tích lỗi chính xác nhờ cơ chế Dual-Transcript
- Hệ thống không để sự hiểu lầm của máy móc làm đứt mạch cảm xúc của user.
- AI chính chỉ nhận **Transcript 2 đã được chuẩn hóa**, tránh việc AI "ngớ người" vì user phát âm sai một âm tiết.
- User có **Transcript 1 thực tế** để nhận thức lỗi sai thông qua các Highlight màu trên UI, cung cấp công cụ "Luyện tập phát âm lại" ngay tại chỗ mang tính chữa lỗi cá nhân mà không làm lệch flow của đoạn Chat nhập vai.
