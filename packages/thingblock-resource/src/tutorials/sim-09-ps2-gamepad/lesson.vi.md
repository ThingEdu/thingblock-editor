---
id: sim-09-ps2-gamepad
name: ThingBot Sim 9: Tay cầm điều khiển
group: inputs
order: 4
board: thingbot
duration: 20
---

## Nhiệm vụ: xe điều khiển từ xa

Em đã từng chơi **xe điều khiển từ xa** chưa? Bài này em làm một chiếc như vậy: giữ **▲** thì xe đi tới, giữ **▼** thì xe lùi, không bấm gì thì xe dừng.

**Tay cầm PS2** gửi lệnh qua **sóng radio**, không cần dây. Một **bộ thu** cắm ở **cổng PS2** trên mạch ThingBot nghe sóng đó rồi báo cho não. Bộ thu là **đôi tai** của robot: nó nghe lệnh từ xa, như em nghe bạn gọi tên từ đầu kia sân trường.

Tay cầm có nhiều nút. Mỗi nút chỉ có hai trạng thái: **đang bấm** hoặc **không bấm**, giống nút SW ở bài 3. Khác ở chỗ não nhận tin của nhiều nút cùng lúc, qua sóng radio.

Bấm **Tiếp** để bắt đầu.

## Giữ ▲ để đi tới

1. Dưới **khởi động ThingBot**, thêm **khởi động tay cầm PS2 trên ThingBot** (nhóm **ThingBot**). Khối này đã biết bộ thu cắm ở những chân nào, em không cần gõ số.
2. Trong **vòng lặp Arduino**, đặt **đọc dữ liệu tay cầm PS2** (nhóm **PS2**) đầu tiên. Đây là lúc não hỏi bộ thu: "nút nào đang bấm?".
3. Thêm **nếu … thì … nếu không thì** với ô lục giác là **nút lên của PS2 đang bấm?**.
4. Chỗ **thì**: **động cơ M1 chạy tiến tốc độ 50%** và **động cơ M2 chạy tiến tốc độ 50%**.
5. Thêm **đợi 0.02 giây** dưới khối **nếu**. Như vậy não hỏi tay cầm khoảng 50 lần mỗi giây, đủ nhanh để tay em không thấy trễ.

**Đoán trước:** nếu bỏ khối **đọc dữ liệu tay cầm PS2** thì sao?

- Bấm nút mà xe không phản ứng.
- Xe chạy nhanh hơn.

> hint: Đáp án: **bấm nút mà xe không phản ứng**. Không hỏi bộ thu thì não không có tin mới, nó cứ tưởng chưa ai bấm gì.

Bấm **Chạy**, đợi một giây cho tay cầm kết nối, rồi giữ nút **▲** ở khung **Tay cầm PS2**.

> hint: Thiếu **đọc dữ liệu tay cầm PS2** thì não không biết nút nào đang được giữ.
> hint: Thiếu **khởi động tay cầm PS2 trên ThingBot** trong **khi Arduino khởi động** thì não không nói chuyện được với bộ thu.

check: hold PS2 up
check: M1 forward
check: M2 forward

## Giữ ▼ để lùi

Chỗ **nếu không thì**, đặt một khối **nếu … thì … nếu không thì** nữa với **nút xuống của PS2 đang bấm?**:

- chỗ **thì**: cho M1 và M2 **lùi** ở tốc độ 50%,
- chỗ **nếu không thì**: cho M1 và M2 tốc độ **0%** để xe dừng.

Nhả mọi nút thì xe phải dừng. Đó là **quy tắc an toàn** của mọi xe điều khiển, kể cả robot thi đấu: em buông tay là xe đứng lại, không tự chạy lung tung.

Giữ nút **▼**.

check: hold PS2 down
check: M1 backward
check: M2 backward

## Hiểu sâu: lệnh đi qua những đâu

Khi em giữ nút ▲, lệnh đi qua cả một chuỗi:

1. **Tay cầm** gửi sóng radio.
2. **Bộ thu** ở cổng PS2 nghe sóng, biết nút nào đang bấm.
3. **Não** hỏi bộ thu mỗi vòng lặp (khối **đọc dữ liệu tay cầm PS2**), rồi quyết định bằng khối **nếu**.
4. **Mạch công suất** nhận lệnh từ não, cấp điện cho động cơ.
5. **Hai bánh** quay.

Bộ thu là **đầu vào** (báo tin cho não), động cơ là **đầu ra** (nhận lệnh từ não). Não ở giữa, quyết định.

## Thử thách: rẽ

Thêm nút **◀** và **▶** để xe xoay tại chỗ: xoay trái thì M1 lùi, M2 tiến; xoay phải thì M1 tiến, M2 lùi. Bước này không chấm.

## Xong rồi!

Em đã làm một chiếc xe điều khiển từ xa: **tay cầm → bộ thu → não → mạch công suất → hai bánh**. Robot thi đấu cũng lái theo đúng chuỗi này.

Bài cuối, em bỏ tay cầm đi và để xe **tự lái**.
