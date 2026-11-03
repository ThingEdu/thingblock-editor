---
ma: sim-10-xe-tranh-vat-can
ten: ThingBot Sim 10: Xe tránh vật cản
nhom: dau-vao
thu-tu: 5
bo: thingbot
thoi-luong: 25
thiet-bi: ultrasonic
---

## Dự án: xe tự lái

Bài cuối ghép mọi thứ em đã học: xe **đi thẳng** khi đường trống và **xoay** khi cảm biến thấy vật cản ở gần.

Mở bài này là nhóm khối **Ultrasonic** đã có sẵn trong bảng khối.

## Đường trống thì đi thẳng

Trong **vòng lặp Arduino**:

1. Kéo **nếu … thì … nếu không thì**.
2. Ô lục giác: **ultrasonic sensor pin TRIG 0 ECHO 4 read distance cm** **<** **25**.
3. Chỗ **nếu không thì**: **set motor M1 go forward at 50** và **set motor M2 go forward at 50**.
4. Thêm **đợi 0.05 giây** dưới khối **nếu**.

Bấm **Chạy**. Kéo thanh **Vật cản cách cảm biến** lên trên **50** cm: xe đi thẳng.

kiểm: khoảng cách ≥ 50 cm
kiểm: M1 tiến
kiểm: M2 tiến

## Gặp vật thì xoay

Chỗ **thì**, cho xe xoay: **set motor M1 go forward at 50** và **set motor M2 go backward at 50**. Kéo thanh khoảng cách xuống dưới **25** cm.

> gợi ý: Như bài 8: hai bánh quay ngược chiều nhau thì xe xoay tại chỗ.

kiểm: khoảng cách < 25 cm
kiểm: M1 tiến
kiểm: M2 lùi

## Nhanh hơn thì sao?

Tăng tốc độ lên **80**. Xe nhanh hơn thì cần thấy vật cản từ xa hơn: thử đổi **25** thành **40**. Bước này không chấm.

## Thử thách: còi báo

Khi gặp vật cản, cho còi kêu bằng **set buzzer to 2000 pulse**. Khi đường trống, tắt còi bằng **set buzzer to 0 pulse**.

kiểm: khoảng cách < 25 cm
kiểm: còi kêu

## Hoàn thành 10 bài!

Em đã làm xong chuỗi ThingBot Sim. Giờ hãy mở ThingBlock, chọn bo ThingBot, ghép đúng các khối này rồi bấm **Upload** để chạy trên xe thật.
