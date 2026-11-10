---
ma: oled-xin-chao
ten: Màn hình OLED chào em
nhom: dau-ra
thu-tu: 3
bo: thingbot
thiet-bi: oled
thoi-luong: 18
---

## Nhiệm vụ: bảng chào khách

Nồi cơm điện hiện giờ nấu, đồng hồ điện tử hiện giờ phút, máy giặt hiện số phút còn lại. Máy nào cũng cần một **màn hình nhỏ** để "nói" với người dùng.

Nhiệm vụ: làm bảng chào khách cho ThingBot. Màn hình sẽ hiện **Xin chao** ở dòng trên và **ThingBot** ở dòng dưới.

Màn hình **OLED** là màn nhỏ màu xanh trên mạch ThingBot. Nó gồm 128 × 64 chấm sáng nhỏ gọi là **điểm ảnh**: 128 chấm theo chiều ngang, 64 chấm theo chiều dọc.

Lưu ý: màn hình chỉ có chữ **không dấu** (ví dụ "Xin chao"), vì bộ chữ trong mạch là chữ tiếng Anh.

Bấm **Tiếp** để bắt đầu.

## Viết dòng đầu tiên

Não nói chuyện với màn OLED qua **hai sợi dây** tên là **I2C**: dây SDA (chân IO8) chở tin, dây SCL (chân IO9) giữ nhịp. Nhiều thiết bị cùng nối vào hai dây này, nên mỗi thiết bị có một **địa chỉ**, giống số nhà. Màn OLED ở số nhà **0x3C**.

Màn hình cần bốn khối theo đúng thứ tự, đều nằm trong nhóm **OLED**. Mở bài này là nhóm **OLED** đã có sẵn trong bảng khối; nếu chưa thấy, bấm **Thêm thiết bị** (góc dưới bên trái) rồi chọn **OLED**.

1. **khởi động OLED rộng 128 cao 64 địa chỉ I2C 0x78 (0x3c) chip SSD1306** để khởi động màn hình. Ô địa chỉ ghi hai số 0x78 và 0x3c: đó là cùng một số nhà viết theo hai kiểu, em để nguyên.
2. **xoá OLED** để xoá hình logo mà màn hình tự vẽ lúc khởi động.
3. **OLED in Xin chao** để viết chữ vào bộ nhớ.
4. **hiện lên màn OLED** để đưa chữ ra màn hình thật.

Khối **OLED in** giống em viết vào **giấy nháp**. Khối **hiện lên màn OLED** giống em chép bài từ giấy nháp lên **bảng** cho cả lớp xem. Viết nháp xong hết rồi mới đưa lên một lần, nên màn hình không bị nháy.

Xếp cả bốn vào trong **khi Arduino khởi động** rồi bấm **Chạy**.

> gợi ý: Quên khối **hiện lên màn OLED** thì chữ chỉ nằm trên giấy nháp, màn hình vẫn đen.
> gợi ý: Quên khối **xoá OLED** thì chữ bị vẽ chồng lên logo.
> gợi ý: Gõ chữ vào ô trắng của khối **OLED in**, nhớ viết không dấu.

kiểm: OLED hiện "Xin chao"

## Dòng thứ hai

**Con trỏ** là chỗ đầu bút đang đặt trên màn. In chữ xong, con trỏ đứng ngay sau chữ vừa in. Muốn xuống dòng, em phải tự nhấc bút đặt sang chỗ mới.

Vị trí trên màn viết bằng hai số: **x** là đếm từ trái sang (0 là mép trái), **y** là đếm từ trên xuống (0 là mép trên).

Đoán trước: chữ cỡ thường cao 8 điểm ảnh. Muốn "ThingBot" nằm ở dòng dưới, cách xa dòng trên một chút, em đặt y bằng mấy?

- y = 0
- y = 16

> gợi ý: Đáp án: y = 16. Đặt y = 0 thì "ThingBot" đè lên "Xin chao". Đặt y = 16 thì chữ xuống dưới, chừa một khoảng trống giữa hai dòng.

Trước khi in chữ thứ hai, thêm khối **đặt con trỏ OLED x: 0 y: 16** rồi **OLED in ThingBot**, đặt cả hai _trước_ khối **hiện lên màn OLED**.

> gợi ý: Thứ tự đúng là: **khởi động OLED** → **xoá OLED** → **OLED in Xin chao** → **đặt con trỏ OLED** → **OLED in ThingBot** → **hiện lên màn OLED**.
> gợi ý: Thiếu khối **đặt con trỏ OLED** thì "ThingBot" nằm ngay sau "Xin chao" trên cùng một dòng.

kiểm: OLED hiện "Xin chao"
kiểm: OLED hiện "ThingBot" ở y 16

## Chữ to hơn

Bảng chào khách cần chữ to cho dễ đọc từ xa.

Thêm khối **đặt chữ OLED cỡ** ngay sau khối **xoá OLED**, chọn cỡ **12x16** (mỗi chữ rộng 12, cao 16 điểm ảnh, to gấp đôi cỡ 6x8), màu chữ **trắng**, màu nền **đen**. Chạy lại và so sánh.

> gợi ý: Chữ cỡ 12x16 cao 16 điểm ảnh, vừa khít trước dòng y 16 của "ThingBot".

kiểm: OLED hiện "Xin chao" cỡ 12x16
kiểm: OLED hiện "ThingBot" ở y 16

## Hiểu sâu: vì sao cần "hiện lên màn OLED"?

Thử tưởng tượng màn hình vẽ ngay từng chữ một. Em sẽ thấy màn **xoá trắng, rồi chữ hiện dần từng cái**, rất nhấp nháy, nhất là khi màn đổi chữ liên tục.

Nên mạch giữ một **bản nháp** trong bộ nhớ:

- **xoá OLED**, **OLED in**, **đặt con trỏ OLED** chỉ sửa bản nháp.
- **hiện lên màn OLED** chép cả bản nháp ra màn hình thật trong một lần.

Đồng hồ điện tử, màn máy giặt cũng làm như vậy: vẽ xong trong nháp rồi mới hiện ra.

## Xong rồi!

Em đã làm được bảng chào khách và biết ba việc cơ bản với OLED: khởi động, in chữ ở vị trí mình chọn, rồi **hiện lên màn OLED** để đưa bản nháp ra màn hình.

Bài sau em sẽ cho màn hình hiện số đếm thay đổi liên tục, như đồng hồ đếm giờ.
