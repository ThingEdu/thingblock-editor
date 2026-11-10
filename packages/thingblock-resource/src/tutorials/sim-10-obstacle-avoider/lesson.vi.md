---
id: sim-10-obstacle-avoider
name: ThingBot Sim 10: Xe tránh vật cản
group: inputs
order: 5
board: thingbot
duration: 25
peripherals: ultrasonic
---

## Dự án: xe tự lái

Bài cuối ghép mọi thứ em đã học: xe **đi thẳng** khi đường trống và **xoay** khi cảm biến thấy vật cản ở gần.

Mở bài này là nhóm khối **Ultrasonic** đã có sẵn trong bảng khối.

## Đường trống thì đi thẳng

Trong **vòng lặp Arduino**:

1. Kéo **nếu … thì … nếu không thì**.
2. Ô lục giác: **cảm biến siêu âm chân TRIG 0 ECHO 4 đọc khoảng cách cm** **<** **25**.
3. Chỗ **nếu không thì**: **động cơ M1 chạy tiến tốc độ 50%** và **động cơ M2 chạy tiến tốc độ 50%**.
4. Thêm **đợi 0.05 giây** dưới khối **nếu**.

Bấm **Chạy**. Kéo thanh **Vật cản cách cảm biến** lên trên **50** cm: xe đi thẳng.

check: distance ≥ 50 cm
check: M1 forward
check: M2 forward

## Gặp vật thì xoay

Chỗ **thì**, cho xe xoay: **động cơ M1 chạy tiến tốc độ 50%** và **động cơ M2 chạy lùi tốc độ 50%**. Kéo thanh khoảng cách xuống dưới **25** cm.

> hint: Như bài 8: hai bánh quay ngược chiều nhau thì xe xoay tại chỗ.

check: distance < 25 cm
check: M1 forward
check: M2 backward

## Nhanh hơn thì sao?

Tăng tốc độ lên **80%**. Xe nhanh hơn thì cần thấy vật cản từ xa hơn: thử đổi **25** thành **40**. Bước này không chấm.

## Thử thách: còi báo

Khi gặp vật cản, cho còi kêu bằng **đặt còi xung 2000**. Khi đường trống, tắt còi bằng **đặt còi xung 0**.

check: distance < 25 cm
check: buzzer on

## Hoàn thành 10 bài!

Em đã làm xong chuỗi ThingBot Sim. Giờ hãy mở ThingBlock, chọn bo ThingBot, ghép đúng các khối này rồi bấm **Nạp code** để chạy trên xe thật.
