---
ma: sim-10-xe-tranh-vat-can
ten: ThingBot Sim 10: Xe tránh vật cản
nhom: dau-vao
thu-tu: 5
bo: thingbot
thoi-luong: 25
thiet-bi: ultrasonic
---

## Dự án: robot hút bụi

**Robot hút bụi** tự đi khắp phòng mà không đâm vào tủ, vào chân bàn. Không ai cầm tay cầm lái nó. Bí mật của nó là lặp mãi ba việc: **nhìn → nghĩ → làm**.

Em làm việc đó mỗi ngày: mắt thấy cái cột trước mặt, não nghĩ "sắp đâm rồi", chân bước tránh sang bên. Xe ThingBot của em cũng vậy:

- **Nhìn** (bài 6): cảm biến siêu âm ở mũi xe đo khoảng cách tới vật phía trước. Đây là **đầu vào**.
- **Nghĩ** (bài 3, bài 6): nếu khoảng cách nhỏ hơn 25 cm thì xoay, không thì đi thẳng.
- **Làm** (bài 7, bài 8): hai bánh xe, M1 bánh trái, M2 bánh phải. Đây là **đầu ra**.

Bài cuối này ghép mọi thứ em đã học. Em đã có đủ mảnh ghép!

Mở bài này là nhóm khối **Ultrasonic** đã có sẵn trong bảng khối.

## Đường trống thì đi thẳng

Trong **vòng lặp Arduino** (phần chạy đi chạy lại mãi, để xe nhìn và nghĩ liên tục):

1. Kéo **nếu … thì … nếu không thì**.
2. Ô lục giác: **cảm biến siêu âm chân TRIG 0 ECHO 4 đọc khoảng cách cm** **<** **25**.
3. Chỗ **nếu không thì** (đường trống): **động cơ M1 chạy tiến tốc độ 50%** và **động cơ M2 chạy tiến tốc độ 50%**.
4. Thêm **đợi 0.05 giây** dưới khối **nếu**.

Bấm **Chạy**. Kéo thanh **Vật cản cách cảm biến** lên trên **50** cm: xe đi thẳng.

> gợi ý: Nhớ bài 6: cảm biến cắm TRIG ở IO0, ECHO ở IO4, nên hai ô số là **0** và **4**.

kiểm: khoảng cách ≥ 50 cm
kiểm: M1 tiến
kiểm: M2 tiến

## Gặp vật thì xoay

Chỗ **thì** (vật ở gần), cho xe xoay: **động cơ M1 chạy tiến tốc độ 50%** và **động cơ M2 chạy lùi tốc độ 50%**. Kéo thanh khoảng cách xuống dưới **25** cm.

> gợi ý: Như bài 8: hai bánh quay ngược chiều nhau thì xe xoay tại chỗ.

kiểm: khoảng cách < 25 cm
kiểm: M1 tiến
kiểm: M2 lùi

## Nhanh hơn thì sao?

**Đoán trước:** xe chạy nhanh hơn thì con số ngưỡng 25 nên…

- to hơn, để thấy vật từ xa hơn;
- nhỏ hơn;
- không cần đổi.

> gợi ý: Đáp án: **to hơn**. Trong lúc não nghĩ và xe kịp xoay, xe chạy nhanh đã lao thêm một đoạn. Thấy vật sớm hơn mới kịp né, giống ô tô chạy nhanh phải giữ khoảng cách xa hơn với xe phía trước.

Giờ thử: tăng tốc độ đi thẳng lên **80%**, rồi đổi **25** thành **40**. Mỗi lần thử, em **ghi lại**: tốc độ bao nhiêu, ngưỡng bao nhiêu, xe xoay lúc vật còn cách bao xa. Kỹ sư thật cũng thử và ghi chép như vậy. Bước này không chấm.

## Thử thách: còi báo

Robot hút bụi hay kêu khi gặp chỗ khó. Cho xe của em **kêu** mỗi lần gặp vật cản: thêm **đặt còi xung 2000** vào chỗ **thì**. Khi đường trống, tắt còi bằng **đặt còi xung 0** ở chỗ **nếu không thì**.

Còi cũng là một **đầu ra** do mạch công suất cấp điện, giống đèn L1 và động cơ.

kiểm: khoảng cách < 25 cm
kiểm: còi kêu

## Hiểu sâu: cảm biến chỉ nhìn thẳng

Cảm biến siêu âm chỉ "nghe" tiếng vang từ phía **trước mũi xe**. Vật nằm lệch sang bên hông thì nó không thấy.

- Xe đi sát góc tủ: mũi xe qua được nhưng hông xe có thể quệt vào góc.
- Vật quá thấp, nằm dưới tia siêu âm: cảm biến cũng không thấy.

Vì vậy robot hút bụi thật có nhiều cảm biến quanh thân, và có cả cái cản va ở mũi: lỡ chạm vào đồ vật thì nó biết để lùi lại.

## Hoàn thành 10 bài!

Em đã đi hết chặng đường: **đèn → nút → màn hình → servo → cảm biến → động cơ → xe → tay cầm → xe tự lái**. Em đã biết ba điều mà kỹ sư robot dùng hằng ngày:

- **đầu vào và đầu ra**: cái gì báo tin cho não, cái gì nhận lệnh từ não;
- **nhìn → nghĩ → làm**, lặp mãi trong **vòng lặp Arduino**;
- **chân nào nối với gì**: đọc sơ đồ mạch để biết, ví dụ siêu âm ở IO0 và IO4.

Giờ hãy mở ThingBlock, chọn bo ThingBot, ghép đúng các khối này rồi bấm **Nạp code** để chạy trên xe thật.
