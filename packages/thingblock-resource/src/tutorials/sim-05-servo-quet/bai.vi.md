---
ma: sim-05-servo-quet
ten: ThingBot Sim 5: Servo quét
nhom: dong-co
thu-tu: 2
bo: thingbot
thoi-luong: 15
---

## Chào em!

**Servo** quay tới một góc từ 0 đến 180 độ rồi giữ nguyên. Bài này em cho servo S1 quét qua lại như cần gạt nước.

Bấm sang bước sau để bắt đầu.

## Quay ngay tới 90 độ

Dưới **init ThingBot**, thêm khối **set servo S1 to angle 90 degrees** (nhóm **ThingBot**). Bấm **Chạy** và nhìn cần servo S1.

kiểm: servo S1 ở 90 độ

## Quay từ từ

Thay khối đó bằng **move servo S1 to angle 180 degrees over 2 seconds**. Servo đi từ chỗ đang đứng tới 180 độ trong 2 giây.

> gợi ý: Khối **move servo** chờ quay xong rồi mới chạy khối tiếp theo.

kiểm: servo S1 ở 180 độ

## Quét qua lại

Đưa việc quay vào **vòng lặp Arduino** để servo quét mãi:

- **move servo S1 to angle 0 degrees over 1 seconds**
- **move servo S1 to angle 180 degrees over 1 seconds**

Bấm **Chạy** và đợi servo đi hết một vòng.

> gợi ý: Thiếu khối về **0** độ thì servo chỉ đi một chiều rồi đứng yên.

kiểm: servo S1 quét từ 0 đến 180 độ

## Xong rồi!

Em đã biết quay servo ngay, quay từ từ và quét qua lại. Bài sau em sẽ dùng cảm biến để đo khoảng cách.
