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
2. Mở nhóm **ThingBot**, kéo khối **init ThingBot** vào trong khối đó.

Giờ thêm khối **set led 2 100** ngay dưới **init ThingBot**, rồi bấm **Chạy** ở khung Mô phỏng. Đèn L2 sẽ sáng.

> gợi ý: Ô đầu của khối **set led** chọn đèn **1** hay **2**, ô sau là độ sáng từ 0 đến 100.
> gợi ý: Thiếu khối **init ThingBot** thì chip PCA9685 chưa được bật, đèn không sáng.

kiểm: L2 sáng

## Thử thách: hai đèn cùng sáng

Thêm một khối **set led 1 100** nữa để cả L1 và L2 cùng sáng.

kiểm: L1 sáng
kiểm: L2 sáng

## Xong rồi!

Em đã biết các bộ phận của ThingBot và cách bắt đầu một chương trình. Bài sau em sẽ làm đèn nhấp nháy.
