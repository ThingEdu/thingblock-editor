---
ma: sim-09-tay-cam-ps2
ten: ThingBot Sim 9: Tay cầm điều khiển
nhom: dau-vao
thu-tu: 4
bo: thingbot
thoi-luong: 20
---

## Chào em!

Bài này em lái xe ThingBot bằng **tay cầm PS2**: giữ **▲** thì xe đi tới, giữ **▼** thì xe lùi, không bấm thì xe dừng.

Bấm sang bước sau để bắt đầu.

## Giữ ▲ để đi tới

1. Dưới **khởi động ThingBot**, thêm **khởi động tay cầm PS2 trên ThingBot** (nhóm **ThingBot**).
2. Trong **vòng lặp Arduino**, đặt **đọc dữ liệu tay cầm PS2** (nhóm **PS2**) đầu tiên để đọc tay cầm.
3. Thêm **nếu … thì … nếu không thì** với ô lục giác là **nút lên của PS2 đang bấm?**.
4. Chỗ **thì**: **động cơ M1 chạy tiến tốc độ 50%** và **động cơ M2 chạy tiến tốc độ 50%**.
5. Thêm **đợi 0.02 giây** dưới khối **nếu**.

Bấm **Chạy**, đợi một giây cho tay cầm kết nối, rồi giữ nút **▲** ở khung **Tay cầm PS2**.

> gợi ý: Thiếu **đọc dữ liệu tay cầm PS2** thì não không biết nút nào đang được giữ.

kiểm: giữ nút PS2 lên
kiểm: M1 tiến
kiểm: M2 tiến

## Giữ ▼ để lùi

Chỗ **nếu không thì**, đặt một khối **nếu … thì … nếu không thì** nữa với **nút xuống của PS2 đang bấm?**:

- chỗ **thì**: cho M1 và M2 **lùi** ở tốc độ 50%,
- chỗ **nếu không thì**: cho M1 và M2 tốc độ **0%** để xe dừng.

Giữ nút **▼**.

kiểm: giữ nút PS2 xuống
kiểm: M1 lùi
kiểm: M2 lùi

## Thử thách: rẽ

Thêm nút **◀** và **▶** để xe xoay trái, xoay phải. Bước này không chấm.

## Xong rồi!

Em đã lái xe bằng tay cầm. Bài cuối, xe sẽ tự lái.
