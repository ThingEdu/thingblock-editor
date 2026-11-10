---
ma: servo-ba-cach
ten: Servo ba cách quay
nhom: dong-co
thu-tu: 1
bo: thingbot
thoi-luong: 18
---

## Nhiệm vụ: thanh chắn bãi xe

Ở cổng bãi gửi xe có **thanh chắn** (barie): xe tới thì thanh nhấc lên, xe qua rồi thì thanh hạ xuống. Thanh không quay tròn mãi, nó chỉ quay tới **đúng một góc** rồi đứng yên.

Động cơ làm được việc đó gọi là **servo**. Servo giống **khớp tay** của em: não bảo "giơ tay lên 90 độ" thì tay giơ đúng 90 độ rồi giữ nguyên. Servo quay được từ 0 đến 180 độ, tức là tối đa nửa vòng.

Trên mạch ảo có năm cổng cắm servo **S1** đến **S5**. Servo không lấy điện từ não: não ra lệnh qua hai dây I2C tới **mạch công suất**, mạch công suất mới cấp điện cho servo.

Bài này em sẽ quay servo S1 theo ba cách: quay ngay, quay từ từ, và quay hai servo cùng lúc.

Bấm **Tiếp** để bắt đầu.

## Quay ngay tới 90 độ

Kéo khối **đặt servo S1 góc 90 độ** vào trong khối **khi Arduino khởi động**. Bấm **Chạy** và nhìn cần servo S1 trên mạch ảo.

90 độ là góc vuông, như thanh chắn dựng đứng lên cho xe qua.

> gợi ý: Khối servo nằm trong nhóm **ThingBot**. Ô đầu chọn **S1**, ô sau gõ **90**.

kiểm: servo S1 ở 90 độ

## Quay từ từ

Servo quay ngay thì giật mạnh. Thanh chắn thật phải nhấc lên **từ từ** để không đập vào người.

Đổi sang khối **quay servo S1 tới góc 180 độ trong 2 giây**: servo đi từ chỗ đang đứng tới 180 độ trong 2 giây. Bấm **Chạy** lại và xem cần quay chậm.

> gợi ý: Khối **quay servo** chờ cho tới khi quay xong rồi mới chạy khối tiếp theo.

kiểm: servo S1 ở 180 độ

## Hai servo cùng lúc

Cổng bãi xe lớn có **hai thanh chắn** mở cùng lúc. Nhưng khối **quay servo** chờ quay xong mới đi tiếp, nên hai servo sẽ quay lần lượt, thanh này xong mới tới thanh kia.

Muốn quay **cùng lúc**, dùng khối **bắt đầu quay servo**: nó ra lệnh rồi đi tiếp ngay, không đứng chờ. Giống cô giáo giao việc cho bạn A, rồi quay sang giao việc cho bạn B luôn, hai bạn cùng làm.

Đoán trước: nếu chương trình chỉ có hai khối **bắt đầu quay servo** rồi hết, servo có kịp quay tới nơi không?

- Có, chắc chắn kịp
- Có thể không kịp, vì chương trình kết thúc trước

> gợi ý: Đáp án: có thể không kịp. Hai khối **bắt đầu quay servo** ra lệnh xong là đi tiếp ngay, nên chương trình hết trước khi servo quay xong. Phải thêm khối **chờ các servo quay xong** ở cuối.

Xếp ba khối: **bắt đầu quay servo S1 tới góc 0 độ trong 1 giây**, **bắt đầu quay servo S2 tới góc 90 độ trong 1 giây**, rồi **chờ các servo quay xong** để chờ cả hai quay xong.

> gợi ý: Thiếu khối **chờ các servo quay xong** thì chương trình kết thúc trước khi servo quay tới nơi.
> gợi ý: S2 là ô chọn thứ hai trong khối, không cần thêm khối khác.

kiểm: servo S1 ở 0 độ
kiểm: servo S2 ở 90 độ

## Thả servo

Servo giữ góc thì phải gồng liên tục, như em giơ tay mãi sẽ mỏi. Gồng lâu thì tốn pin và servo nóng lên.

Khi xong việc, thêm khối **thả lỏng servo S1** vào cuối để servo nghỉ, như em buông tay xuống. Bước này không chấm, em thử rồi bấm **Tiếp**.

## Xong rồi!

Em đã biết ba cách quay servo:

- **đặt servo**: quay ngay tới góc.
- **quay servo**: quay từ từ, chờ xong mới đi tiếp.
- **bắt đầu quay servo**: quay nhiều servo cùng lúc, nhớ có **chờ các servo quay xong**.

Thanh chắn bãi xe, cánh tay robot gắp đồ, cửa cho thú cưng tự mở đều dùng servo. Bài sau em sẽ dùng servo làm cánh tay gật đầu.
