---
id: sim-05-servo-sweep
name: ThingBot Sim 5: Servo quét
group: motors
order: 2
board: thingbot
duration: 20
---

## Nhiệm vụ: barie bãi gửi xe

Thanh **barie** ở bãi gửi xe, **cần gạt nước** ô tô, nắp **hộp quà tự mở**: chúng không quay tròn mãi mà quay tới **đúng một góc** rồi đứng yên. Thứ làm việc đó là **servo**.

Nhiệm vụ: làm thanh barie bằng servo cắm ở cổng **S1**. Mở lên 90 độ, rồi cho nó quét qua lại như cần gạt nước.

Giống cơ thể người: servo là **khớp tay**. Em nhắm mắt vẫn giơ tay đúng 90 độ rồi giữ yên được, vì cơ thể tự biết tay đang ở đâu. Servo cũng có bộ đo góc bên trong như vậy.

**Đoán trước:** servo khác động cơ bánh xe ở chỗ nào?

- Servo quay tới một góc rồi giữ nguyên
- Servo quay nhanh hơn
- Servo không cần điện

> hint: Đáp án: **servo quay tới một góc rồi giữ nguyên**. Bên trong servo có bộ đo góc: nó tự quay tới góc em đặt rồi giữ chặt ở đó. Động cơ bánh xe thì quay mãi.

Bấm **Tiếp** để bắt đầu.

## Mở barie: 90 độ

Dưới **khởi động ThingBot**, thêm khối **đặt servo S1 góc 90 độ** (nhóm **ThingBot**). Bấm **Chạy** và nhìn cần servo S1.

Servo quay **ngay** tới 90 độ, nhanh hết mức nó có thể.

check: servo S1 at 90 deg

## Mở từ từ

Barie bật phắt lên thì nguy hiểm. Thay khối đó bằng **quay servo S1 tới góc 180 độ trong 2 giây**. Servo đi từ chỗ đang đứng tới 180 độ trong 2 giây.

> hint: Khối **quay servo** chờ quay xong rồi mới chạy khối tiếp theo.

check: servo S1 at 180 deg

## Quét qua lại

Cho servo quét mãi như **cần gạt nước**. Đưa việc quay vào **vòng lặp Arduino**, khối chạy đi chạy lại mãi mãi:

- **quay servo S1 tới góc 0 độ trong 1 giây**
- **quay servo S1 tới góc 180 độ trong 1 giây**

**Đoán trước:** nếu chỉ có khối quay tới **180** độ trong vòng lặp, servo sẽ…

- Quét qua lại mãi
- Đi tới 180 độ một lần rồi đứng yên

> hint: Đáp án: **đi tới 180 độ một lần rồi đứng yên**. Từ vòng thứ hai, servo đã ở 180 độ rồi, không còn chỗ nào để đi. Cần thêm khối về **0** độ.

Bấm **Chạy** và đợi servo đi hết một vòng.

check: servo S1 sweeps from 0 to 180 deg

## Hiểu sâu: servo nghe lệnh thế nào?

Vì sao chọn S1? Mỗi cổng S1 đến S5 có 3 chân:

- **GND** (dây nâu hoặc đen),
- **5V** (dây đỏ),
- **tín hiệu** (dây cam hoặc vàng).

Năm cổng này được hàn sẵn tới **mạch công suất**. Servo của bài cắm ở **S1** nên khối chọn S1. Cắm sang S3 thì đổi khối thành S3.

Não không nói "quay 90 độ" bằng lời. Mạch công suất gửi cho servo một **xung điện** đều đặn, 50 lần mỗi giây:

- **xung ngắn** nghĩa là góc nhỏ,
- **xung dài** nghĩa là góc lớn.

Mạch công suất đo độ dài xung trên thang **4096 bậc**: khoảng bậc **102** là 0 độ, khoảng bậc **512** là 180 độ.

Trên robot thật, servo lấy điện từ **pin**: phải lắp pin và bật công tắc nguồn thì servo mới quay.

Bước này không chấm, em đọc xong thì bấm **Tiếp**.

## Xong rồi!

Em biết hai cách quay servo: **đặt servo** quay ngay, **quay servo** quay từ từ và chờ quay xong. Barie thật cũng vậy, chỉ thêm một cảm biến thấy xe tới.

Xong việc thì thả servo cho đỡ tốn pin: **thả lỏng servo S1**. Bài 6 em làm cho robot **tự thấy** quả bóng trước mặt.
