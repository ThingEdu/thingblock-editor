---
ma: sim-06-cam-bien-khoang-cach
ten: ThingBot Sim 6: Cảm biến khoảng cách
nhom: dau-vao
thu-tu: 3
bo: thingbot
thoi-luong: 20
thiet-bi: ultrasonic
---

## Chào em!

**Cảm biến siêu âm** phát tiếng kêu rất cao rồi nghe tiếng vọng lại để đo khoảng cách tới vật cản. Bài này em làm **đèn báo khi có vật ở gần**.

Mở bài này là nhóm khối **Ultrasonic** đã có sẵn trong bảng khối.

## Đèn báo vật gần

Trong **vòng lặp Arduino**:

1. Kéo khối **nếu … thì … nếu không thì** (nhóm **Điều khiển**).
2. Đặt khối **… < …** (nhóm **Các phép toán**) vào ô lục giác, gõ **20** vào ô bên phải.
3. Đặt khối **cảm biến siêu âm chân TRIG 0 ECHO 4 đọc khoảng cách cm** (nhóm **Ultrasonic**) vào ô bên trái của dấu **<**.
4. Chỗ **thì** đặt **đặt đèn L1 độ sáng 100**, chỗ **nếu không thì** đặt **đặt đèn L1 độ sáng 0**.
5. Thêm **đợi 0.05 giây** dưới khối **nếu**.

Bấm **Chạy**, rồi kéo thanh **Vật cản cách cảm biến** xuống dưới **20** cm. Đèn L1 phải sáng.

> gợi ý: Cảm biến trên ThingBot cắm TRIG ở IO0 và ECHO ở IO4: hai ô số trong khối là **0** và **4**.
> gợi ý: Dấu **<** nghĩa là "nhỏ hơn": khoảng cách nhỏ hơn 20 là vật đang ở gần.

kiểm: khoảng cách < 20 cm
kiểm: L1 sáng

## Đưa vật ra xa

Kéo thanh **Vật cản cách cảm biến** lên trên **30** cm. Đèn L1 phải **tắt**.

kiểm: khoảng cách ≥ 30 cm
kiểm: L1 tắt

## Thử thách: hiện khoảng cách

Thêm màn hình OLED (**Thêm thiết bị** → **OLED**) và in khoảng cách đo được lên màn hình. Bước này không chấm.

## Xong rồi!

Em đã cho ThingBot "nhìn" thấy vật cản. Bài sau em sẽ cho động cơ quay.
