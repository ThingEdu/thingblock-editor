---
ma: bat-tat-den
ten: Bật tắt đèn
nhom: dau-ra
thu-tu: 1
bo: thingbot
thoi-luong: 12
---

## Nhiệm vụ: đèn báo của máy

Tivi, nồi cơm điện, máy sạc điện thoại đều có một **đèn báo** nhỏ. Đèn sáng là máy đang chạy, đèn tắt là máy nghỉ.

Nhiệm vụ: làm đèn báo cho ThingBot. Em bật đèn **L1** cho sáng, rồi tắt nó đi, chỉ bằng khối lệnh.

Trên mạch ThingBot ảo bên phải có hai đèn nhỏ **L1** và **L2**.

Giống cơ thể người: chip **ESP32-C3** là **não** của ThingBot. Đèn là **đầu ra**: nó nhận lệnh từ não rồi làm theo, như tay em giơ lên khi não bảo.

Đoán trước: não ra lệnh, nhưng ai cấp điện cho đèn sáng?

- Não tự cấp điện cho đèn
- Một mạch khác trên ThingBot cấp điện, não chỉ ra lệnh

> gợi ý: Đáp án: một mạch khác. Trên ThingBot, não gửi lệnh qua hai sợi dây tới **mạch công suất**. Mạch công suất mới là chỗ cấp điện cho đèn L1, L2, còi, động cơ và servo. Não giống người chỉ huy, mạch công suất giống người làm.

Bấm **Tiếp** để bắt đầu.

## Bật đèn L1

Mở nhóm **ThingBot** ở cột khối bên trái. Kéo khối **đặt đèn L1 độ sáng 100%** vào bên trong khối **khi Arduino khởi động**.

Khối **khi Arduino khởi động** chạy các khối bên trong **đúng một lần**, ngay lúc bật máy. Giống buổi sáng em thức dậy là mở mắt ngay.

Bấm **Chạy** ở khung **Mô phỏng**. Đèn L1 trên mạch ảo sẽ sáng.

> gợi ý: Khối **đặt đèn** có hai ô: ô đầu chọn **L1**, ô sau là độ sáng, để **100%** là sáng hết cỡ.
> gợi ý: Khối phải nằm _bên trong_ khối **khi Arduino khởi động** thì mới chạy.

kiểm: L1 sáng

## Tắt đèn L1

Giờ hãy tắt đèn. Trong khối **đặt đèn L1 độ sáng 100%**, đổi **100%** thành **0%**, rồi bấm **Chạy** lại. Đèn L1 sẽ tắt.

Độ sáng **0%** nghĩa là không cấp chút điện nào, nên đèn tắt.

kiểm: L1 tắt

## Hiểu sâu: đèn sáng một nửa thế nào?

Thử đổi độ sáng thành **50%** rồi bấm **Chạy**. Đèn sáng mờ hơn.

Thật ra mạch công suất không "rót nửa điện". Nó **bật và tắt đèn rất nhanh**, nhanh tới mức mắt em không kịp thấy chớp:

- **100%**: đèn bật suốt, sáng nhất.
- **50%**: đèn bật một nửa thời gian, tắt một nửa, nên trông mờ đi.
- **0%**: đèn tắt suốt.

Bật càng lâu thì càng sáng. Kỹ sư gọi cách "chớp thật nhanh" này là **PWM**. Mạch công suất chia mỗi lần chớp thành 4096 bậc nhỏ, nên đèn có thể sáng rất mịn.

## Xong rồi!

Em đã bật và tắt được đèn báo bằng khối lệnh: não ra lệnh, mạch công suất cấp điện, đèn làm theo.

Bài tiếp theo: làm đèn nhấp nháy, như đèn vàng ở ngã tư lúc nửa đêm.
