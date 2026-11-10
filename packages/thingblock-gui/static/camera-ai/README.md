# Hình vật trên Sân chơi Camera AI

Bảng Sân chơi vẽ các vật `cricket` (dế) và `tre` (rô bốt Tre) bằng hai hình dưới đây, phục vụ ngay từ
`static/camera-ai/` nên dùng được khi không có mạng. Khi hình chưa tải xong, sân chơi vẽ tạm biểu tượng emoji
(🦗, 🤖).

## Nguồn

| Tệp | Nguồn | Chủ sở hữu | Giấy phép / điều kiện |
|---|---|---|---|
| `de-stem-cricket.svg` | Hình con dế có sóng tín hiệu, cắt ra từ logo `/logo-blue.svg` của https://destem.foundation (tải ngày 10/11/2026); một màu xanh `#002AE3`, quay sang phải | Dế STEM Foundation / ThingEdu | Nhận diện thương hiệu của chủ sở hữu, dùng theo yêu cầu của chủ sở hữu trong ThingBlock; không phải giấy phép mở — muốn dùng ngoài ThingBlock phải hỏi Dế STEM Foundation |
| `robot-tre.svg` | `mini-app/chung/neo_tre.svg` trong https://github.com/ThingEdu/gcompris-vi, commit `bcbea87` (tác giả Le Ngoc Tuan) | ThingEdu (tác giả Le Ngoc Tuan) | Kho gcompris-vi theo AGPL-3.0; tác giả Le Ngoc Tuan (ThingEdu) cấp riêng tệp `neo_tre.svg` cho ThingBlock theo giấy phép MIT (10/11/2026). Bản gốc ghi `CC-BY-SA-4.0`; bản ở đây ghi MIT theo sự cho phép đó |

Ghi chú: `de-stem-cricket.svg` được thêm `width`/`height` (tỉ lệ đúng viewBox) để trình duyệt nào cũng biết kích thước khi vẽ lên canvas; nét vẽ giữ nguyên.
