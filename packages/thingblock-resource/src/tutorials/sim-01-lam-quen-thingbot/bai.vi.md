---
ma: sim-01-lam-quen-thingbot
ten: ThingBot Sim 1: Làm quen ThingBot
nhom: lam-quen
thu-tu: 1
bo: thingbot
thoi-luong: 10
---

## Chào em!

Đây là bài đầu tiên của chuỗi 10 bài **ThingBot Sim**. Em sẽ làm quen mạch ThingBot ảo ở khung **Mô phỏng** bên phải, rồi tự bật một chiếc đèn.

Bấm sang bước sau để bắt đầu.

## Tìm khắp mạch

Nhìn mạch ThingBot ảo. Trên mạch có:

- hai đèn nhỏ **L1** và **L2**,
- nút bấm **SW**,
- bốn cổng động cơ **M1** đến **M4**,
- năm cổng servo **S1** đến **S5**,
- và còi.

Não của mạch là chip ESP32-C3. Chip PCA9685 nhận lệnh từ não rồi điều khiển đèn, còi, động cơ và servo.

chỉ vào: mo-phong

## Bật đèn L2

Mọi chương trình ThingBot đều bắt đầu bằng hai khối:

1. Mở nhóm **Sự kiện**, kéo khối **khi Arduino khởi động** ra vùng lập trình.
2. Mở nhóm **ThingBot**, kéo khối **khởi động ThingBot** vào trong khối đó.

Giờ thêm khối **đặt đèn L2 độ sáng 100%** ngay dưới **khởi động ThingBot**, rồi bấm **Chạy** ở khung Mô phỏng. Đèn L2 sẽ sáng.

> gợi ý: Ô đầu của khối **đặt đèn** chọn đèn **1** hay **2**, ô sau là độ sáng từ 0% (tắt) đến 100% (sáng nhất).
> gợi ý: Thiếu khối **khởi động ThingBot** thì chip PCA9685 chưa được bật, đèn không sáng.

kiểm: L2 sáng

## Thử thách: hai đèn cùng sáng

Thêm một khối **đặt đèn L1 độ sáng 100%** nữa để cả L1 và L2 cùng sáng.

kiểm: L1 sáng
kiểm: L2 sáng

## Xong rồi!

Em đã biết các bộ phận của ThingBot và cách bắt đầu một chương trình. Bài sau em sẽ làm đèn nhấp nháy.
