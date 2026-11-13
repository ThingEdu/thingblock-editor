---
id: blink
name: Đèn nhấp nháy
group: outputs
order: 2
board: thingbot
duration: 12
---

## Nhiệm vụ: đèn vàng ngã tư

Nửa đêm, đèn giao thông ở ngã tư chuyển sang **vàng nhấp nháy** để nhắc xe đi chậm. Xe cứu thương, cột ăng-ten cao, đèn báo pin yếu cũng chớp như vậy, vì đèn chớp dễ gây chú ý hơn đèn sáng đứng yên.

Nhiệm vụ: làm đèn L1 chớp đều. Sáng nửa giây, tắt nửa giây, rồi cứ thế lặp mãi.

Em cần bốn việc nối nhau: **bật, chờ, tắt, chờ**. Bốn việc này đặt trong khối **vòng lặp Arduino**.

Khối **khi Arduino khởi động** chỉ chạy **một lần** lúc bật máy. Khối **vòng lặp Arduino** thì chạy xong lại **quay về đầu, chạy mãi mãi**, như tim em đập suốt ngày đêm.

Bấm **Tiếp**.

## Bật rồi tắt

Kéo khối **vòng lặp Arduino** ra. Bên trong, xếp lần lượt:

- **đặt đèn L1 độ sáng 100%**
- **đợi 0.5 giây**
- **đặt đèn L1 độ sáng 0%**
- **đợi 0.5 giây**

Khối **đợi** bảo não đứng yên một lúc rồi mới làm khối tiếp theo. 0.5 giây là nửa giây.

Đoán trước: nếu em bỏ khối **đợi** cuối cùng (sau khối tắt đèn) thì sao?

- Đèn vẫn chớp đều như cũ
- Đèn gần như sáng suốt

> hint: Đáp án: đèn gần như sáng suốt. Tắt đèn xong, vòng lặp quay về đầu và bật lại ngay, chỉ tắt trong một chớp mắt rất ngắn nên mắt em không thấy.

Bấm **Chạy** và nhìn đèn L1 trên mạch ảo. Chờ vài giây để mô phỏng đếm được ít nhất ba lần chớp.

> hint: Khối **đợi** nằm trong nhóm **Điều khiển** màu vàng.
> hint: Khối **vòng lặp Arduino** tự lặp lại mãi, em không cần thêm khối lặp.

check: L1 blinks every 1 s ± 20%

## Chớp nhanh gấp đôi

Một lần sáng cộng một lần tắt gọi là một **chu kỳ**. Lúc nãy chu kỳ dài 0.5 + 0.5 = 1 giây.

Đổi cả hai ô **đợi** thành **0.25**. Đèn sẽ chớp nhanh gấp đôi: mỗi chu kỳ chỉ còn nửa giây.

check: L1 blinks every 0,5 s ± 20%

## Hiểu sâu: chớp nhanh quá thì sao?

Thử đổi hai ô **đợi** thành **0.01**. Đèn chớp 50 lần mỗi giây, mắt em không theo kịp nữa, nên em thấy đèn **sáng mờ đứng yên**.

Đó chính là cách mạch công suất làm đèn sáng mờ ở bài trước: bật tắt thật nhanh, bật càng lâu thì càng sáng.

## Xong rồi!

Em đã làm chủ nhịp của đèn: **vòng lặp** để lặp mãi, **đợi** để giữ nhịp. Đèn xi nhan xe máy cũng chạy đúng như vậy.

Thử tự đổi sang đèn **L2**, hoặc cho L1 và L2 chớp xen kẽ như đèn báo chắn tàu.
