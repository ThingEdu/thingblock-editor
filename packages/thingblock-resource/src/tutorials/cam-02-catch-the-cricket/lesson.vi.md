---
id: cam-02-catch-the-cricket
name: Camera AI 2: Trò Bắt Dế
group: camera-ai
order: 2
board: none
extensions: cameraAi
duration: 20
---

## Chào em!

Con dế nhảy khắp sân chơi. Em dùng ngón trỏ bắt nó, mỗi lần bắt được thì ghi 1 điểm.

Em sẽ dùng lại những gì đã học ở bài 1: bật camera, cho một vật đi theo ngón trỏ. Thêm hai ý mới: **điều kiện** (nếu … thì) và **điểm**.

Máy không có webcam? Ở khung Sân chơi, chọn **Chuột (không cần webcam)**.

Bấm **Tiếp** để bắt đầu.

## Quả bóng và con dế

Dưới **Khi bấm vào** 🏁 và **bật camera soi gương**, thêm:

1. **tạo bóng tên bong tại x: 0 y: 0 cỡ 44**
2. **tạo dế tên de tại x: 120 y: 60 cỡ 70**
3. **liên tục** chứa **đưa bong tới x: (x của ngón trỏ tay bất kỳ) y: (y của ngón trỏ tay bất kỳ)**

Bấm **Chạy**. Quả bóng phải đi theo ngón trỏ, con dế ngồi yên ở góc trên bên phải.

> hint: Tên vật viết không dấu (**bong**, **de**) cho dễ gõ; trên sân chơi vẫn hiện hình quả bóng và con dế.
> hint: Bước này giống ngôi sao ở bài 1, chỉ đổi ngôi sao thành bóng.

check: playground has "de"
check: "bong" touches index finger

## Đoán trước: chạm dế thì sao?

Đoán trước: bây giờ em đưa ngón trỏ lên con dế, điểm có tăng không?

Thử xem.

> hint: Đáp án: không. Máy chỉ làm đúng những gì chương trình bảo. Chưa có khối nào nói "chạm dế thì cộng điểm", nên chạm bao lâu cũng không có gì xảy ra.

## Bắt được thì ghi điểm

Trong **liên tục**, dưới khối **đưa bong tới**, thêm khối **nếu … thì** (nhóm **Điều khiển**):

- Điều kiện: **de chạm ngón trỏ tay bất kỳ?**
- Bên trong: **cộng 1 điểm cho người chơi 1**, rồi **đưa de tới x: (lấy ngẫu nhiên từ -200 đến 200) y: (lấy ngẫu nhiên từ -140 đến 140)**, rồi **đợi 0.3 giây**.

Bấm **Chạy** và bắt dế. Bảng điểm hiện ở góc trên sân chơi.

> hint: Thiếu khối **đưa de tới** thì dế không nhảy đi: ngón trỏ vẫn nằm trên dế nên mỗi vòng lặp lại cộng thêm điểm.
> hint: **Lấy ngẫu nhiên** nằm ở nhóm **Các phép toán**. Máy tự chọn một số, không ai biết trước dế sẽ nhảy đi đâu.

check: player 1 score ≥ 1

## Hiểu sâu: một vòng lặp, hai việc

Mỗi vòng **liên tục** làm hai việc: đưa bóng tới ngón trỏ, rồi hỏi "dế có chạm ngón trỏ không?".

Câu hỏi đó là một **điều kiện**: câu trả lời chỉ có **đúng** hoặc **sai**. Đúng thì làm các khối bên trong **nếu**, sai thì bỏ qua.

Vì sao cần **đợi 0.3 giây**? Không đợi thì có lúc dế nhảy tới đúng chỗ ngón tay em, và em được điểm mà chưa kịp làm gì.

> hint: Thử thách: thêm **đếm ngược 30 giây** sau khi tạo dế, và khối mũ **khi hết giờ** với **nói (kết hợp "Hết giờ! Điểm: " (điểm người chơi 1))**. Khối **kết hợp** (nhóm **Các phép toán**) nối hai đoạn chữ thành một.

## Xong rồi!

Em đã làm một trò chơi AI thật sự: AI tìm ngón tay em, chương trình của em quyết định khi nào ghi điểm. Mở **Tập tin → Ví dụ…**, nhóm **Camera AI (không cần mạch)**, để chơi thêm Hứng Mưa, Đỡ Bóng, Hái sao né bom.
