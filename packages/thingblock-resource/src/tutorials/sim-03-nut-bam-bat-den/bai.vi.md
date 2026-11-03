---
ma: sim-03-nut-bam-bat-den
ten: ThingBot Sim 3: Nút bấm điều khiển đèn
nhom: dau-vao
thu-tu: 1
bo: thingbot
thoi-luong: 15
---

## Chào em!

Trên mạch ThingBot có **nút SW**. Hôm nay em làm cho **đèn L1 sáng khi giữ nút, tắt khi nhả nút**.

Bấm sang bước sau để bắt đầu.

## Ghép khối

1. Giữ **khi Arduino khởi động** với **khởi động ThingBot**.
2. Trong **vòng lặp Arduino**, kéo khối **nếu … thì … nếu không thì** (nhóm **Điều khiển**).
3. Đặt khối **đọc nút SW** (nhóm **ThingBot**) vào ô hình lục giác.
4. Đặt **đặt đèn L1 độ sáng 100%** vào chỗ **thì**, và **đặt đèn L1 độ sáng 0%** vào chỗ **nếu không thì**.

Bấm **Chạy**. Bước này không chấm, ghép xong em sang bước sau.

## Giữ nút SW

Giữ chuột trên nút **SW (giữ)** ở khung Mô phỏng. Đèn L1 phải sáng trong lúc em giữ.

> gợi ý: Đèn không sáng? Khối **đặt đèn L1 độ sáng 100%** phải nằm ở chỗ **thì**, ngay dưới ô lục giác.
> gợi ý: Não hỏi nút liên tục vì khối **nếu** nằm trong **vòng lặp Arduino**.

kiểm: giữ nút SW
kiểm: L1 sáng

## Nhả nút

Thả nút ra. Đèn L1 phải **tắt**.

> gợi ý: Nhả nút mà đèn vẫn sáng? Đặt **đặt đèn L1 độ sáng 0%** vào chỗ **nếu không thì**.

kiểm: nhả nút SW
kiểm: L1 tắt

## Thử thách: sáng một nửa

Đổi số trong **đặt đèn L1 độ sáng 100%** thành **50%** rồi giữ nút: đèn chỉ sáng một nửa. Bước này không chấm.

## Xong rồi!

Em đã cho não đọc nút bấm và ra lệnh bật tắt đèn. Bài sau em sẽ viết chữ lên màn hình.
