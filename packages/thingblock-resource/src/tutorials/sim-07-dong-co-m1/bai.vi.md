---
ma: sim-07-dong-co-m1
ten: ThingBot Sim 7: Động cơ DC
nhom: dong-co
thu-tu: 3
bo: thingbot
thoi-luong: 15
---

## Nhiệm vụ: băng chuyền

Đèn và màn hình giúp robot **nói**. Động cơ giúp robot **làm việc thật**: quay quạt, chạy **băng chuyền** ở quầy thu ngân siêu thị, kéo bánh xe.

Nhiệm vụ: cho động cơ ở **cổng M1** quay tới, quay lùi như băng chuyền chở hàng qua lại, rồi đổi tốc độ. Trên ThingBot có bốn cổng động cơ, từ **M1** đến **M4**.

Động cơ là **cơ bắp** của robot. Não người không tự nhấc được cặp sách: não chỉ gửi một tín hiệu rất nhỏ, cơ bắp mới dùng sức. Ở robot cũng vậy: não (chip ESP32-C3) ra lệnh qua hai sợi dây, **mạch công suất** nhận lệnh rồi đẩy điện mạnh từ pin vào động cơ.

**Đoán trước:** vì sao não không nối thẳng vào động cơ?

- Động cơ cần dòng điện lớn hơn não chịu được rất nhiều lần.
- Vì động cơ ở xa não.

> gợi ý: Đáp án: **động cơ cần dòng điện lớn**. Chân của não chỉ cho ra dòng điện rất nhỏ, đủ để báo tin. Nối thẳng động cơ vào thì hỏng chân não. Vì vậy lệnh đi qua mạch công suất, mạch này đủ khoẻ để cấp điện cho động cơ.

## Quay tới

Trong **vòng lặp Arduino** (phần chạy đi chạy lại mãi), thêm khối **động cơ M1 chạy tiến tốc độ 60%** (nhóm **ThingBot**) rồi **đợi 2 giây**. Bấm **Chạy** và nhìn mũi tên quay ở cổng M1.

> gợi ý: Số cuối là tốc độ, từ 0% (dừng) đến 100% (nhanh nhất).

kiểm: M1 tiến

## Tới rồi lùi

Băng chuyền chở hàng đi rồi chở về. Thêm **động cơ M1 chạy lùi tốc độ 60%** và **đợi 2 giây** nữa. Động cơ sẽ quay tới 2 giây, lùi 2 giây, rồi lặp lại mãi.

Động cơ đổi chiều quay bằng cách nào? Mạch công suất **đảo chiều dòng điện** chạy qua động cơ. Điện chạy chiều này thì động cơ quay tới, chạy chiều ngược lại thì quay lùi.

> gợi ý: Chọn **lùi** ở ô giữa của khối thứ hai.
> gợi ý: Cả bốn khối phải nằm trong **vòng lặp Arduino**, xếp theo thứ tự: tiến, đợi, lùi, đợi.

kiểm: M1 tiến
kiểm: M1 lùi

## Nhanh và chậm

**Đoán trước:** tốc độ 30% và 100% khác nhau thế nào ở dòng điện?

- Điện được bật tắt rất nhanh; bật lâu hay bật ngắn trong mỗi nhịp là khác nhau.
- Tốc độ 100% dùng một cục pin khác.

> gợi ý: Đáp án: **bật lâu hay bật ngắn**. Giống đèn sáng một nửa ở bài 2: mạch công suất bật tắt điện cực nhanh. Số càng lớn, thời gian "bật" trong mỗi nhịp càng dài, động cơ nhận nhiều điện hơn nên quay nhanh hơn. Vẫn là cùng một cục pin.

Giờ thử thật: cho băng chuyền chạy tới thật nhanh, đổi tốc độ của khối **tiến** thành **100%**.

kiểm: M1 tốc độ ≥ 90%

## Hiểu sâu: chiều và tốc độ

Một lệnh cho động cơ luôn có hai phần:

- **Chiều** (tiến hay lùi): mạch công suất chọn cho điện chạy qua động cơ theo chiều nào.
- **Tốc độ** (từ 0% đến 100%): mạch công suất bật điện bao lâu trong mỗi nhịp. Nó chia mỗi nhịp thành 4096 bậc, nên tốc độ đổi được rất mịn.

Tốc độ **0%** nghĩa là không bật chút nào: động cơ dừng.

## Xong rồi!

Em đã điều khiển **chiều quay** và **tốc độ** của động cơ, như bộ điều khiển băng chuyền ở siêu thị.

Bài sau em ghép **hai** động cơ thành một chiếc xe: M1 quay bánh trái, M2 quay bánh phải.
