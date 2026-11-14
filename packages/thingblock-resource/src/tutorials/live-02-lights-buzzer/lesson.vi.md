---
id: live-02-lights-buzzer
name: ThingBot Live 2: Đèn và còi báo động
group: thingbot-live
order: 2
board: none
extensions: thingbotTelemetrix
duration: 15
---

## Nhiệm vụ: còi báo động

Xe cứu thương, xe cứu hỏa vừa **nháy đèn** vừa **hú còi** để mọi người tránh đường. Đèn cho mắt thấy, còi cho tai nghe.

Nhiệm vụ của em: biến ThingBot thành xe cứu thương. Hai đèn L1, L2 thay nhau sáng, còi kêu theo nhịp.

Trước khi làm, kết nối ThingBot như bài 1: bật robot, bấm **Kết nối ThingBot**, chọn robot.

Bấm **Tiếp** để bắt đầu.

## Hai đèn thay nhau

Dưới khối **Khi bấm vào** 🏁, đặt khối **liên tục**, bên trong xếp:

1. **đèn LED 1 bật** và **đèn LED 2 tắt**
2. **đợi 0.5 giây**
3. **đèn LED 1 tắt** và **đèn LED 2 bật**
4. **đợi 0.5 giây**

Bấm **Chạy**. Hai đèn thay phiên nhau sáng.

> hint: Ô **LED 1** là một danh sách: bấm vào để đổi thành **LED 2**. Ô **bật** cũng vậy, đổi được thành **tắt**.

## Đoán trước: còi kêu cao hay thấp?

Khối **còi tần số** nhận một số từ **1 đến 100**. Số **0** là tắt còi.

**Đoán trước:** **còi tần số 80** kêu thế nào so với **còi tần số 20**?

- Cao hơn, như tiếng chim
- Trầm hơn, như tiếng trống
- Giống hệt nhau

> hint: Đáp án: **cao hơn**. Tần số là số lần màng loa rung mỗi giây. Rung càng nhanh, tiếng càng cao.

Thêm **còi tần số 80** ngay trước khối **đợi** thứ nhất. Thêm **còi tần số 20** trước khối **đợi** thứ hai. Bấm **Chạy** để nghe.

## Bíp ngắn

Còi kêu suốt nghe hơi mệt tai. Làm tiếng **bíp** ngắn: bật còi, đợi một chút, tắt còi.

Ở mỗi nửa vòng, xếp:

1. **còi tần số 60**
2. **đợi 0.1 giây**
3. **còi tần số 0**
4. **đợi 0.4 giây**

Tổng mỗi nửa vòng vẫn là 0,5 giây, nên đèn vẫn đổi đều như trước.

> hint: Ví dụ mẫu ở **Tập tin → Ví dụ… → ThingBot Live → Hai đèn thay nhau và tiếng bíp**.

## Hiểu sâu: đầu ra

Đèn và còi đều là **đầu ra**: não ra lệnh, chúng làm theo, không báo gì ngược lại.

Ở chế độ Live, não là chương trình trên máy tính. Mỗi khối gửi một tin nhắn: "đèn 1 bật", "còi 60". Robot chỉ việc làm theo.

Bấm **Dừng** là còi tắt ngay. Bài sau: cho robot chạy bánh xe.
