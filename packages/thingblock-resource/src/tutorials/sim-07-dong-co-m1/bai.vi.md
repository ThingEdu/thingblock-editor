---
ma: sim-07-dong-co-m1
ten: ThingBot Sim 7: Động cơ DC
nhom: dong-co
thu-tu: 3
bo: thingbot
thoi-luong: 15
---

## Chào em!

**Động cơ DC** quay bánh xe. Trên ThingBot có bốn cổng động cơ **M1** đến **M4**. Bài này em cho động cơ M1 quay tới rồi quay lùi.

Bấm sang bước sau để bắt đầu.

## Quay tới

Trong **vòng lặp Arduino**, thêm khối **động cơ M1 chạy tiến tốc độ 60** (nhóm **ThingBot**) rồi **đợi 2 giây**. Bấm **Chạy** và nhìn mũi tên quay ở cổng M1.

> gợi ý: Số cuối là tốc độ, từ 0 đến 100.

kiểm: M1 tiến

## Tới rồi lùi

Thêm **động cơ M1 chạy lùi tốc độ 60** và **đợi 2 giây** nữa. Động cơ sẽ quay tới 2 giây, lùi 2 giây, rồi lặp lại.

> gợi ý: Chọn **lùi** ở ô giữa của khối thứ hai.

kiểm: M1 tiến
kiểm: M1 lùi

## Nhanh và chậm

Cho động cơ chạy tới thật nhanh: đổi tốc độ của khối **tiến** thành **100**.

kiểm: M1 tốc độ ≥ 90

## Xong rồi!

Em đã điều khiển chiều quay và tốc độ của động cơ. Bài sau em sẽ cho cả chiếc xe chạy.
