---
ma: cam-01-lam-quen-camera-ai
ten: Camera AI 1: Tay em trên màn hình
nhom: camera-ai
thu-tu: 1
bo: khong
mo-rong: cameraAi
thoi-luong: 15
---

## Chào em!

Hôm nay em dạy máy tính nhìn thấy bàn tay em, rồi làm một cây đũa thần: ngôi sao bay theo ngón tay.

**AI** là chương trình máy tính đã học từ rất nhiều ảnh. Nhờ vậy nó đoán được bàn tay nằm ở đâu trong ảnh webcam.

Bài này không cần mạch. Các khối nằm ở nhóm **Camera AI**, kết quả hiện ở khung **Sân chơi** bên phải.

Máy không có webcam? Không sao. Ở khung Sân chơi, chọn **Chuột (không cần webcam)**. Ngón trỏ sẽ đi theo con chuột.

## Bật camera

1. Mở nhóm **Sự kiện**, kéo khối **Khi bấm vào lá cờ xanh** ra vùng lập trình.
2. Mở nhóm **Camera AI**, kéo khối **bật camera soi gương** vào dưới nó.
3. Bấm lá cờ xanh để chạy.

Trình duyệt sẽ hỏi có cho dùng camera không. Em bấm **Cho phép**.

> gợi ý: "Soi gương" là lật hình như khi em soi gương: em giơ tay phải, hình cũng giơ tay bên phải.
> gợi ý: Không có webcam thì chọn **Chuột (không cần webcam)** trong danh sách camera ở khung Sân chơi, rồi bấm lá cờ xanh lại.

kiểm: camera bật

## Đoán trước: AI thấy gì?

Đoán trước rồi mới thử nhé: khi em giơ tay trước camera, sân chơi sẽ vẽ **bao nhiêu chấm** lên bàn tay em?

Giờ em giơ tay lên (hoặc di chuột trên sân chơi) để xem.

> gợi ý: Đáp án: 21 chấm, nối với nhau bằng đường màu tím. Đó là 21 **điểm mốc bàn tay**: cổ tay, các khớp ngón và năm đầu ngón. Chấm có vòng vàng là đầu ngón trỏ.

kiểm: thấy bàn tay

## Ngôi sao theo ngón trỏ

Giờ làm cây đũa thần. Thêm vào dưới **bật camera soi gương**:

1. **tạo ngôi sao tên sao tại x: 0 y: 0 cỡ 50**
2. Khối **liên tục** (nhóm **Điều khiển**), bên trong đặt **đưa sao tới x: … y: …**.
3. Thả khối **x của ngón trỏ tay bất kỳ** vào ô x, khối **y của ngón trỏ tay bất kỳ** vào ô y.

Bấm lá cờ xanh, rồi đưa ngón trỏ đi khắp sân chơi.

> gợi ý: Sân chơi là một tấm bản đồ: x từ -240 (trái) đến 240 (phải), y từ -180 (dưới) đến 180 (trên). Khối **x của ngón trỏ** cho biết ngón trỏ đang ở cột nào.
> gợi ý: Tên trong khối **đưa … tới** phải giống hệt tên lúc tạo: **sao**.

kiểm: sân chơi có "sao"
kiểm: "sao" chạm ngón trỏ

## Gọi tên cử chỉ

**Cử chỉ** là dáng bàn tay: nắm tay, xoè tay, chữ V… AI nhìn 21 điểm mốc để đoán em đang làm cử chỉ nào.

1. Kéo khối **khi tay bất kỳ làm cử chỉ nắm tay** ra chỗ trống.
2. Đặt khối **nói Nắm tay** vào dưới nó.
3. Bấm lá cờ xanh, rồi nắm tay lại.

> gợi ý: Chơi bằng chuột thì giữ chuột trái là nắm tay. Bấm chuột phải hoặc phím 1–7 để đổi sang cử chỉ khác.
> gợi ý: Khối này là khối mũ: nó tự chạy mỗi lần bàn tay vừa đổi sang nắm tay, em không cần lặp.

kiểm: tay nắm
kiểm: sân chơi nói "Nắm tay"

## Hiểu sâu: vì sao cần "liên tục"?

Webcam chụp khoảng 30 tấm ảnh mỗi giây. Với mỗi tấm, AI tìm lại bàn tay từ đầu.

Khối **đưa sao tới** chỉ đưa ngôi sao đi **một lần**. Để ngôi sao bám theo tay, chương trình phải hỏi "ngón trỏ ở đâu?" lại mãi, nên mới cần **liên tục**.

Thử bỏ ngôi sao ra khỏi **liên tục** rồi chạy: ngôi sao chỉ nhảy một lần rồi đứng yên.

AI cũng có lúc đoán sai: tay khuất, phòng tối, hay hai tay chồng lên nhau. Khi đó các chấm nhảy lung tung. Máy không "hiểu" bàn tay như em, nó chỉ đoán từ những ảnh đã học.

> gợi ý: Thêm hai khối mũ nữa: **xoè tay** thì nói "Xoè tay", **chữ V** thì nói "Chữ V".

## Xong rồi!

Em đã bật camera, thấy 21 điểm mốc bàn tay, làm ngôi sao đi theo ngón trỏ và gọi tên cử chỉ. Bài sau em làm trò **Bắt Dế** có tính điểm.
