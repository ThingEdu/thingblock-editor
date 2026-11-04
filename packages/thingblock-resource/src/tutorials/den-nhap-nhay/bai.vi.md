---
ma: den-nhap-nhay
ten: Đèn nhấp nháy
nhom: dau-ra
thu-tu: 2
bo: thingbot
thoi-luong: 10
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

> gợi ý: Khối **đợi** nằm trong nhóm **Điều khiển** màu vàng.
> gợi ý: Khối **vòng lặp Arduino** tự lặp lại mãi, em không cần thêm khối lặp.

kiểm: L1 nhấp nháy, chu kỳ 1 giây ± 20%

## Chớp nhanh gấp đôi

Đổi cả hai ô **đợi** thành **0.25**. Đèn sẽ chớp nhanh gấp đôi: mỗi lần chớp chỉ còn nửa giây.

kiểm: L1 nhấp nháy, chu kỳ 0,5 giây ± 20%

## Xong rồi!

Em đã làm chủ nhịp của đèn. Thử tự đổi sang đèn **L2** xem sao.
