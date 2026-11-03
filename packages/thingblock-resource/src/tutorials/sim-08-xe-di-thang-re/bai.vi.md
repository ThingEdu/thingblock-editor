---
ma: sim-08-xe-di-thang-re
ten: ThingBot Sim 8: Xe đi thẳng và rẽ
nhom: dong-co
thu-tu: 4
bo: thingbot
thoi-luong: 20
---

## Chào em!

Xe ThingBot có bánh trái nối **M1** và bánh phải nối **M2**. Hai bánh cùng quay tới thì xe đi thẳng. Hai bánh quay ngược chiều nhau thì xe xoay tại chỗ.

Bấm sang bước sau để bắt đầu.

## Đi thẳng rồi dừng

Dưới **khởi động ThingBot** trong **khi Arduino khởi động**, xếp:

1. **động cơ M1 chạy tiến tốc độ 50**
2. **động cơ M2 chạy tiến tốc độ 50**
3. **đợi 2 giây**
4. **động cơ M1 chạy tiến tốc độ 0**
5. **động cơ M2 chạy tiến tốc độ 0**

Bấm **Chạy**: xe đi thẳng 2 giây rồi dừng.

> gợi ý: Tốc độ **0** nghĩa là dừng.

kiểm: M1 tiến
kiểm: M2 tiến
kiểm: M1 dừng
kiểm: M2 dừng

## Xoay tại chỗ

Đổi khối thứ hai thành **động cơ M2 chạy lùi tốc độ 50** và đổi **đợi 2 giây** thành **đợi 1 giây**. Bánh trái tới, bánh phải lùi: xe xoay tại chỗ.

kiểm: M1 tiến
kiểm: M2 lùi

## Thử thách: hình vuông

Cho xe đi thẳng rồi xoay, lặp lại bốn lần để vẽ một hình vuông. Bước này không chấm.

## Xong rồi!

Em đã lái được xe đi thẳng, dừng và xoay. Bài sau em sẽ lái xe bằng tay cầm.
