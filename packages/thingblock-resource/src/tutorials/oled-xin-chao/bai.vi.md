---
ma: oled-xin-chao
ten: Màn hình OLED chào em
nhom: dau-ra
thu-tu: 3
bo: thingbot
thoi-luong: 15
---

## Chào em!

Màn hình **OLED** nhỏ màu xanh trên mạch ThingBot hiện được chữ và hình. Bài này em sẽ viết chữ lên màn hình.

Lưu ý: màn hình chỉ có chữ **không dấu** (ví dụ "Xin chao"), vì bộ chữ trong mạch là chữ tiếng Anh.

Bấm **Next** để bắt đầu.

## Viết dòng đầu tiên

Màn hình cần ba khối theo đúng thứ tự, đều nằm trong nhóm **OLED**:

1. **init oled width 128 height 64 I2C address 0x3c chip SSD1306** để khởi động màn hình.
2. **oled print Xin chao** để viết chữ vào bộ nhớ.
3. **refresh oled display** để đưa chữ ra màn hình thật.

Xếp cả ba vào trong **when Arduino begins** rồi bấm **Run**.

> gợi ý: Quên khối **refresh oled display** thì chữ chỉ nằm trong bộ nhớ, màn hình vẫn đen.
> gợi ý: Gõ chữ vào ô trắng của khối **oled print**, nhớ viết không dấu.

kiểm: OLED hiện "Xin chao"

## Dòng thứ hai

Khối con trỏ đặt chữ tiếp theo vào đúng vị trí em chọn. Trước khi in chữ thứ hai, thêm khối **set oled cursor x: 0 y: 16** rồi **oled print ThingBot**, đặt cả hai _trước_ khối **refresh oled display**.

> gợi ý: Thứ tự đúng là: init → print "Xin chao" → set cursor → print "ThingBot" → refresh.

kiểm: OLED hiện "Xin chao"
kiểm: OLED hiện "ThingBot"

## Chữ to hơn

Thêm khối **set oled text size** ngay sau khối init, chọn cỡ **12x16** (chữ to gấp đôi cỡ 6x8), màu chữ **white**, màu nền **black**. Chạy lại và so sánh.

kiểm: OLED hiện "Xin chao"

## Xong rồi!

Em đã biết ba việc cơ bản với OLED: khởi động, in chữ ở vị trí mình chọn, và refresh để hiện ra. Bài sau em sẽ cho màn hình hiện số đếm thay đổi liên tục.
