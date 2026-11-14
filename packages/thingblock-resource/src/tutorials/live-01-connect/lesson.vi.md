---
id: live-01-connect
name: ThingBot Live 1: Điều khiển robot qua Bluetooth
group: thingbot-live
order: 1
board: none
extensions: thingbotTelemetrix
duration: 15
---

## Chào em!

Hôm nay em điều khiển **ThingBot thật** mà không cần cắm dây, cũng không cần nạp chương trình.

Ở chế độ **Live** (trực tiếp), chương trình chạy ngay trên máy tính hoặc máy tính bảng của em. Mỗi khối là một **tin nhắn** gửi tới robot qua **Bluetooth**, như em nhắn tin cho bạn. Robot nhận tin là làm ngay.

Các khối nằm ở nhóm **ThingBot Live** trong cột danh mục.

**Đoán trước:** chế độ Live và chế độ Nạp code khác nhau chỗ nào?

- Chế độ Live: chương trình ở trong robot, robot tự chạy khi rút dây
- Chế độ Live: chương trình ở trên máy tính, máy tính nhắn lệnh cho robot

> hint: Đáp án: **chương trình ở trên máy tính**. Vì vậy em sửa khối là thấy robot đổi ngay, không phải chờ nạp. Đổi lại, máy tính phải luôn ở gần robot và giữ kết nối Bluetooth.

Bấm **Tiếp** để bắt đầu.

## Chuẩn bị robot

Robot cần một chương trình nhỏ tên là **firmware Live**. Firmware này nghe tin nhắn Bluetooth và làm theo. Mỗi ThingBot chỉ cần cài **một lần**:

1. Trên máy tính có cài ThingBlock, cắm ThingBot bằng dây USB.
2. Thêm nhóm khối **ThingBot Live**, bấm **Kết nối ThingBot**, rồi bấm **Cập nhật thiết bị**.
3. Chờ báo xong rồi rút dây.

Máy tính bảng không cài firmware được. Nhờ thầy cô cài sẵn trên máy tính trước giờ học.

> hint: ThingBot đã có firmware Live rồi thì bỏ qua bước này.

## Kết nối

1. Bật công tắc nguồn của ThingBot. Để robot gần máy, cách chưa tới 2 mét.
2. Bấm nút **Kết nối ThingBot** ở góc trên bên phải.
3. Bấm **Bắt đầu tìm kiếm**. Trình duyệt hiện danh sách thiết bị Bluetooth: chọn **ThingBot** rồi bấm **Ghép nối**.

Khi kết nối xong, nút ở góc trên đổi trạng thái thành đã kết nối.

> hint: Không thấy ThingBot trong danh sách? Kiểm tra Bluetooth của máy đã bật, robot đã bật nguồn và đã có firmware Live.
> hint: Trên máy tính bảng Android, mở ThingBlock bằng **Chrome**. Trình duyệt khác có thể không có Bluetooth.

## Bật đèn L1

1. Mở nhóm **Sự kiện**, kéo khối **Khi bấm vào** 🏁 (lá cờ xanh) ra vùng lập trình.
2. Mở nhóm **ThingBot Live**, kéo khối **đèn LED 1 bật** vào dưới nó.
3. Bấm nút **Chạy**.

Nhìn đèn **L1** trên robot: nó sáng chưa?

> hint: Bấm Chạy mà đèn không sáng? Kiểm tra lại bước Kết nối. Khi mất kết nối, lệnh không tới được robot.

## Bật rồi tắt

Giờ cho đèn chớp. Thêm khối **liên tục** (nhóm **Điều khiển**) dưới lá cờ, bên trong xếp:

1. **đèn LED 1 bật**
2. **đợi 0.5 giây**
3. **đèn LED 1 tắt**
4. **đợi 0.5 giây**

Bấm **Chạy**. Thử đổi 0.5 thành 0.2 trong lúc chương trình đang chạy: robot đổi nhịp ngay, không cần nạp lại.

> hint: Khối **đợi** rất quan trọng ở chế độ Live. Không có nó, máy tính gửi hàng nghìn tin nhắn mỗi giây, Bluetooth bị nghẽn và robot chạy chậm theo.

## Hiểu sâu: tin nhắn qua sóng

**Bluetooth** là sóng radio tầm ngắn, giống sóng của tai nghe không dây. Mỗi khối **đèn**, **động cơ**, **còi** gửi đi một tin nhắn vài byte, ví dụ "đèn 1, sáng 100".

Bấm nút **Dừng** (hình bát giác đỏ) thì máy tính gửi lệnh tắt động cơ và còi ngay, để robot không chạy mất.

Em đã điều khiển robot qua Bluetooth. Bài sau: đèn và còi làm còi báo động.
