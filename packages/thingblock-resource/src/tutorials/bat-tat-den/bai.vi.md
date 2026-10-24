---
ma: bat-tat-den
ten: Bật tắt đèn
nhom: dau-ra
thu-tu: 1
bo: thingbot
thoi-luong: 10
---

## Chào em!

Trên mạch ThingBot ảo bên phải có hai đèn nhỏ **L1** và **L2**. Bài này em sẽ bật đèn L1 bằng khối lệnh.

Bấm **Tiếp** để bắt đầu.

## Bật đèn L1

Mở nhóm **ThingBot** ở cột khối bên trái. Kéo khối **set led L1 100** vào bên trong khối **when Arduino begins**.

Bấm **Run** ở bảng mô phỏng. Đèn L1 trên mạch ảo sẽ sáng.

> gợi ý: Khối **set led** có hai ô: ô đầu chọn **L1**, ô sau là độ sáng, để **100** là sáng hết cỡ.
> gợi ý: Khối phải nằm _bên trong_ khối **when Arduino begins** thì mới chạy.

kiểm: L1 sáng

## Giữ L2 tắt

Đèn L2 vẫn phải tắt. Thử kéo thêm khối **set led L2 0** vào dưới khối vừa rồi, rồi bấm **Run** lại.

kiểm: L1 sáng
kiểm: L2 tắt

## Xong rồi!

Em đã điều khiển được đèn bằng khối lệnh. Bài tiếp theo: làm đèn nhấp nháy.
