---
id: sim-08-drive-and-turn
name: ThingBot Sim 8: Xe đi thẳng và rẽ
group: motors
order: 4
board: thingbot
duration: 20
---

## Nhiệm vụ: robot giao hàng

Robot giao hàng trong nhà kho, xe lăn điện, xe tăng: chúng **không có vô lăng**. Chúng rẽ bằng cách cho **hai bánh quay khác nhau**.

ThingBot giờ là một chiếc xe: động cơ **M1** quay bánh **trái**, động cơ **M2** quay bánh **phải**. Nhiệm vụ: cho xe đi thẳng một đoạn rồi xoay, như robot chở hàng tới đúng kệ.

Xe rẽ giống **hai người chèo thuyền**: một bên chèo mạnh, một bên ngừng chèo, thuyền quay về phía bên ngừng chèo.

**Đoán trước:** bánh trái quay tới, bánh phải đứng yên. Xe đi thế nào?

- Rẽ vòng sang phải.
- Rẽ vòng sang trái.
- Đi thẳng.

> hint: Đáp án: **rẽ vòng sang phải**. Bánh trái đẩy tới, bánh phải đứng yên làm trục, nên mũi xe quay về phía bánh đứng yên. Muốn đi thẳng thì hai bánh phải quay cùng chiều, cùng tốc độ.

## Đi thẳng rồi dừng

Bài này xe chạy một lần rồi thôi, nên em ghép khối trong **khi Arduino khởi động** (phần chạy đúng một lần lúc bật máy). Dưới **khởi động ThingBot**, xếp:

1. **động cơ M1 chạy tiến tốc độ 50%**
2. **động cơ M2 chạy tiến tốc độ 50%**
3. **đợi 2 giây**
4. **động cơ M1 chạy tiến tốc độ 0%**
5. **động cơ M2 chạy tiến tốc độ 0%**

Bấm **Chạy**: xe đi thẳng 2 giây rồi dừng.

> hint: Tốc độ **0%** nghĩa là dừng.
> hint: Hai bánh phải cùng **tiến** và cùng tốc độ thì xe mới đi thẳng.

check: M1 forward
check: M2 forward
check: M1 stop
check: M2 stop

## Xoay tại chỗ

Đổi khối thứ hai thành **động cơ M2 chạy lùi tốc độ 50%** và đổi **đợi 2 giây** thành **đợi 1 giây**. Bánh trái tới, bánh phải lùi: xe xoay tại chỗ, không tiến lên chút nào.

**Đoán trước:** muốn xe xoay **ít hơn** thì em đổi gì?

- Giảm số giây trong khối **đợi**.
- Thêm một khối **khởi động ThingBot** nữa.

> hint: Đáp án: **giảm số giây trong khối đợi**. Xe này không có la bàn, nên góc xoay phụ thuộc vào tốc độ và thời gian quay. Quay ngắn hơn thì xoay ít hơn.

check: M1 forward
check: M2 backward

## Hiểu sâu: thời gian thay cho la bàn

Xe ThingBot không biết mình đang quay về hướng nào. Nó chỉ làm theo lệnh: quay bánh bao lâu, nhanh bao nhiêu.

- Tốc độ cao hơn, hoặc đợi lâu hơn: xe xoay được góc lớn hơn.
- Pin yếu, sàn trơn: cùng một lệnh mà xe xoay lệch đi.

Vì vậy robot thật thường có thêm cảm biến để tự kiểm tra, ví dụ đếm số vòng bánh đã quay, hoặc la bàn điện tử.

## Thử thách: hình vuông

Cho xe đi thẳng rồi xoay một góc vuông, lặp lại bốn lần để vẽ một hình vuông, như robot đi tuần một vòng nhà kho. Gợi ý: dùng khối **lặp lại** trong nhóm **Điều khiển**, rồi chỉnh số giây xoay tới khi được góc vuông. Bước này không chấm.

## Xong rồi!

Em đã lái được xe đi thẳng, dừng và xoay bằng cách điều khiển **riêng từng bánh**, đúng cách robot giao hàng và xe lăn điện rẽ.

Nhưng xe này chạy theo kịch bản cố định. Bài sau em lái nó **bằng tay cầm**.
