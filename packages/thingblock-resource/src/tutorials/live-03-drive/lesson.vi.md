---
id: live-03-drive
name: ThingBot Live 3: Xe chạy và tay servo
group: thingbot-live
order: 3
board: none
extensions: thingbotTelemetrix
duration: 20
---

## Nhiệm vụ: xe giao hàng

Robot giao hàng trong nhà kho chạy tới kệ, xoay đúng hướng rồi dùng cánh tay đặt hàng xuống.

ThingBot của em là một chiếc xe: động cơ **M1** quay bánh **trái**, động cơ **M2** quay bánh **phải**. Cánh tay là một **servo** cắm ở cổng **S1**.

Kết nối ThingBot qua Bluetooth như bài 1. **Kê xe lên hộp** để bánh không chạm bàn khi chạy thử lần đầu.

Bấm **Tiếp** để bắt đầu.

## Chạy thẳng

Khối **động cơ M1 tốc độ 60** nhận số từ **-100 đến 100**:

- số dương: bánh quay **tới**,
- số âm: bánh quay **lùi**,
- **0**: bánh dừng.

Dưới **Khi bấm vào** 🏁, xếp:

1. **động cơ M1 tốc độ 60**
2. **động cơ M2 tốc độ 60**
3. **đợi 1 giây**
4. **động cơ M1 tốc độ 0**
5. **động cơ M2 tốc độ 0**

Bấm **Chạy**. Hai bánh quay tới 1 giây rồi dừng.

> hint: Quên khối tốc độ 0 thì xe chạy mãi. Bấm **Dừng** (hình bát giác đỏ) để dừng hai bánh ngay.

## Đoán trước: xoay tại chỗ

**Đoán trước:** bánh trái tốc độ **50**, bánh phải tốc độ **-50**. Xe sẽ…

- Đi thẳng
- Xoay tại chỗ sang phải
- Đứng yên

> hint: Đáp án: **xoay tại chỗ sang phải**. Bánh trái đẩy tới, bánh phải kéo lùi, nên xe quay quanh tâm của nó, như em xoay người tại chỗ.

Thêm hai khối này và một khối **đợi 0.6 giây** giữa đoạn chạy thẳng và đoạn dừng. Đặt xe xuống sàn rồi bấm **Chạy**.

## Tay servo

Servo là động cơ biết **đứng đúng góc**, từ **0** đến **180** độ.

Sau khi xe dừng, thêm:

1. **servo S1 góc 0** (hạ tay)
2. **đợi 0.5 giây**
3. **servo S1 góc 90** (nâng tay lên giữa)

Bấm **Chạy**: xe chạy tới, xoay, dừng rồi hạ tay đặt hàng.

> hint: Servo không quay? Kiểm tra dây servo cắm đúng cổng **S1**, dây nâu (hoặc đen) ở phía chân **GND**.
> hint: Luôn có khối **đợi** sau lệnh servo, để servo kịp quay tới nơi trước lệnh tiếp theo.

## Hiểu sâu: vì sao xe đi lệch?

Hai động cơ không bao giờ giống hệt nhau. Cùng tốc độ 60, một bánh có thể quay nhanh hơn bánh kia một chút, nên xe đi hơi lệch.

Cách sửa: tăng tốc độ của bánh chậm thêm vài đơn vị, ví dụ M1 60, M2 63, rồi thử lại tới khi xe đi thẳng.

Bài sau: robot tự nhìn đường bằng cảm biến.
