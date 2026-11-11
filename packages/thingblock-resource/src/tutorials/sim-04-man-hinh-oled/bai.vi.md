---
ma: sim-04-man-hinh-oled
ten: ThingBot Sim 4: Màn hình OLED
nhom: dau-vao
thu-tu: 2
bo: thingbot
thoi-luong: 20
thiet-bi: oled
---

## Nhiệm vụ: bảng tên robot

Đèn chỉ nói được hai điều: **có** hoặc **không**. Muốn robot nói được **chữ và số** (tên, nhiệt độ, lời nhắn) thì cần **màn hình**, như màn hình lò vi sóng hay đồng hồ điện tử.

Nhiệm vụ: làm **bảng tên** cho robot trên màn hình **OLED**. OLED là màn hình nhỏ xíu, mỗi chấm tự phát sáng, viết được chữ và vẽ hình. Màn hình cắm vào **cổng I2C** của ThingBot.

Giống cơ thể người: màn hình là **khuôn mặt** của robot, chỗ nó "nói" bằng chữ và hình cho người đứng xem.

Mở bài này là nhóm khối **OLED** đã có sẵn trong bảng khối.

Bấm **Tiếp** để bắt đầu.

## Viết dòng đầu tiên

Dưới **khởi động ThingBot** trong **khi Arduino khởi động**, xếp ba khối của nhóm **OLED**:

1. **khởi động OLED rộng 128 cao 64 địa chỉ I2C 0x78 (0x3c) chip SSD1306**: đánh thức màn hình.
2. **OLED in Xin chao xuống dòng**: viết chữ vào **bộ nhớ** của màn hình, như viết vào giấy nháp. Ô cuối để nguyên **xuống dòng**.
3. **hiện lên màn OLED**: đưa giấy nháp lên bảng cho mọi người xem.

**Đoán trước:** nếu thiếu khối **hiện lên màn OLED**, màn hình sẽ…

- Vẫn hiện chữ
- Đen, không có gì

> gợi ý: Đáp án: **đen, không có gì**. Chữ mới nằm trong bộ nhớ. Màn hình vẽ xong cả trang trong bộ nhớ rồi mới hiện một lần, để không bị nhấp nháy.
> gợi ý: Gõ chữ không dấu, ví dụ "Xin chao": màn hình chỉ có bảng chữ tiếng Anh.

Bấm **Chạy**.

kiểm: OLED hiện "Xin chao"

## Dòng thứ hai

Trước khối **hiện lên màn OLED**, thêm **đặt con trỏ OLED x: 0 y: 16** rồi **OLED in ThingBot xuống dòng**. **Con trỏ** là chỗ chữ tiếp theo sẽ được viết, như đầu bút đang đặt trên giấy. Sau khối in có **xuống dòng**, bút đã ở đầu dòng kế, sát ngay dưới; khối **đặt con trỏ OLED** đưa bút xuống y 16 cho hai dòng thoáng hơn.

x và y trên màn hình:

- Màn hình là lưới **128 × 64 chấm sáng**.
- Điểm (0, 0) ở **góc trên bên trái**.
- **x** đi sang phải, **y** đi xuống dưới.
- Chữ cỡ nhỏ cao 8 chấm, nên y: 16 là xuống dưới, cách dòng đầu một khoảng.

> gợi ý: Thứ tự đúng: khởi động OLED → in "Xin chao" → đặt con trỏ → in "ThingBot" → hiện lên màn OLED.

kiểm: OLED hiện "Xin chao"
kiểm: OLED hiện "ThingBot"

## Hiểu sâu: hai dây, nhiều thiết bị

Cổng I2C có bốn chân:

- **GND, 5V**: cấp điện cho màn hình.
- **SDA**, nối chân **IO8** của não: chở dữ liệu (chữ, lệnh).
- **SCL**, nối chân **IO9** của não: gõ nhịp cho dữ liệu đi đều.

**I2C** là cách não "nói chuyện" với nhiều thiết bị chỉ bằng **hai sợi dây** này. Mạch công suất (điều khiển đèn, còi, động cơ) cũng nằm trên đúng hai dây này.

Vậy sao não không gửi nhầm? Vì mỗi thiết bị có một **"số nhà"** riêng, gọi là **địa chỉ**. Màn hình OLED ở số nhà **0x3C**, chính là ô **địa chỉ I2C** trong khối **khởi động OLED**. Não gọi đúng số nhà nào thì chỉ thiết bị đó trả lời.

Vì vậy em đừng dùng IO8, IO9 cho việc khác: chúng là "đường dây chung" của cả mạch.

Bước này không chấm, em đọc xong thì bấm **Tiếp**.

## Thử thách: tên em

Cho màn hình hiện **tên em** (không dấu) ở dòng thứ ba: **đặt con trỏ OLED x: 0 y: 32** rồi **OLED in …**. Bước này không chấm.

> gợi ý: Muốn chữ to: thêm **đặt chữ OLED cỡ … màu … màu nền …** ngay sau khối **khởi động OLED**, chọn cỡ 12x16.

## Xong rồi!

Robot của em đã có **bảng tên**. Em biết ba việc với OLED: **khởi động**, **in chữ** ở chỗ mình chọn bằng x, y, và **hiện lên màn** để mọi người xem.

Bài 5 em sẽ cho servo quay.
