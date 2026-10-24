---
ma: bat-tat-den
ten: Bật tắt đèn
nhom: dau-ra
thu-tu: 1
bo: thingbot
thoi-luong: 10
---

## Chào em!

Trên mạch ThingBot ảo bên phải có hai đèn nhỏ **L1** và **L2**. Bài này em sẽ bật rồi tắt đèn L1 bằng khối lệnh.

Bấm **Next** để bắt đầu.

## Bật đèn L1

Mở nhóm **ThingBot** ở cột khối bên trái. Kéo khối **set led L1 100** vào bên trong khối **when Arduino begins**.

Bấm **Run** ở bảng mô phỏng. Đèn L1 trên mạch ảo sẽ sáng.

> gợi ý: Khối **set led** có hai ô: ô đầu chọn **L1**, ô sau là độ sáng, để **100** là sáng hết cỡ.
> gợi ý: Khối phải nằm _bên trong_ khối **when Arduino begins** thì mới chạy.

kiểm: L1 sáng

## Tắt đèn L1

Giờ hãy tắt đèn. Trong khối **set led L1 100**, đổi **100** thành **0**, rồi bấm **Run** lại. Đèn L1 sẽ tắt.

kiểm: L1 tắt

## Xong rồi!

Em đã bật và tắt được đèn bằng khối lệnh. Bài tiếp theo: làm đèn nhấp nháy.
