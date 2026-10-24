---
ma: den-nhap-nhay
ten: Đèn nhấp nháy
nhom: dau-ra
thu-tu: 2
bo: thingbot
thoi-luong: 10
---

## Đèn biết chớp

Lần này đèn L1 sẽ sáng nửa giây, tắt nửa giây, rồi cứ thế lặp mãi. Em cần bốn việc nối nhau: bật, chờ, tắt, chờ, và một khối làm cho chúng lặp lại.

Bấm **Tiếp**.

## Bật rồi tắt

Kéo khối **when Arduino loops** ra. Bên trong, xếp lần lượt:

- **set led L1 100**
- **wait 0.5 seconds**
- **set led L1 0**
- **wait 0.5 seconds**

Bấm **Run** và nhìn đèn L1 trên mạch ảo. Chờ vài giây để mô phỏng đếm được ít nhất ba lần chớp.

> gợi ý: Khối **wait** nằm trong nhóm **Control** màu vàng.
> gợi ý: Khối **when Arduino loops** tự lặp lại mãi, em không cần thêm khối lặp.

kiểm: L1 nhấp nháy, chu kỳ 1 giây ± 20%

## Chớp nhanh gấp đôi

Đổi cả hai ô **wait** thành **0.25**. Đèn sẽ chớp nhanh gấp đôi: mỗi lần chớp chỉ còn nửa giây.

kiểm: L1 nhấp nháy, chu kỳ 0,5 giây ± 20%

## Xong rồi!

Em đã làm chủ nhịp của đèn. Thử tự đổi sang đèn **L2** xem sao.
