---
ma: sim-02-den-nhap-nhay
ten: ThingBot Sim 2: Đèn nhấp nháy
nhom: dau-ra
thu-tu: 4
bo: thingbot
thoi-luong: 15
---

## Chào em!

Bài này em làm cho đèn L1 **nhấp nháy**: sáng, chờ, tắt, chờ, rồi lặp lại mãi.

Bấm sang bước sau để bắt đầu.

## Bật rồi tắt

Giữ khối **khi Arduino khởi động** với **init ThingBot** như bài trước. Kéo thêm khối **vòng lặp Arduino** (nhóm **Sự kiện**). Bên trong nó, xếp lần lượt:

- **set led 1 100**
- **đợi 0.5 giây**
- **set led 1 0**
- **đợi 0.5 giây**

Bấm **Chạy** và chờ vài giây cho mô phỏng đếm đủ ba lần chớp.

> gợi ý: Khối **đợi … giây** nằm trong nhóm **Điều khiển**.
> gợi ý: Khối **vòng lặp Arduino** tự lặp mãi, em không cần thêm khối lặp nào.

kiểm: L1 nhấp nháy, chu kỳ 1 giây ± 20%

## Nhìn nhịp đèn

Mỗi lần chớp gồm nửa giây sáng và nửa giây tắt, tổng cộng **1 giây**. Đó là **chu kỳ** của đèn. Bước này không chấm, em nhìn rồi sang bước sau.

## Chớp nhanh gấp đôi

Đổi cả hai ô **đợi** thành **0.25**. Chu kỳ chỉ còn nửa giây, đèn chớp nhanh gấp đôi.

kiểm: L1 nhấp nháy, chu kỳ 0,5 giây ± 20%

## Thử thách: đèn L2

Đổi cả hai khối **set led** sang đèn **2** và đặt lại hai ô **đợi** là **0.5**. Giờ đèn L2 nhấp nháy với chu kỳ 1 giây.

kiểm: L2 nhấp nháy, chu kỳ 1 giây ± 20%

## Xong rồi!

Em đã điều khiển được nhịp của đèn bằng khối **đợi**. Bài sau, đèn sẽ nghe lời nút bấm.
