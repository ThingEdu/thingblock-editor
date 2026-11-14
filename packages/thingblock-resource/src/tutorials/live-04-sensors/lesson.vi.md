---
id: live-04-sensors
name: ThingBot Live 4: Nút bấm và xe tránh vật cản
group: thingbot-live
order: 4
board: none
extensions: thingbotTelemetrix
duration: 20
---

## Nhiệm vụ: robot biết nghe và nhìn

Bài trước, robot chỉ làm theo lệnh. Robot thật còn phải **biết** chuyện gì đang xảy ra: có ai bấm nút không, phía trước có tường không.

Bộ phận báo tin cho não gọi là **cảm biến**, hay **đầu vào**. Hôm nay em dùng hai cảm biến:

- nút **SW** trên mạch ThingBot,
- **cảm biến siêu âm** đo khoảng cách.

Kết nối ThingBot qua Bluetooth như bài 1. Bấm **Tiếp** để bắt đầu.

## Nút SW làm chuông cửa

Nút **SW** nối vào **chân 3** của não. Muốn đọc nút, em báo cho robot theo dõi chân này.

Dưới **Khi bấm vào** 🏁:

1. **đặt chân 3 chế độ INPUT_PULLUP**
2. Khối **liên tục**, bên trong đặt khối **nếu … thì … nếu không thì**.
3. Ô điều kiện: khối **… = …** (nhóm **Các phép toán**), bên trái thả **đọc số chân 3**, bên phải gõ **0**.
4. Nhánh **thì**: **đèn LED 1 bật** và **còi tần số 20**. Nhánh **nếu không thì**: **đèn LED 1 tắt** và **còi tần số 0**.
5. Dưới khối **nếu**, vẫn trong **liên tục**: **đợi 0.05 giây**.

Bấm **Chạy** rồi bấm giữ nút SW trên robot.

> hint: Vì sao so với **0**? Khi chưa bấm, chân 3 đọc **1**. Bấm nút thì chân 3 nối đất, đọc **0**.
> hint: Robot gửi trạng thái nút về qua Bluetooth mất một chút thời gian, nên đèn sáng chậm hơn tay em khoảng một phần mười giây.

## Đoán trước: con dơi đo đường

Cảm biến siêu âm có hai "mắt": một cái phát tiếng kêu rất cao, cái kia nghe tiếng vọng về.

**Đoán trước:** vật ở **càng gần**, tiếng vọng về…

- Càng nhanh
- Càng chậm
- Không đổi

> hint: Đáp án: **càng nhanh**. Cảm biến đo thời gian đi và về rồi đổi ra **cm**. Con dơi cũng tìm đường trong bóng tối theo cách này.

## Xe tránh vật cản

Cắm cảm biến siêu âm: **TRIG** vào chân **0**, **ECHO** vào chân **4**. Làm chương trình mới:

1. Dưới **Khi bấm vào** 🏁: **khởi động siêu âm chân trig 0 echo 4**.
2. Khối **liên tục**, bên trong khối **nếu … thì … nếu không thì**.
3. Điều kiện: **khoảng cách siêu âm (cm) < 20**.
4. Nhánh **thì**: hai động cơ tốc độ **-50** (lùi), **đợi 0.4 giây**, rồi M1 **50** và M2 **-50** (xoay), **đợi 0.5 giây**.
5. Nhánh **nếu không thì**: hai động cơ tốc độ **60** (đi tới).
6. Cuối vòng **liên tục**: **đợi 0.1 giây**.

Đặt xe xuống sàn, bấm **Chạy**, rồi đưa tay chắn trước xe.

> hint: Xe cứ lùi mãi lúc mới chạy? Khi chưa đo xong, khoảng cách là **0**, mà 0 nhỏ hơn 20. Ví dụ mẫu dùng thêm điều kiện **khoảng cách > 0** ghép bằng khối **và**.
> hint: Ví dụ mẫu ở **Tập tin → Ví dụ… → ThingBot Live → Xe tránh vật cản**.

## Hiểu sâu: vòng cảm nhận, suy nghĩ, hành động

Mọi robot tự hành đều lặp mãi ba việc:

1. **Cảm nhận**: đọc cảm biến (nút, khoảng cách).
2. **Suy nghĩ**: khối **nếu** chọn việc cần làm.
3. **Hành động**: bật đèn, quay bánh.

Robot hút bụi, xe tự lái, cánh tay robot trong nhà máy đều chạy vòng này, chỉ nhanh hơn và có nhiều cảm biến hơn.

Bài sau: em lái xe bằng bàn tay, qua camera.
