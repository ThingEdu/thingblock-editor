---
id: sim-10-egg-sorter
name: ThingBot Sim 10: Dây chuyền phân loại trứng
group: inputs
order: 5
board: thingbot
duration: 25
peripherals: cobot
---

## Dự án: máy soi trứng

Trại gà mỗi ngày nhặt hàng chục nghìn quả trứng. Người ta **soi trứng**: rọi đèn qua vỏ, quả tốt sáng trong, quả hỏng **tối đục**. Máy phân loại làm việc này nhanh hơn người: **nhìn** từng quả trên băng chuyền rồi **gạt** quả hỏng sang thùng riêng. Nhà máy cà phê, nhà máy gạo, robot FanRoc chọn bóng cũng lựa theo cách đó.

Dây chuyền giống em **nhặt hạt đậu đen lẫn trong rổ đậu xanh**: mắt nhìn từng hạt, não quyết định, tay gạt hạt lạ ra. Ở đây mắt hồng ngoại là mắt, chip ESP32-C3 là não, servo S1 là bàn tay.

Em đã có đủ mảnh ghép:

- **Nhìn sáng, tối** (bài 6): mắt hồng ngoại IO4, gắn ngay trên cần gạt. Đây là **đầu vào**.
- **Quyết định** (bài 3, bài 6): số đọc nhỏ hơn 1500 là trứng hỏng.
- **Chạy băng chuyền** (bài 7): động cơ M1. Đây là **đầu ra**.
- **Gạt** (bài 5): servo S1, 90 độ là gạt, 0 độ là cho qua. Cũng là **đầu ra**.

**Đoán trước:** quả trứng hỏng đang nằm dưới mắt. Cần gạt nên ở góc nào?

- 90 độ
- 0 độ

> hint: Đáp án: **90 độ**. Cần gạt hạ xuống chắn đường, quả trứng lăn vào thùng loại. 0 độ là cần gạt nhấc lên, trứng đi qua: góc này dành cho trứng tốt.

Mở bài này là nhóm khối **Cobot IR** đã có sẵn trong bảng khối, và mạch ảo có sẵn băng chuyền trứng.

Bấm **Tiếp** để bắt đầu.

## Lắp máy phân loại

1. Trong **khi Arduino khởi động**, dưới **khởi động ThingBot**: thêm **động cơ M1 chạy tiến tốc độ 40%** cho băng chuyền chạy, và **đặt servo S1 góc 0 độ** để cần gạt nhấc lên.
2. Trong **vòng lặp Arduino**: kéo **nếu … thì … nếu không thì**. Ô lục giác là **… < 1500**, ô bên trái dấu **<** là **đọc mắt hồng ngoại 1 · IO4**.
3. Chỗ **thì**: **đặt servo S1 góc 90 độ**. Chỗ **nếu không thì**: **đặt servo S1 góc 0 độ**.
4. Dưới khối **nếu**: **đợi 0.05 giây**.

Bấm **Chạy**. **6 quả liền** phải vào đúng thùng, và cần gạt phải gạt được ít nhất 2 quả trứng hỏng.

> hint: Băng chuyền chưa chạy: thêm **động cơ M1 chạy tiến tốc độ 40%** vào **khi Arduino khởi động**.
> hint: Trứng tốt cũng bị gạt: chỗ **nếu không thì** cần **đặt servo S1 góc 0 độ** để nhấc cần gạt lên.
> hint: Trứng hỏng lọt vào thùng trứng tốt: kiểm tra ngưỡng **< 1500**, chỗ **thì** là servo 90 độ, và khối **đợi** thật ngắn (0.05 giây) để não kịp nhìn.

check: read IR eye IO4
check: sort 6 eggs in a row
check: reject 2 bad eggs

## Hiểu sâu: băng chạy nhanh thì sao?

Mắt chỉ nhìn thấy mỗi quả trứng trong một khoảnh khắc ngắn. Băng chạy càng nhanh, khoảnh khắc đó càng ngắn.

**Đoán trước:** em đổi khối **đợi** thành **1 giây**. Chuyện gì xảy ra?

- Vẫn phân loại đúng hết.
- Có trứng hỏng lọt qua.

> hint: Đáp án: **có trứng hỏng lọt qua**. Trong một giây não đứng chờ, quả trứng hỏng đã chạy qua mắt và qua cần gạt trước khi não kịp nhìn lại.

Thử đổi tốc độ M1 thành **100**, hoặc khối đợi thành **1 giây**, rồi xem số "nhầm" trên băng chuyền. Kỹ sư nhà máy phải cân giữa **nhanh** và **không sót**. Bước này không chấm.

## Thử thách: còi báo trứng hỏng

Máy soi trứng thật kêu lên cho người trông máy biết. Thêm **chơi nốt C (Do) quãng 5 trong 0.25 phách** (nhóm **ThingBot**) vào chỗ **thì**, ngay sau khối **đặt servo S1 góc 90 độ**. Còi cũng là một **đầu ra** do mạch công suất cấp điện, giống đèn L1 và động cơ.

> hint: Nốt nhạc dài làm não bận lâu. Giữ nốt ngắn (0.25 phách) để não kịp nhìn quả trứng sau.

check: buzzer on
check: sort 6 eggs in a row

## Hoàn thành 10 bài!

Em vừa làm một **máy phân loại**: **nhìn → nghĩ → làm**, lặp mãi trong **vòng lặp Arduino**. Dây chuyền lựa trứng, máy lựa cà phê, robot FanRoc chọn bóng đều làm việc theo đúng ba bước này.

Em cũng đã biết ba điều kỹ sư robot dùng hằng ngày:

- **đầu vào và đầu ra**: cái gì báo tin cho não, cái gì nhận lệnh từ não;
- **0 và 1**: nút chỉ có bấm hay không, còn mắt hồng ngoại cho cả một con số;
- **chân nào nối với gì**: đọc sơ đồ mạch để biết, ví dụ mắt hồng ngoại ở IO4.

Bước tiếp: dùng **cảm biến màu** của Cobot để lựa đúng theo màu đỏ, lục, lam. Hoặc chọn mạch ThingBot, ghép đúng các khối này rồi bấm **Nạp code** để chạy trên robot thật. Nhớ rút pin trước khi cắm dây mắt hồng ngoại và servo.
