---
ma: sim-06-mat-hong-ngoai
ten: ThingBot Sim 6: Mắt hồng ngoại
nhom: dau-vao
thu-tu: 3
bo: thingbot
thoi-luong: 20
thiet-bi: cobot, oled
---

## Nhiệm vụ: mắt nhận bóng FanRoc

Ở sân **FanRoc**, robot phải biết quả bóng trước mặt là quả nào để nhặt đúng. Người nhìn bằng mắt. Hôm nay robot của em có một **mắt hồng ngoại**, cùng loại với bốn mắt dưới gầm xe **Cobot**.

Mắt hồng ngoại giống em **rọi đèn pin vào đồ vật trong phòng tối**. Đồ màu sáng hắt ánh sáng lại nhiều. Đồ màu tối "nuốt" ánh sáng. Mắt có một bóng đèn hồng ngoại (người không nhìn thấy) và một "con ngươi" đo xem ánh sáng hắt lại nhiều hay ít.

Nhiệm vụ: làm **đèn báo bóng tối màu**. Bóng tối màu thì đèn L1 sáng, bóng sáng màu thì đèn tắt. Em chọn quả bóng ở thanh **Bóng** dưới mạch ảo.

**Đoán trước:** đặt quả bóng trắng, rồi quả bóng đen trước mắt. Quả nào cho số lớn hơn?

- Bóng trắng
- Bóng đen
- Bằng nhau

> gợi ý: Đáp án: **bóng trắng**. Màu trắng hắt lại gần hết ánh sáng, "con ngươi" nhận nhiều nên số lớn (khoảng 3500). Màu đen nuốt gần hết, số nhỏ (khoảng 300). Nhớ chiếc áo đen phơi nắng: nó nóng vì nuốt ánh sáng.

Mở bài này là nhóm khối **Cobot IR** đã có sẵn trong bảng khối.

Bấm **Tiếp** để bắt đầu.

## Đèn báo bóng tối màu

Trong **vòng lặp Arduino** (phần chạy đi chạy lại mãi):

1. Kéo khối **nếu … thì … nếu không thì** (nhóm **Điều khiển**).
2. Đặt khối **… < …** (nhóm **Các phép toán**) vào ô lục giác, gõ **1500** vào ô bên phải.
3. Đặt khối **đọc mắt hồng ngoại 1 · IO4** (nhóm **Cobot IR**) vào ô bên trái của dấu **<**.
4. Chỗ **thì** đặt **đặt đèn L1 độ sáng 100%**, chỗ **nếu không thì** đặt **đặt đèn L1 độ sáng 0%**.
5. Thêm **đợi 0.05 giây** dưới khối **nếu**.

Vì sao chọn **1 · IO4**? Mắt có ba chân:

- chân **OUT** (tín hiệu) nối vào **IO4**: mắt báo "hắt lại bao nhiêu". Đây là **đầu vào** (báo tin cho não).
- chân **VCC** và **GND**: cấp điện cho bóng đèn và "con ngươi".

Mắt cắm ở **cổng cảm biến**, chân tín hiệu của cổng hàn sẵn tới **IO4**. IO4 là chân **đọc được số**: không chỉ 0 hay 1 như nút SW, mà mọi số từ 0 tới 4095. Trên xe Cobot, mắt số 1 cũng nằm ở IO4, nên khối ghi "1 · IO4".

Bấm **Chạy**, rồi chọn quả bóng **đen** hoặc **xanh dương**. Đèn L1 phải sáng.

> gợi ý: Mắt hồng ngoại cắm ở IO4: trong khối **đọc mắt hồng ngoại** chọn **1 · IO4**.
> gợi ý: Dấu **<** nghĩa là "nhỏ hơn": số đọc nhỏ hơn 1500 là bóng tối màu.

kiểm: chọn bóng tối màu
kiểm: đọc mắt hồng ngoại IO4
kiểm: L1 sáng

## Bóng sáng màu

Giờ chọn quả **trắng**, **vàng** hoặc **đỏ**. Đèn L1 phải **tắt**.

**Ngưỡng** biến con số thành có hoặc không. Mắt đưa ra **một con số**, còn đèn chỉ cần biết **có hay không**. Não **so** con số với ngưỡng 1500: nhỏ hơn là "tối", còn lại là "sáng". Giống em nheo mắt nhìn và tự nhủ "tối hơn mức này thì là bóng đen". Số đọc của từng quả:

- bóng trắng: khoảng 3500, sáng;
- bóng vàng: khoảng 3100, sáng;
- bóng đỏ: khoảng 2300, sáng;
- bóng xanh dương: khoảng 1100, tối;
- bóng đen: khoảng 300, tối.

Trên robot thật, số đọc còn đổi theo khoảng cách và đèn trong phòng. Em đặt từng quả, xem số, rồi tự chọn ngưỡng nằm giữa hai nhóm.

> gợi ý: Bóng sáng màu mà đèn vẫn sáng: dùng **nếu … thì … nếu không thì** và đặt **đặt đèn L1 độ sáng 0%** vào chỗ **nếu không thì**.

kiểm: chọn bóng sáng màu
kiểm: đọc mắt hồng ngoại IO4
kiểm: L1 tắt

## Hiểu sâu: mắt hồng ngoại không thấy màu

Với mắt người, đỏ và vàng khác hẳn nhau. Mắt hồng ngoại chỉ thấy **hắt lại nhiều hay ít**, nên hai quả này cho số gần nhau.

**Đoán trước:** robot chỉ có mắt hồng ngoại. Nó có biết chắc "đây là bóng đỏ" không?

- Có
- Không

> gợi ý: Đáp án: **không**. Bóng đỏ và bóng vàng đều hắt nhiều, số gần nhau. Muốn biết màu thì cần **cảm biến màu**: nó có ba "con ngươi" đỏ, lục, lam, giống ba loại tế bào nhìn màu trong mắt người. Xe Cobot có một cảm biến màu như vậy, nối qua hai dây I2C như màn OLED ở bài 4.

## Thử thách: hiện số đọc

Cho màn OLED **hiện số đọc**. Trong **khi Arduino khởi động** thêm **khởi động OLED**. Trong vòng lặp thêm **xoá OLED**, **OLED in** (đặt khối **đọc mắt hồng ngoại 1 · IO4** vào ô chữ), rồi **hiện lên màn OLED**.

Đổi bóng: số trên màn hình phải đổi theo. Ghi số của từng quả vào vở. Kỹ sư chọn ngưỡng đúng bằng cách này. Bước này không chấm.

## Xong rồi!

Robot của em đã **tự nhìn** và phân biệt bóng sáng, bóng tối, như robot FanRoc chọn bóng hay máy lựa cà phê loại hạt đen: **mắt báo tin → não so với ngưỡng → đèn làm theo**.

Bài sau em cho robot **chuyển động**. Bài 10 sẽ ghép mắt này với băng chuyền và servo để làm **dây chuyền phân loại trứng**.
