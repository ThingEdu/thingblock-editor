---
ma: cam-03-dau-em-dieu-khien
ten: Camera AI 3: Đầu em điều khiển trò chơi
nhom: camera-ai
thu-tu: 3
bo: khong
mo-rong: cameraAi
thoi-luong: 20
---

## Chào em!

Hôm nay đầu em điều khiển trò chơi. Đây cũng là một **bài tập cổ**.

Ở bài trước, AI tìm 21 điểm trên bàn tay. Bài này dùng một AI khác tên là **Pose** (tư thế). Pose tìm **33 điểm** trên người em: mũi, mắt, tai, vai, khuỷu tay, cổ tay, hông, đầu gối… Giống thầy dạy thể dục nhìn em tập, máy biết đầu em ở đâu và đang nghiêng thế nào.

Làm chậm thôi. Thấy chóng mặt, mỏi hay đau cổ thì dừng lại, ngồi nghỉ.

Máy không có webcam? Ở khung Sân chơi, chọn **Chuột (không cần webcam)**. Đầu đi theo con chuột. Giữ phím ← hoặc → để nghiêng đầu dần, phím ↑ để đầu thẳng lại, phím ↓ để gật đầu.

## Ngôi sao trên đầu

1. Kéo khối **Khi bấm vào** 🏁 (nhóm **Sự kiện**) ra vùng lập trình, thêm **bật camera soi gương**.
2. Thêm **tạo ngôi sao tên sao tại x: 0 y: 0 cỡ 40**.
3. Thêm **liên tục**, bên trong là **đưa sao tới x: (x của đầu) y: (y của đầu)**.

Bấm nút **Chạy**, đứng (hoặc ngồi) cho camera thấy mặt và vai. Ngôi sao sẽ nằm trên mũi em.

> gợi ý: Lần đầu dùng khối đầu, máy phải nạp thêm mô hình Pose, nên có thể chờ vài giây.
> gợi ý: Khối **x của đầu** và **y của đầu** nằm trong nhóm **Camera AI**, phần "đầu và thân".

kiểm: thấy đầu
kiểm: "sao" chạm đầu

## Nghiêng đầu gọi tên

1. Kéo khối mũ **khi nghiêng đầu sang trái** ra chỗ trống.
2. Đặt **nói Trái** vào dưới nó.
3. Bấm **Chạy**, rồi nghiêng đầu thật chậm sang trái, tai hướng xuống vai. Giữ 2 giây rồi về giữa.

> gợi ý: "Trái" là bên trái trên sân chơi. Khi camera soi gương, đó cũng là bên trái của em.
> gợi ý: Chơi bằng chuột: để con trỏ trên sân chơi rồi giữ phím ←.

kiểm: đầu nghiêng trái
kiểm: sân chơi nói "Trái"

## Đoán trước: khối mũ chạy mấy lần?

Đoán trước rồi mới thử: em nghiêng đầu sang trái rồi **giữ yên** 5 giây. Khối mũ **khi nghiêng đầu sang trái** chạy mấy lần?

> gợi ý: Đáp án: chỉ một lần, lúc em vừa bắt đầu nghiêng. Muốn nó chạy lại, em phải về giữa rồi nghiêng lần nữa. Nhờ vậy mỗi động tác chỉ được đếm một lần.

## Gật đầu

Thêm khối mũ **khi gật đầu**, dưới nó là **nói Gật**. Bấm **Chạy**, rồi cúi đầu chậm cho cằm gần ngực và ngẩng lên.

> gợi ý: Máy so mũi với hai vai: mũi đi xuống gần vai rồi lên lại là một lần gật.
> gợi ý: Chơi bằng chuột: bấm phím ↓ một lần.

kiểm: gật đầu
kiểm: sân chơi nói "Gật"

## Hiểu sâu: máy đo độ nghiêng thế nào?

Máy nối hai mắt em bằng một đường thẳng. Đầu thẳng thì đường đó nằm ngang. Đầu nghiêng thì đường đó nghiêng theo.

Khối **góc nghiêng đầu** cho biết đường đó nghiêng bao nhiêu độ: số **âm** là nghiêng trái, số **dương** là nghiêng phải. Từ 15 độ trở lên máy mới tính là "đang nghiêng", để đầu hơi lệch một chút không bị đếm.

Máy chỉ đoán từ ảnh. Tóc che mắt, phòng tối hay quay mặt đi thì nó có thể đoán sai.

> gợi ý: Thử thách: thay **đưa sao tới** bằng **đưa sao tới x: (góc nghiêng đầu × 7) y: 100**. Ngôi sao chạy theo độ nghiêng, như trò "Thể dục cổ: nghiêng đầu hứng sao".

## Xong rồi!

Em đã dùng AI Pose để biết đầu em ở đâu, nghiêng sang đâu và khi nào em gật. Mở **Tập tin → Ví dụ → Camera AI** để tập tiếp với "Thể dục cổ", "Gật đầu đếm nhịp" và "Ngồi xuống né bóng".
