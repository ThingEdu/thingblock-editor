---
ma: sim-06-cam-bien-khoang-cach
ten: ThingBot Sim 6: Cảm biến khoảng cách
nhom: dau-vao
thu-tu: 3
bo: thingbot
thoi-luong: 20
thiet-bi: ultrasonic
---

## Nhiệm vụ: cảm biến lùi xe

Ô tô lùi gần tường thì kêu **tít tít**. Con **dơi** bay trong đêm tối mà không đâm vào cây. Cả hai dùng chung một mẹo: **phát ra tiếng rồi nghe tiếng vang**.

Dơi kêu một tiếng rất cao, tiếng đập vào cây rồi dội lại tai nó. Tiếng vang về càng muộn thì cây càng xa.

**Cảm biến siêu âm** làm y như con dơi. Nó phát một tiếng "chíp" cao tới mức tai người không nghe được, rồi đo xem **bao lâu** tiếng vang quay về. Cảm biến là **đôi mắt** của robot, chỉ khác là nó "nhìn" bằng tai.

Nhiệm vụ: làm **đèn báo vật gần**. Vật cách cảm biến dưới 20 cm thì đèn L1 sáng, như cảm biến lùi xe.

**Đoán trước:** vật càng xa thì tiếng vang quay về…

- càng chậm,
- càng nhanh,
- như nhau.

> gợi ý: Đáp án: **càng chậm**. Tiếng phải đi xa hơn rồi mới quay lại. Âm thanh đi khoảng 343 mét mỗi giây, nên não đổi được thời gian thành khoảng cách.

Mở bài này là nhóm khối **Ultrasonic** đã có sẵn trong bảng khối.

## Đèn báo vật gần

Trong **vòng lặp Arduino** (phần chạy đi chạy lại mãi):

1. Kéo khối **nếu … thì … nếu không thì** (nhóm **Điều khiển**).
2. Đặt khối **… < …** (nhóm **Các phép toán**) vào ô lục giác, gõ **20** vào ô bên phải.
3. Đặt khối **cảm biến siêu âm chân TRIG 0 ECHO 4 đọc khoảng cách cm** (nhóm **Ultrasonic**) vào ô bên trái của dấu **<**.
4. Chỗ **thì** đặt **đặt đèn L1 độ sáng 100%**, chỗ **nếu không thì** đặt **đặt đèn L1 độ sáng 0%**.
5. Thêm **đợi 0.05 giây** dưới khối **nếu**, để cảm biến kịp nghe tiếng vang trước lần đo sau.

Vì sao gõ **0** và **4**? Cảm biến có hai chân để nói chuyện với não. Mỗi **chân** là một sợi dây nối từ não ra ngoài, có số riêng:

- chân **TRIG** nối vào **IO0**: não ra lệnh "phát tiếng đi". Đây là **đầu ra** (não ra lệnh).
- chân **ECHO** nối vào **IO4**: cảm biến báo về "đã nghe tiếng vang". Đây là **đầu vào** (báo tin cho não).

Cổng cảm biến của ThingBot được hàn sẵn tới IO0 và IO4, nên trong khối em gõ TRIG **0**, ECHO **4**.

Bấm **Chạy**, rồi kéo thanh **Vật cản cách cảm biến** xuống dưới **20** cm. Đèn L1 phải sáng.

> gợi ý: Cảm biến trên ThingBot cắm TRIG ở IO0 và ECHO ở IO4: hai ô số trong khối là **0** và **4**.
> gợi ý: Dấu **<** nghĩa là "nhỏ hơn": khoảng cách nhỏ hơn 20 là vật đang ở gần.

kiểm: khoảng cách < 20 cm
kiểm: L1 sáng

## Đưa vật ra xa

Kéo thanh **Vật cản cách cảm biến** lên trên **30** cm. Đèn L1 phải **tắt**.

**Đoán trước:** khối **nếu** nằm trong **vòng lặp Arduino**. Nếu em chuyển nó sang **khi Arduino khởi động** thì sao?

- Đèn vẫn đổi theo vật cản.
- Não chỉ đo đúng một lần lúc bật máy, sau đó đèn không đổi nữa.

> gợi ý: Đáp án: **não chỉ đo một lần**. **Khi Arduino khởi động** chạy một lần lúc bật máy. **Vòng lặp Arduino** chạy mãi, nên não đo lại liên tục và biết ngay khi vật dịch chuyển.

kiểm: khoảng cách ≥ 30 cm
kiểm: L1 tắt

## Hiểu sâu: từ con số tới có hay không

Nút SW ở bài 3 chỉ có hai trạng thái: bấm hoặc không. Cảm biến siêu âm thì đưa ra **một con số**: 7 cm, 30 cm, 150 cm…

Não **so sánh** con số đó với **ngưỡng** 20. Ngưỡng là con số mốc em tự chọn:

- khoảng cách nhỏ hơn 20: "gần", điều kiện **đúng**, đèn sáng;
- khoảng cách từ 20 trở lên: "xa", điều kiện **sai**, đèn tắt.

Mỗi việc cần một ngưỡng khác nhau. Cảm biến lùi xe ô tô báo khi còn cách tường một đoạn đủ để phanh. Cửa tự động ở siêu thị mở khi em còn cách cửa vài bước chân. Em chọn ngưỡng theo việc mình cần.

## Thử thách: hiện khoảng cách

Biến ThingBot thành **thước đo không chạm**: thêm màn hình OLED (**Thêm thiết bị** → **OLED**) và in khoảng cách đo được lên màn hình. Kéo thanh **Vật cản cách cảm biến**, số trên màn hình phải đổi theo. Bước này không chấm.

## Xong rồi!

Robot của em đã **tự thấy** vật ở gần và tự quyết định bật đèn, đúng như cảm biến lùi xe ô tô: **cảm biến báo tin → não so với ngưỡng → đèn làm theo**.

Bài sau em cho robot **chuyển động** bằng động cơ. Bài 10 sẽ ghép cảm biến này với bánh xe để xe tự né vật cản.
