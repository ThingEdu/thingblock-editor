---
id: sim-02-blink
name: ThingBot Sim 2: Đèn nhấp nháy
group: outputs
order: 4
board: thingbot
duration: 15
---

## Chào em!

Bài này em làm cho đèn L1 **nhấp nháy**: sáng, chờ, tắt, chờ, rồi lặp lại mãi.

Bấm sang bước sau để bắt đầu.

## Bật rồi tắt

Giữ khối **khi Arduino khởi động** với **khởi động ThingBot** như bài trước. Kéo thêm khối **vòng lặp Arduino** (nhóm **Sự kiện**). Bên trong nó, xếp lần lượt:

- **đặt đèn L1 độ sáng 100%**
- **đợi 0.5 giây**
- **đặt đèn L1 độ sáng 0%**
- **đợi 0.5 giây**

Bấm **Chạy** và chờ vài giây cho mô phỏng đếm đủ ba lần chớp.

> hint: Khối **đợi … giây** nằm trong nhóm **Điều khiển**.
> hint: Khối **vòng lặp Arduino** tự lặp mãi, em không cần thêm khối lặp nào.

check: L1 blinks every 1 s ± 20%

## Nhìn nhịp đèn

Mỗi lần chớp gồm nửa giây sáng và nửa giây tắt, tổng cộng **1 giây**. Đó là **chu kỳ** của đèn. Bước này không chấm, em nhìn rồi sang bước sau.

## Chớp nhanh gấp đôi

Đổi cả hai ô **đợi** thành **0.25**. Chu kỳ chỉ còn nửa giây, đèn chớp nhanh gấp đôi.

check: L1 blinks every 0.5 s ± 20%

## Thử thách: đèn L2

Đổi cả hai khối **đặt đèn** sang đèn **2** và đặt lại hai ô **đợi** là **0.5**. Giờ đèn L2 nhấp nháy với chu kỳ 1 giây.

check: L2 blinks every 1 s ± 20%

## Xong rồi!

Em đã điều khiển được nhịp của đèn bằng khối **đợi**. Bài sau, đèn sẽ nghe lời nút bấm.
