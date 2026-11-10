---
id: sim-08-drive-and-turn
name: ThingBot Sim 8: Xe đi thẳng và rẽ
group: motors
order: 4
board: thingbot
duration: 20
---

## Chào em!

Xe ThingBot có bánh trái nối **M1** và bánh phải nối **M2**. Hai bánh cùng quay tới thì xe đi thẳng. Hai bánh quay ngược chiều nhau thì xe xoay tại chỗ.

Bấm sang bước sau để bắt đầu.

## Đi thẳng rồi dừng

Dưới **khởi động ThingBot** trong **khi Arduino khởi động**, xếp:

1. **động cơ M1 chạy tiến tốc độ 50%**
2. **động cơ M2 chạy tiến tốc độ 50%**
3. **đợi 2 giây**
4. **động cơ M1 chạy tiến tốc độ 0%**
5. **động cơ M2 chạy tiến tốc độ 0%**

Bấm **Chạy**: xe đi thẳng 2 giây rồi dừng.

> hint: Tốc độ **0%** nghĩa là dừng.

check: M1 forward
check: M2 forward
check: M1 stop
check: M2 stop

## Xoay tại chỗ

Đổi khối thứ hai thành **động cơ M2 chạy lùi tốc độ 50%** và đổi **đợi 2 giây** thành **đợi 1 giây**. Bánh trái tới, bánh phải lùi: xe xoay tại chỗ.

check: M1 forward
check: M2 backward

## Thử thách: hình vuông

Cho xe đi thẳng rồi xoay, lặp lại bốn lần để vẽ một hình vuông. Bước này không chấm.

## Xong rồi!

Em đã lái được xe đi thẳng, dừng và xoay. Bài sau em sẽ lái xe bằng tay cầm.
