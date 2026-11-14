---
id: live-05-hand-drive
name: ThingBot Live 5: Tay em lái xe
group: thingbot-live
order: 5
board: none
extensions: cameraAi, thingbotTelemetrix
duration: 20
---

## Nhiệm vụ: lái xe không chạm tay

Có những nơi người không nên chạm vào máy: phòng mổ, nhà máy, hay khi tay đang bẩn. Người ta điều khiển máy bằng **cử chỉ**.

Hôm nay em ghép hai thứ đã học:

- **Camera AI** nhìn bàn tay em qua webcam (hoặc camera trước của máy tính bảng),
- **ThingBot Live** gửi lệnh tới robot qua Bluetooth.

Xòe tay: xe chạy. Nắm tay: xe dừng.

Kết nối ThingBot qua Bluetooth như bài 1. Bấm **Tiếp** để bắt đầu.

## Bật camera

1. Kéo khối **Khi bấm vào** 🏁 ra vùng lập trình.
2. Mở nhóm **Camera AI**, kéo khối **bật camera soi gương** vào dưới nó.
3. Bấm **Chạy**. Trình duyệt hỏi có cho dùng camera không: bấm **Cho phép**.

Giơ tay lên: khung **Sân chơi** vẽ các chấm lên bàn tay em.

> hint: Máy không có webcam? Ở khung Sân chơi, chọn **Chuột (không cần webcam)**. Giữ chuột trái là nắm tay.

## Xòe tay thì chạy

Trong nhóm **Camera AI** có khối mũ **khi tay bất kỳ làm cử chỉ …**. Khối mũ chờ AI thấy đúng cử chỉ rồi mới chạy các khối bên dưới.

1. Kéo khối **khi tay bất kỳ làm cử chỉ xoè tay** ra vùng lập trình.
2. Dưới nó, đặt **động cơ M1 tốc độ 60** và **động cơ M2 tốc độ 60**.

Bấm **Chạy**, rồi xoè tay trước camera.

> hint: Kê xe lên hộp trong lần thử đầu, để xe không chạy mất khỏi bàn.
> hint: Bấm vào ô **xoè tay** trên khối để đổi sang cử chỉ khác.

## Đoán trước: dừng xe thế nào?

**Đoán trước:** chỉ có khối **khi tay bất kỳ làm cử chỉ xoè tay**. Em nắm tay lại thì xe…

- Dừng ngay
- Vẫn chạy tiếp

> hint: Đáp án: **vẫn chạy tiếp**. Lệnh "tốc độ 60" đã tới robot, robot giữ nguyên tới khi có lệnh mới. Muốn dừng phải gửi lệnh "tốc độ 0".

Thêm khối **khi tay bất kỳ làm cử chỉ nắm tay**, bên dưới là **động cơ M1 tốc độ 0** và **động cơ M2 tốc độ 0**. Thử lại.

## Thêm cử chỉ của em

Thử tự làm thêm:

- **chữ V**: xe xoay tại chỗ (M1 **50**, M2 **-50**), **đợi 1.2 giây**, rồi dừng.
- **ngón cái lên**: **đèn LED 1 bật**.

Ví dụ mẫu ở **Tập tin → Ví dụ… → ThingBot Live → Tay em lái xe (Camera AI + ThingBot)**.

## Hiểu sâu: hai bộ não

Ở bài này có hai "bộ não" cùng làm việc:

- **AI** trên máy tính nhìn ảnh webcam, đoán cử chỉ của bàn tay.
- **Chương trình khối** của em quyết định: cử chỉ này thì gửi lệnh gì.

Robot không có camera vẫn "thấy" được tay em, vì máy tính thấy hộ rồi nhắn cho nó. Cách chia việc này giúp robot nhỏ, rẻ mà vẫn làm được việc thông minh.
