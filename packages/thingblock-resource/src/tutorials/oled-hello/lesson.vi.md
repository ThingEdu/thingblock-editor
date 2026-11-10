---
id: oled-hello
name: Màn hình OLED chào em
group: outputs
order: 3
board: thingbot
peripherals: oled
duration: 15
---

## Chào em!

Màn hình **OLED** nhỏ màu xanh trên mạch ThingBot hiện được chữ và hình. Bài này em sẽ viết chữ lên màn hình.

Lưu ý: màn hình chỉ có chữ **không dấu** (ví dụ "Xin chao"), vì bộ chữ trong mạch là chữ tiếng Anh.

Bấm **Tiếp** để bắt đầu.

## Viết dòng đầu tiên

Màn hình cần bốn khối theo đúng thứ tự, đều nằm trong nhóm **OLED**. Mở bài này là nhóm **OLED** đã có sẵn trong bảng khối; nếu chưa thấy, bấm **Thêm thiết bị** (góc dưới bên trái) rồi chọn **OLED**.

1. **khởi động OLED rộng 128 cao 64 địa chỉ I2C 0x78 (0x3c) chip SSD1306** để khởi động màn hình.
2. **xoá OLED** để xoá hình logo mà màn hình tự vẽ lúc khởi động.
3. **OLED in Xin chao** để viết chữ vào bộ nhớ.
4. **hiện lên màn OLED** để đưa chữ ra màn hình thật.

Xếp cả bốn vào trong **khi Arduino khởi động** rồi bấm **Chạy**.

> hint: Quên khối **hiện lên màn OLED** thì chữ chỉ nằm trong bộ nhớ, màn hình vẫn đen.
> hint: Quên khối **xoá OLED** thì chữ bị vẽ chồng lên logo.
> hint: Gõ chữ vào ô trắng của khối **OLED in**, nhớ viết không dấu.

check: OLED shows "Xin chao"

## Dòng thứ hai

Khối con trỏ đặt chữ tiếp theo vào đúng vị trí em chọn. Trước khi in chữ thứ hai, thêm khối **đặt con trỏ OLED x: 0 y: 16** rồi **OLED in ThingBot**, đặt cả hai _trước_ khối **hiện lên màn OLED**.

> hint: Thứ tự đúng là: init → clear → print "Xin chao" → set cursor → print "ThingBot" → refresh.
> hint: Thiếu khối **đặt con trỏ OLED** thì "ThingBot" nằm ngay sau "Xin chao" trên cùng một dòng.

check: OLED shows "Xin chao"
check: OLED shows "ThingBot" at y 16

## Chữ to hơn

Thêm khối **đặt chữ OLED cỡ** ngay sau khối **xoá OLED**, chọn cỡ **12x16** (chữ to gấp đôi cỡ 6x8), màu chữ **trắng**, màu nền **đen**. Chạy lại và so sánh.

> hint: Chữ cỡ 12x16 cao 16 điểm ảnh, vừa khít trước dòng y 16 của "ThingBot".

check: OLED shows "Xin chao" size 12x16
check: OLED shows "ThingBot" at y 16

## Xong rồi!

Em đã biết ba việc cơ bản với OLED: khởi động, in chữ ở vị trí mình chọn, và refresh để hiện ra. Bài sau em sẽ cho màn hình hiện số đếm thay đổi liên tục.
