---
ma: sim-03-nut-bam-bat-den
ten: ThingBot Sim 3: Nút bấm điều khiển đèn
nhom: dau-vao
thu-tu: 1
bo: thingbot
thoi-luong: 20
---

## Nhiệm vụ: đèn pin bấm giữ

**Chuông cửa**, nút **thang máy**, nút **đèn pin**: cách đơn giản nhất để người "nói" với máy là một **nút bấm**.

Nhiệm vụ: biến ThingBot thành đèn pin. **Giữ nút SW thì đèn L1 sáng, nhả ra thì tắt.**

Giống cơ thể người: nút SW là **làn da** của robot. Ai chạm vào tay em, dây thần kinh báo lên não "có người chạm". Em bấm nút, sợi dây nối vào **chân IO3** của não báo "đang bị bấm". (Chân là sợi dây nối não ra ngoài, mỗi chân có một số.)

**Đoán trước:** nút SW là đầu vào hay đầu ra?

- Đầu vào
- Đầu ra

> gợi ý: Đáp án: **đầu vào**. Nút báo tin cho não ("đang bị bấm"), não không ra lệnh được cho nút. Báo tin cho não là đầu vào; nhận lệnh từ não là đầu ra.

Bấm **Tiếp** để bắt đầu.

## Ghép khối

1. Giữ **khi Arduino khởi động** với **khởi động ThingBot**.
2. Trong **vòng lặp Arduino**, kéo khối **nếu … thì … nếu không thì** (nhóm **Điều khiển**).
3. Đặt khối **đọc nút SW** (nhóm **ThingBot**) vào ô hình lục giác. Đó là câu hỏi "nút có đang bấm không?".
4. Đặt **đặt đèn L1 độ sáng 100%** vào chỗ **thì**, và **đặt đèn L1 độ sáng 0%** vào chỗ **nếu không thì**.

**Đoán trước:** vì sao phải đặt **nếu** trong **vòng lặp Arduino**, không đặt trong **khi Arduino khởi động**?

- Vì khởi động chỉ chạy một lần lúc bật máy
- Vì đặt ở khởi động thì báo lỗi

> gợi ý: Đáp án: **vì khởi động chỉ chạy một lần lúc bật máy**. Đặt ở khởi động thì não chỉ hỏi nút đúng một lần rồi thôi. Trong vòng lặp, não hỏi lại liên tục nên biết ngay khi em bấm.

Bấm **Chạy**. Bước này không chấm, ghép xong em bấm **Tiếp**.

## Giữ nút SW

Giữ chuột trên nút **SW (giữ)** ở khung Mô phỏng. Đèn L1 phải sáng trong lúc em giữ.

Tin đi một vòng: nút báo vào não, não quyết định, rồi lệnh qua mạch công suất tới đèn.

> gợi ý: Đèn không sáng? Khối **đặt đèn L1 độ sáng 100%** phải nằm ở chỗ **thì**, ngay dưới ô lục giác.
> gợi ý: Chương trình chưa hỏi nút? Kiểm lại khối **đọc nút SW** đã nằm trong ô lục giác của **nếu … thì** chưa.

kiểm: giữ nút SW
kiểm: L1 sáng

## Nhả nút

Thả nút ra. Đèn L1 phải **tắt**.

Não hỏi nút **hàng trăm lần mỗi giây**, vì vậy đèn đổi ngay khi em nhả.

> gợi ý: Nhả nút mà đèn vẫn sáng? Chương trình mới có lệnh bật. Đặt **đặt đèn L1 độ sáng 0%** vào chỗ **nếu không thì**.

kiểm: nhả nút SW
kiểm: L1 tắt

## Hiểu sâu: 0 và 1 của nút

Não không "thấy" ngón tay em. Nó chỉ đo xem chân IO3 **có điện hay không**:

- Nhả nút: chân IO3 có 3,3 V, não đọc là **1**. Khối **đọc nút SW** trả về **sai**.
- Bấm nút: chân IO3 về 0 V, não đọc là **0**. Khối **đọc nút SW** trả về **đúng**.

Lạ không: **bấm lại là 0**! Vì nút này được nối kiểu "bấm thì kéo chân xuống 0 V". Khối **đọc nút SW** đã **đảo lại cho em**, nên em chỉ cần nhớ: bấm là **đúng**.

Vì sao là IO3 mà không phải chân khác? Chip não ESP32-C3 có nhiều chân, mỗi chân một số: IO0, IO1, IO2, IO3… Chân nào nối với cái gì là do **người thiết kế mạch** chọn rồi hàn cố định. Lập trình viên đọc **sơ đồ mạch** để biết. Trên ThingBot:

- nút SW ở **IO3**,
- cổng cảm biến ở **IO0, IO1** và **IO4, IO5**,
- hai dây I2C (để não nói chuyện với mạch công suất và màn hình) ở **IO8** và **IO9**.

Bước này không chấm, em đọc xong thì bấm **Tiếp**.

## Thử thách: đèn mờ

Đổi số trong **đặt đèn L1 độ sáng 100%** thành **50%** rồi giữ nút: đèn chỉ sáng một nửa.

Mạch công suất chia độ sáng thành **4096 bậc**. 50% là khoảng bậc 2048. Nó bật tắt đèn thật nhanh, bật một nửa thời gian, nên mắt thấy đèn mờ. Bước này không chấm.

## Xong rồi!

Em vừa làm một vòng **đầu vào → não → đầu ra**: nút báo tin, não quyết định, đèn làm theo. Đèn pin, chuông cửa, nút thang máy đều chạy theo đúng vòng này.

Nghĩ thêm: muốn **bấm một lần sáng, bấm lần nữa tắt** như công tắc đèn phòng thì não phải **nhớ** đèn đang bật hay tắt. Đó là việc của **biến**: một cái hộp có tên để não nhớ một con số.

Bài sau em sẽ viết chữ lên màn hình.
