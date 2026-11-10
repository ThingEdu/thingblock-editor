---
id: servo-three-ways
name: Servo ba cách quay
group: motors
order: 1
board: thingbot
duration: 15
---

## Chào em!

Servo là động cơ quay tới một **góc** rồi giữ nguyên, từ 0 đến 180 độ. Trên mạch ảo có năm cổng servo **S1** đến **S5**.

Bài này em sẽ quay servo S1 theo ba cách: quay ngay, quay từ từ, và quay hai servo cùng lúc.

Bấm **Tiếp** để bắt đầu.

## Quay ngay tới 90 độ

Kéo khối **đặt servo S1 góc 90 độ** vào trong khối **khi Arduino khởi động**. Bấm **Chạy** và nhìn cần servo S1 trên mạch ảo.

> hint: Khối servo nằm trong nhóm **ThingBot**. Ô đầu chọn **S1**, ô sau gõ **90**.

check: servo S1 at 90 deg

## Quay từ từ

Servo quay ngay thì giật. Đổi sang khối **quay servo S1 tới góc 180 độ trong 2 giây**: servo đi từ chỗ đang đứng tới 180 độ trong 2 giây. Bấm **Chạy** lại và xem cần quay chậm.

> hint: Khối "move servo" chờ cho tới khi quay xong rồi mới chạy khối tiếp theo.

check: servo S1 at 180 deg

## Hai servo cùng lúc

Khối "move" chờ xong mới đi tiếp, nên hai servo sẽ quay lần lượt. Muốn quay **cùng lúc**, dùng khối **bắt đầu quay servo**: nó ra lệnh rồi đi tiếp ngay.

Xếp ba khối: **bắt đầu quay servo S1 tới góc 0 độ trong 1 giây**, **bắt đầu quay servo S2 tới góc 90 độ trong 1 giây**, rồi **chờ các servo quay xong** để chờ cả hai quay xong.

> hint: Thiếu khối **chờ các servo quay xong** thì chương trình kết thúc trước khi servo quay tới nơi.
> hint: S2 là ô chọn thứ hai trong khối, không cần thêm khối khác.

check: servo S1 at 0 deg
check: servo S2 at 90 deg

## Thả servo

Servo giữ góc thì tốn pin và nóng. Khi xong việc, thêm khối **thả lỏng servo S1** vào cuối để thả tay quay. Bước này không chấm, em thử rồi bấm **Tiếp**.

## Xong rồi!

Em đã biết ba cách quay servo: **đặt** quay ngay, **quay** quay từ từ và chờ, **bắt đầu quay** quay nhiều servo cùng lúc. Bài sau em sẽ dùng servo để làm cánh tay gật đầu.
