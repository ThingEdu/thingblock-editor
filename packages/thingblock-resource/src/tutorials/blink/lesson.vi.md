---
id: blink
name: Đèn nhấp nháy
group: outputs
order: 2
board: thingbot
duration: 10
---

## Đèn biết chớp

Lần này đèn L1 sẽ sáng nửa giây, tắt nửa giây, rồi cứ thế lặp mãi. Em cần bốn việc nối nhau: bật, chờ, tắt, chờ, đặt trong khối **vòng lặp Arduino** để chúng lặp lại.

Bấm **Tiếp**.

## Bật rồi tắt

Kéo khối **vòng lặp Arduino** ra. Bên trong, xếp lần lượt:

- **đặt đèn L1 độ sáng 100%**
- **đợi 0.5 giây**
- **đặt đèn L1 độ sáng 0%**
- **đợi 0.5 giây**

Bấm **Chạy** và nhìn đèn L1 trên mạch ảo. Chờ vài giây để mô phỏng đếm được ít nhất ba lần chớp.

> hint: Khối **đợi** nằm trong nhóm **Điều khiển** màu vàng.
> hint: Khối **vòng lặp Arduino** tự lặp lại mãi, em không cần thêm khối lặp.

check: L1 blinks every 1 s ± 20%

## Chớp nhanh gấp đôi

Đổi cả hai ô **đợi** thành **0.25**. Đèn sẽ chớp nhanh gấp đôi: mỗi lần chớp chỉ còn nửa giây.

check: L1 blinks every 0.5 s ± 20%

## Xong rồi!

Em đã làm chủ nhịp của đèn. Thử tự đổi sang đèn **L2** xem sao.
