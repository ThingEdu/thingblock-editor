---
id: light-on-off
name: Bật tắt đèn
group: outputs
order: 1
board: thingbot
duration: 10
---

## Chào em!

Trên mạch ThingBot ảo bên phải có hai đèn nhỏ **L1** và **L2**. Bài này em sẽ bật rồi tắt đèn L1 bằng khối lệnh.

Bấm **Tiếp** để bắt đầu.

## Bật đèn L1

Mở nhóm **ThingBot** ở cột khối bên trái. Kéo khối **đặt đèn L1 độ sáng 100%** vào bên trong khối **khi Arduino khởi động**.

Bấm **Chạy** ở bảng mô phỏng. Đèn L1 trên mạch ảo sẽ sáng.

> hint: Khối **đặt đèn** có hai ô: ô đầu chọn **L1**, ô sau là độ sáng, để **100%** là sáng hết cỡ.
> hint: Khối phải nằm _bên trong_ khối **khi Arduino khởi động** thì mới chạy.

check: L1 on

## Tắt đèn L1

Giờ hãy tắt đèn. Trong khối **đặt đèn L1 độ sáng 100%**, đổi **100%** thành **0%**, rồi bấm **Chạy** lại. Đèn L1 sẽ tắt.

check: L1 off

## Xong rồi!

Em đã bật và tắt được đèn bằng khối lệnh. Bài tiếp theo: làm đèn nhấp nháy.
