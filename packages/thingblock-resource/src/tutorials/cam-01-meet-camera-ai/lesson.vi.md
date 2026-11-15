---
id: cam-01-meet-camera-ai
name: Camera AI 1: Tay em trên màn hình
group: camera-ai
order: 1
board: none
extensions: cameraAi
duration: 15
---

## Chào em!

Hôm nay em dạy máy tính nhìn thấy bàn tay em, rồi làm một cây đũa thần: ngôi sao bay theo ngón tay.

**AI** là chương trình máy tính đã học từ rất nhiều ảnh. Nhờ vậy nó đoán được bàn tay nằm ở đâu trong ảnh webcam.

Bài này không cần mạch. Các khối nằm ở nhóm **Camera AI**, kết quả hiện ở khung **Sân chơi** bên phải.

Máy không có webcam? Không sao. Ở khung Sân chơi, chọn **Chuột (không cần webcam)**. Ngón trỏ sẽ đi theo con chuột.

Bấm **Tiếp** để bắt đầu.

## Bật camera

1. Mở nhóm **Sự kiện**, kéo khối **Khi bấm vào** 🏁 (lá cờ xanh) ra vùng lập trình.
2. Mở nhóm **Camera AI**, kéo khối **bật camera soi gương** vào dưới nó.
3. Bấm nút **Chạy** ở phía trên khung Sân chơi.

Trình duyệt sẽ hỏi có cho dùng camera không. Em bấm **Cho phép**.

> hint: "Soi gương" là lật hình như khi em soi gương: em giơ tay phải, hình cũng giơ tay bên phải.
> hint: Không có webcam thì chọn **Chuột (không cần webcam)** trong danh sách camera ở khung Sân chơi, rồi bấm **Chạy** lại.

check: camera on

## Đoán trước: AI thấy gì?

Đoán trước rồi mới thử nhé: khi em giơ tay trước camera, sân chơi sẽ vẽ **bao nhiêu chấm** lên bàn tay em?

Giờ em giơ tay lên (hoặc di chuột trên sân chơi) để xem.

> hint: Đáp án: 21 chấm, nối với nhau bằng đường màu tím. Đó là 21 **điểm mốc bàn tay**: cổ tay, các khớp ngón và năm đầu ngón. Chấm có vòng vàng là đầu ngón trỏ.

check: hand seen

## Ngôi sao theo ngón trỏ

Giờ làm cây đũa thần. Thêm vào dưới **bật camera soi gương**:

1. **tạo ngôi sao tên sao tại x: 0 y: 0 cỡ 50**
2. Khối **liên tục** (nhóm **Điều khiển**), bên trong đặt **đưa sao tới x: … y: …**.
3. Thả khối **x của ngón trỏ tay bất kỳ** vào ô x, khối **y của ngón trỏ tay bất kỳ** vào ô y.

Bấm **Chạy**, rồi đưa ngón trỏ đi khắp sân chơi.

> hint: Sân chơi là một tấm bản đồ: x từ -240 (trái) đến 240 (phải), y từ -180 (dưới) đến 180 (trên). Khối **x của ngón trỏ** cho biết ngón trỏ đang ở cột nào.
> hint: Tên trong khối **đưa … tới** phải giống hệt tên lúc tạo: **sao**.

check: playground has "sao"
check: "sao" touches index finger

## Gọi tên cử chỉ

**Cử chỉ** là dáng bàn tay: nắm tay, xoè tay, chữ V… AI nhìn 21 điểm mốc để đoán em đang làm cử chỉ nào.

1. Kéo khối **khi tay bất kỳ làm cử chỉ nắm tay** ra chỗ trống.
2. Đặt khối **nói Nắm tay** vào dưới nó.
3. Bấm **Chạy**, rồi nắm tay lại.

> hint: Chơi bằng chuột thì giữ chuột trái là nắm tay. Bấm chuột phải hoặc phím 1–7 để đổi sang cử chỉ khác.
> hint: Khối này là khối mũ: nó tự chạy mỗi lần bàn tay vừa đổi sang nắm tay, em không cần lặp.

check: hand fist
check: playground says "Nắm tay"

## Hiểu sâu: vì sao cần "liên tục"?

Webcam chụp khoảng 30 tấm ảnh mỗi giây. Với mỗi tấm, AI tìm lại bàn tay từ đầu.

Khối **đưa sao tới** chỉ đưa ngôi sao đi **một lần**. Để ngôi sao bám theo tay, chương trình phải hỏi "ngón trỏ ở đâu?" lại mãi, nên mới cần **liên tục**.

Thử bỏ ngôi sao ra khỏi **liên tục** rồi chạy: ngôi sao chỉ nhảy một lần rồi đứng yên.

AI cũng có lúc đoán sai: tay khuất, phòng tối, hay hai tay chồng lên nhau. Khi đó các chấm nhảy lung tung. Máy không "hiểu" bàn tay như em, nó chỉ đoán từ những ảnh đã học.

> hint: Thêm hai khối mũ nữa: **xoè tay** thì nói "Xoè tay", **chữ V** thì nói "Chữ V".

## Xong rồi!

Em đã bật camera, thấy 21 điểm mốc bàn tay, làm ngôi sao đi theo ngón trỏ và gọi tên cử chỉ. Bài sau em làm trò **Bắt Dế** có tính điểm.
