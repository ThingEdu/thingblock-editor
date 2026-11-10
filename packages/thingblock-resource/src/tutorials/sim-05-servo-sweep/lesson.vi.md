---
id: sim-05-servo-sweep
name: ThingBot Sim 5: Servo quét
group: motors
order: 2
board: thingbot
duration: 15
---

## Chào em!

**Servo** quay tới một góc từ 0 đến 180 độ rồi giữ nguyên. Bài này em cho servo S1 quét qua lại như cần gạt nước.

Bấm sang bước sau để bắt đầu.

## Quay ngay tới 90 độ

Dưới **khởi động ThingBot**, thêm khối **đặt servo S1 góc 90 độ** (nhóm **ThingBot**). Bấm **Chạy** và nhìn cần servo S1.

check: servo S1 at 90 deg

## Quay từ từ

Thay khối đó bằng **quay servo S1 tới góc 180 độ trong 2 giây**. Servo đi từ chỗ đang đứng tới 180 độ trong 2 giây.

> hint: Khối **quay servo** chờ quay xong rồi mới chạy khối tiếp theo.

check: servo S1 at 180 deg

## Quét qua lại

Đưa việc quay vào **vòng lặp Arduino** để servo quét mãi:

- **quay servo S1 tới góc 0 độ trong 1 giây**
- **quay servo S1 tới góc 180 độ trong 1 giây**

Bấm **Chạy** và đợi servo đi hết một vòng.

> hint: Thiếu khối về **0** độ thì servo chỉ đi một chiều rồi đứng yên.

check: servo S1 sweeps from 0 to 180 deg

## Xong rồi!

Em đã biết quay servo ngay, quay từ từ và quét qua lại. Bài sau em sẽ dùng cảm biến để đo khoảng cách.
