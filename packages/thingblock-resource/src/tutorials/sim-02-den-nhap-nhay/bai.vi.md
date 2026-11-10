---
ma: sim-02-den-nhap-nhay
ten: ThingBot Sim 2: Đèn nhấp nháy
nhom: dau-ra
thu-tu: 4
bo: thingbot
thoi-luong: 15
---

## Nhiệm vụ: đèn báo hiệu

Đèn **xi nhan** xe máy, đèn **hải đăng**, đèn báo **pin sắp hết**… đều **chớp** chứ không sáng mãi. Vì sao? Vì mắt người dễ để ý thứ đang thay đổi.

Nhiệm vụ của em: biến **đèn L1** thành đèn báo hiệu. Sáng nửa giây, tắt nửa giây, mãi mãi.

Giống cơ thể người: đèn là cách robot **nháy mắt ra hiệu**. Não ra lệnh. **Mạch công suất**, như dây thần kinh tới mí mắt, biến lệnh thành dòng điện làm đèn sáng.

**Đoán trước:** em xếp chỉ hai khối "bật đèn" rồi "tắt đèn", **không có** khối đợi. Em sẽ thấy gì?

- Đèn chớp rõ ràng, dễ nhìn
- Đèn trông như sáng mờ liên tục
- Đèn tắt hẳn

> gợi ý: Đáp án: **đèn trông như sáng mờ liên tục**. Não chạy mỗi vòng chỉ mất vài phần triệu giây, nhanh hơn mắt em rất nhiều. Khối đợi là cách "làm chậm" não cho vừa mắt người.

Bấm sang bước sau để bắt đầu.

## Bật rồi tắt

Giữ khối **khi Arduino khởi động** với **khởi động ThingBot** như bài trước. Kéo thêm khối **vòng lặp Arduino** (nhóm **Sự kiện**). Bên trong nó, xếp lần lượt:

- **đặt đèn L1 độ sáng 100%** (bật)
- **đợi 0.5 giây** (giữ cho mắt kịp thấy)
- **đặt đèn L1 độ sáng 0%** (tắt)
- **đợi 0.5 giây**

**Khi Arduino khởi động** chạy một lần lúc bật máy. **Vòng lặp Arduino** thì khác: chạy các khối từ trên xuống, hết thì quay lại đầu, mãi mãi.

Bấm **Chạy** và chờ vài giây cho mô phỏng đếm đủ ba lần chớp.

> gợi ý: Khối **đợi … giây** nằm trong nhóm **Điều khiển**.
> gợi ý: Khối **vòng lặp Arduino** tự lặp mãi, em không cần thêm khối lặp nào.
> gợi ý: Đèn sáng mãi không tắt? Có thể các khối đang nằm trong **khi Arduino khởi động**, chỉ chạy một lần. Chuyển chúng sang **vòng lặp Arduino**.

kiểm: L1 nhấp nháy, chu kỳ 1 giây ± 20%

## Hiểu sâu: 0 và 100 là gì?

Mỗi lần chớp gồm nửa giây sáng và nửa giây tắt, tổng cộng **1 giây**. Thời gian của một lần chớp gọi là **chu kỳ**.

Đèn là một **đầu ra**: não ra lệnh cho đèn, đèn không báo gì về cho não.

Số trong khối là **độ sáng phần trăm**: **0** là tắt, **100** là sáng hết. Ở mức điện, đèn chỉ có hai trạng thái:

- **không có điện**, người ta viết là **0**,
- **có điện**, người ta viết là **1**.

0 và 1 ở đây không phải số đếm. Chúng là **tắt / bật**, giống công tắc.

Còn 50% thì sao? Mạch công suất bật tắt đèn **cực nhanh**: bật một nửa thời gian, tắt một nửa. Mắt em không kịp thấy, chỉ thấy đèn mờ.

Vì sao chọn "đèn L1"? Mỗi đèn được **hàn sẵn** vào một chỗ trên mạch công suất khi làm mạch. Khối **đặt đèn** đã biết đèn L1 nằm ở đâu, nên em chỉ cần chọn đèn **1** hay **2**.

Bước này không chấm, em đọc xong thì sang bước sau.

## Chớp nhanh gấp đôi

**Đoán trước:** đổi **cả hai** ô **đợi** từ 0.5 thành 0.25. Đèn sẽ…

- Chớp nhanh gấp đôi
- Chớp chậm gấp đôi
- Sáng mờ hơn

> gợi ý: Đáp án: **chớp nhanh gấp đôi**. Một lần chớp giờ mất 0,25 + 0,25 = 0,5 giây thay vì 1 giây. Độ sáng do số 100 quyết định; khối đợi chỉ đổi nhịp.

Giờ đổi thật và bấm **Chạy**. Chu kỳ chỉ còn nửa giây.

kiểm: L1 nhấp nháy, chu kỳ 0,5 giây ± 20%

## Thử thách: đèn L2

Đổi cả hai khối **đặt đèn** sang đèn **2** và đặt lại hai ô **đợi** là **0.5**. Giờ đèn L2 nhấp nháy với chu kỳ 1 giây.

> gợi ý: Bấm mũi tên ▾ trong khối **đặt đèn** để chọn đèn **2**.
> gợi ý: Khó hơn, không chấm: cho L1 và L2 **thay nhau** chớp như đèn xe cứu hoả. Lúc L1 bật thì L2 tắt.

kiểm: L2 nhấp nháy, chu kỳ 1 giây ± 20%

## Xong rồi!

Em vừa làm đúng việc của **mạch đèn xi nhan**: một đầu ra, bật tắt theo nhịp em chọn.

Nhưng đèn này chạy một mình, không nghe ai. Bài sau em cho robot **nghe lời người** qua một nút bấm.
