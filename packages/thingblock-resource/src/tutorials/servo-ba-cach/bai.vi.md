---
ma: servo-ba-cach
ten: Servo ba cách quay
nhom: dong-co
thu-tu: 1
bo: thingbot
thoi-luong: 15
---

## Chào em!

Servo là động cơ quay tới một **góc** rồi giữ nguyên, từ 0 đến 180 độ. Trên mạch ảo có năm cổng servo **S1** đến **S5**.

Bài này em sẽ quay servo S1 theo ba cách: quay ngay, quay từ từ, và quay hai servo cùng lúc.

Bấm **Next** để bắt đầu.

## Quay ngay tới 90 độ

Kéo khối **set servo S1 to angle 90 degrees** vào trong khối **when Arduino begins**. Bấm **Run** và nhìn cần servo S1 trên mạch ảo.

> gợi ý: Khối servo nằm trong nhóm **ThingBot**. Ô đầu chọn **S1**, ô sau gõ **90**.

kiểm: servo S1 ở 90 độ

## Quay từ từ

Servo quay ngay thì giật. Đổi sang khối **move servo S1 to angle 180 degrees over 2 seconds**: servo đi từ chỗ đang đứng tới 180 độ trong 2 giây. Bấm **Run** lại và xem cần quay chậm.

> gợi ý: Khối "move servo" chờ cho tới khi quay xong rồi mới chạy khối tiếp theo.

kiểm: servo S1 ở 180 độ

## Hai servo cùng lúc

Khối "move" chờ xong mới đi tiếp, nên hai servo sẽ quay lần lượt. Muốn quay **cùng lúc**, dùng khối **start servo**: nó ra lệnh rồi đi tiếp ngay.

Xếp ba khối: **start servo S1 to angle 0 degrees over 1 seconds**, **start servo S2 to angle 90 degrees over 1 seconds**, rồi **wait for servos** để chờ cả hai quay xong.

> gợi ý: Thiếu khối **wait for servos** thì chương trình kết thúc trước khi servo quay tới nơi.
> gợi ý: S2 là ô chọn thứ hai trong khối, không cần thêm khối khác.

kiểm: servo S1 ở 0 độ
kiểm: servo S2 ở 90 độ

## Thả servo

Servo giữ góc thì tốn pin và nóng. Khi xong việc, thêm khối **release servo S1** vào cuối để thả tay quay. Bước này không chấm, em thử rồi bấm **Next**.

## Xong rồi!

Em đã biết ba cách quay servo: **set** quay ngay, **move** quay từ từ và chờ, **start** quay nhiều servo cùng lúc. Bài sau em sẽ dùng servo để làm cánh tay gật đầu.
