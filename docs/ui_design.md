# Thiết kế Giao diện (UI Design) - Bố cục chi tiết

Dựa trên các yêu cầu từ file `requirement.md`, dưới đây là mô tả chi tiết về thiết kế giao diện và trải nghiệm người dùng (UX/UI) cho ứng dụng Luyện nói Tiếng Anh.

## 1. Nguyên tắc Thiết kế Chung (Design Guidelines)
- **Phong cách:** Hiện đại, rõ ràng, mang hơi hướng Gamification để tăng sự hứng thú.
- **Màu sắc (Color Palette):**
  - Sử dụng giao diện sáng (Light Mode) làm mặc định và hỗ trợ chế độ tối (Dark Mode) bóng bẩy (Sleek design).
  - Tông màu chủ đạo: Xanh dương (Trust, Learning) hoặc màu Tím/Cam (Creativity, Energy) để tạo điểm nhấn nổi bật trên một tổng thể tối giản.
  - Sử dụng các hiệu ứng Glassmorphism (Kính mờ) ở các vùng chứa thông tin phụ (side panel, popup) tạo cảm giác sang trọng, có chiều sâu.
- **Typography:** Các font chữ hiện đại, không chân (sans-serif), dễ đọc trên màn hình như Inter, Roboto, hoặc Outfit với phân cấp heading rõ ràng.
- **Animation:** Áp dụng các hiệu ứng chuyển cảnh mượt mà (micro-animations) khi hover vào thẻ bài học, popup hiển thị từ vựng hay gửi tin nhắn, tạo cảm giác ứng dụng "sống động" (responsive/alive).

---

## 2. Chi tiết Các Màn hình

### A. Màn hình Trang chủ (Dashboard / Home)
- **Hero/Header Section:**
  - Vị trí: Ở phía trên cùng.
  - Nội dung: Lời chào (Ví dụ: "Chào buổi sáng, [Tên]!") kèm Avatar của người dùng.
  - Progression Bar: Khu vực hiển thị nhanh số lượng từ vựng đã lưu, chuỗi ngày luyện tập (Streak), hoặc điểm trải nghiệm (XP) bằng thanh tiến trình (progress bar) dạng gradient sinh động.
- **Main Area (Vùng nội dung chính):**
  - **Danh mục chủ đề (Categories):** Cấu trúc dưới dạng lưới (Grid) các *Cards* dành cho các chủ đề khám phá.
  - Mỗi thẻ (Card) có biểu tượng (icon) hoặc hình ảnh minh họa chất lượng cao, tên chủ đề và tiến độ. Hiệu ứng *hover* sẽ làm thẻ nổi lên nhẹ và đổ bóng (drop shadow).
- **Nút Hành động Chính (Floating/Primary Action Button):**
  - Nút "+ Bắt đầu hội thoại": Lớn, màu gradient bắt mắt nhô lên góc dưới màn hình hoặc giữa Hero Banner.
  - **Modal "Thiết lập Hội thoại":** Trượt lên (Slide up) hoặc mờ dần vào (Fade-in). Bao gồm form nhập/chọn *Chủ đề (Topic/Free-talk)*, và dropdown danh sách *Tính cách AI (Persona)* đóng vai (Ví dụ: Giám khảo IELTS, Doanh nhân...).

### B. Màn hình Luyện Tập / Chat (Practice Room)
Đây là màn hình lõi của trải nghiệm (Core loop), tối ưu hóa diện tích cho Focus Mode.
- **Layout tổng thể:** Tỷ lệ chia 70% bên trái (Main Chat) - 30% bên phải (Side Panel từ vựng).
- **Header:**
  - Tiêu đề Chủ đề/Tình huống.
  - Tóm tắt Persona AI đang hội thoại.
  - **Vùng "Nhiệm vụ Ẩn (Mission Banner)":** Thanh banner thả xuống dưới Header, chứa 3 tasks dạng checkbox. Kèm icon **Refresh** (xoay mượt khi click) để đổi nhiệm vụ.
- **Main Chat Area (Khu vực Hội thoại chính):**
  - Nền sạch, tương phản tốt để làm nổi chữ.
  - **Tin nhắn AI:** Ở bên trái. Có chứa icon Loa (Speaker) để phát âm. Các từ có thể nhấn (tab/click) để tra nghĩa. 
  - **Tin nhắn User:** Ở bên phải, đại diện cho Transcript thực tế.
    - Chữ sai được làm nổi (Highlight Đỏ: Sai phát âm/Cú pháp nặng; Vàng: Sai nhẹ).
    - Cung cấp nút **"Luyện đọc lại (Retry)"** nằm ẩn dưới tin nhắn và chỉ hiện ra nếu tin nhắn có lỗi sai.
  - **Bong bóng Ôn tập (SRS Chat Bubble):** Xuất hiện xen kẽ tự nhiên ở giữa màn hình (Căn giữa) kèm thông báo pop-up nhẹ nhàng. Yêu cầu user "Kiểm tra nhanh" từ vựng (chọn A/B/C) ngay lập tức rồi mới chat tiếp.
- **Bottom Action Bar (Thanh công cụ trò chuyện):**
  - Vị trí trung tâm: **Micro tĩnh (Record Button)** khổng lồ. Khi thu âm, chuyển sang vòng hinh xuyến phát sáng theo biên độ âm (Audio Voice Wave).
  - Bên cạnh: Nút Gợi ý (Icon Bóng đèn vàng). Khi bấm mở menu chứa text gơi ý idea/mẫu câu.
- **Side Drawer (Kho Từ vựng Trong phiên chạy):**
  - Cố định ở viền phải, nhưng có thể đóng kín `[X]` hoặc `[Hide]` rút gọn thành một dải hẹp bên mép màn hình.
  - Liệt kê các thẻ từ vựng nhỏ gọn user vừa "Lưu" để dễ tra cứu nhanh.

### C. Màn hình Kho Từ vựng (Vocabulary Hub)
- **Top Bar:** 
  - Có thanh tìm kiếm (Search Bar) bo góc sang trọng. 
  - Các badge bộ lọc (Filter by Date, Alphabet, Topic, Tag).
- **Trưng bày Từ vựng (Main View):**
  - Hỗ trợ đổi Layout giữa góc nhìn Bảng (Table list) và Dạng Thẻ (Flashcards grid).
  - Tại mỗi thẻ/hàng: Hiển thị từ vựng chuẩn, Loại từ, Phiên âm IPA, Ý nghĩa, Nút phát âm thanh.
  - Các action Edit/Delete sẽ lộ ra khi để chuột lên thẻ từ hòng tiết kiệm không gian và giao diện sạch.
- **Hành động khác:**
  - Nút **"Kiểm tra/Ôn tập từ mới"** ở trên đỉnh để tham gia làm bài test flashcards.

### D. Các Popups & Trải nghiệm cụ thể
- **Popup Dịch tại chỗ (Tap to Translate Popover):**
  - Hiển thị lơ lửng ngay khi chữ được chọn trong phòng Practice Room. 
  - Cấu trúc: [TỪ VỰNG] - [IPA / PHIÊN ÂM] - [NGHĨA CƠ BẢN].
  - Có một nút "Save" sáng rực khuyên user bổ sung ngay vào SideDrawer vocab. 
- **Chữa lỗi Dual-Transcript:**
  - UI chỉ trình bày đoạn user nói lỗi nhưng ẩn chứa cơ chế click vào từng chữ gạch chân để coi giải thích lỗi (Popup: "Thay vì nói X, ngữ cảnh này từ Y đang chuẩn xác! Vui lòng đọc lại").
