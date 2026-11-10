---
ma: sim-01-lam-quen-thingbot
ten: ThingBot Sim 1: Làm quen ThingBot
nhom: lam-quen
thu-tu: 1
bo: thingbot
thoi-luong: 15
---

## Nhiệm vụ: mổ xẻ robot

Trước khi ra lệnh cho robot, kỹ sư phải biết robot có những gì. Hôm nay em là **kỹ sư mổ xẻ**: tìm từng bộ phận của ThingBot và đoán nó làm gì.

Đây là bài đầu tiên của chuỗi 10 bài **ThingBot Sim**. Cuối bài, em sẽ tự bật hai chiếc đèn trên mạch ThingBot ảo.

Bấm sang bước sau để bắt đầu.

## Robot giống một con người

Nhìn mạch ThingBot ảo ở khung **Mô phỏng** bên phải. Robot cũng có các bộ phận giống người:

- **Bộ não** là chip **ESP32-C3**. Não nhận tin, suy nghĩ, rồi ra lệnh.
- **Làn da** là nút bấm **SW**. Em chạm vào là não biết.
- **Cái nháy mắt** là hai đèn nhỏ **L1** và **L2**. Robot dùng đèn để ra hiệu.
- **Cái miệng** là chiếc **còi**.
- **Cơ bắp chân** là bốn cổng động cơ **M1** đến **M4**, cắm động cơ bánh xe.
- **Khớp tay** là năm cổng servo **S1** đến **S5**. Servo quay tới đúng một góc rồi đứng yên.

Não nối ra ngoài bằng nhiều sợi dây gọi là **chân**. Mỗi chân có một số riêng, ví dụ **IO3**. Như dây thần kinh nối não với tay chân.

Thứ **báo tin cho não** (nút bấm, cảm biến) gọi là **đầu vào**. Thứ **nhận lệnh từ não** (đèn, còi, động cơ, servo) gọi là **đầu ra**.

**Đoán trước:** màn hình OLED (em gặp ở bài 4) là đầu vào hay đầu ra?

- Đầu vào
- Đầu ra

> gợi ý: Đáp án: **đầu ra**. Màn hình không báo gì cho não. Não gửi chữ tới, màn hình vẽ ra cho người xem, như khuôn mặt của robot.
> gợi ý: Thêm một câu: cảm biến siêu âm là **đầu vào**. Nó đo vật cách bao xa rồi báo cho não, như con dơi kêu rồi nghe tiếng vọng.

chỉ vào: mo-phong

## Bật đèn L2

Mọi chương trình ThingBot đều bắt đầu bằng hai khối:

1. Mở nhóm **Sự kiện**, kéo khối **khi Arduino khởi động** ra vùng lập trình. Các khối bên trong nó chạy **một lần** lúc bật máy.
2. Mở nhóm **ThingBot**, kéo khối **khởi động ThingBot** vào trong khối đó. Khối này đánh thức **mạch công suất**, chỗ cấp điện cho đèn, còi, động cơ và servo.

Giờ thêm khối **đặt đèn L2 độ sáng 100%** ngay dưới **khởi động ThingBot**, rồi bấm **Chạy** ở khung Mô phỏng. Đèn L2 sẽ sáng.

> gợi ý: Ô đầu của khối **đặt đèn** chọn đèn **1** hay **2**, ô sau là độ sáng từ 0% (tắt) đến 100% (sáng nhất).
> gợi ý: Thiếu khối **khởi động ThingBot** thì mạch công suất chưa thức dậy, đèn không sáng.

kiểm: L2 sáng

## Thử thách: hai đèn cùng sáng

Thêm một khối **đặt đèn L1 độ sáng 100%** nữa để cả L1 và L2 cùng sáng.

kiểm: L1 sáng
kiểm: L2 sáng

## Hiểu sâu: lệnh đi đường nào?

**Đoán trước:** em bấm nút SW và đèn L1 sáng. Ai ra lệnh **trực tiếp** cho đèn L1?

- Nút SW
- Não ESP32-C3
- Mạch công suất

> gợi ý: Đáp án: **mạch công suất**. Nút SW chỉ báo cho não "đang bị bấm". Não quyết định bật đèn, nhưng não không nối thẳng vào đèn.

Não chỉ "nói thầm": dòng điện ra từ não rất nhỏ, không đủ cho đèn, còi hay động cơ. **Mạch công suất** nằm dưới tấm mạch chứa não. Nó nghe lời thầm của não qua **hai sợi dây I2C**, rồi đẩy điện đủ mạnh cho đèn L1, L2, còi, động cơ và servo.

Giống cơ thể người: **não → dây thần kinh → cơ bắp**. Trên ThingBot: **não → mạch công suất → đèn, còi, động cơ**.

**Đoán trước:** robot thật đã cắm dây USB, chương trình chạy, đèn sáng, nhưng **bánh xe không quay**. Em cần làm gì?

- Nạp lại chương trình
- Lắp pin và bật công tắc nguồn
- Bấm nút SW

> gợi ý: Đáp án: **lắp pin và bật công tắc nguồn**. Chương trình vẫn chạy vì đèn đã sáng. Dây USB chỉ đủ nuôi mạch và nạp chương trình; động cơ và servo cần điện từ pin.

## Xong rồi!

Em đã biết các bộ phận của ThingBot, biết đầu vào và đầu ra, và biết lệnh đi thế nào: não → mạch công suất → đèn, còi, động cơ.

Bài sau em sẽ biến đèn L1 thành đèn báo hiệu nhấp nháy.
