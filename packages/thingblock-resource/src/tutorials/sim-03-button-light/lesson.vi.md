---
id: sim-03-button-light
name: ThingBot Sim 3: Nút bấm điều khiển đèn
group: inputs
order: 1
board: thingbot
duration: 15
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

> hint: Đèn không sáng? Khối **đặt đèn L1 độ sáng 100%** phải nằm ở chỗ **thì**, ngay dưới ô lục giác.
> hint: Não hỏi nút liên tục vì khối **nếu** nằm trong **vòng lặp Arduino**.

check: hold SW
check: L1 on

## Nhả nút

Thả nút ra. Đèn L1 phải **tắt**.

> hint: Nhả nút mà đèn vẫn sáng? Đặt **đặt đèn L1 độ sáng 0%** vào chỗ **nếu không thì**.

check: release SW
check: L1 off

## Thử thách: sáng một nửa

Đổi số trong **đặt đèn L1 độ sáng 100%** thành **50%** rồi giữ nút: đèn chỉ sáng một nửa. Bước này không chấm.

## Xong rồi!

Em đã cho não đọc nút bấm và ra lệnh bật tắt đèn. Bài sau em sẽ viết chữ lên màn hình.
