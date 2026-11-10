---
ma: sim-04-man-hinh-oled
ten: ThingBot Sim 4: Màn hình OLED
nhom: dau-vao
thu-tu: 2
bo: thingbot
thoi-luong: 15
thiet-bi: oled
---

## Chào em!

Màn hình **OLED** nhỏ xíu nhưng viết được chữ và vẽ hình. Bài này em viết hai dòng chữ lên màn hình ảo.

Mở bài này là nhóm khối **OLED** đã có sẵn trong bảng khối.

## Viết dòng đầu tiên

Dưới **khởi động ThingBot** trong **khi Arduino khởi động**, xếp ba khối của nhóm **OLED**:

1. **khởi động OLED rộng 128 cao 64 địa chỉ I2C 0x78 (0x3c) chip SSD1306** để bật màn hình.
2. **OLED in Xin chao** để ghi chữ vào bộ nhớ.
3. **hiện lên màn OLED** để đưa chữ ra màn hình.

Bấm **Chạy**.

> gợi ý: Quên **hiện lên màn OLED** thì chữ chỉ nằm trong bộ nhớ, màn hình vẫn đen.
> gợi ý: Gõ chữ không dấu: màn hình chỉ có bảng chữ tiếng Anh.

kiểm: OLED hiện "Xin chao"

## Dòng thứ hai

Trước khối **hiện lên màn OLED**, thêm **đặt con trỏ OLED x: 0 y: 16** rồi **OLED in ThingBot**. Con trỏ đưa chữ thứ hai xuống dòng dưới.

> gợi ý: Thứ tự đúng: init → print "Xin chao" → set cursor → print "ThingBot" → refresh.

kiểm: OLED hiện "Xin chao"
kiểm: OLED hiện "ThingBot"

## Thử thách: tên em

Thêm dòng thứ ba ở **y: 32** với tên của em. Bước này không chấm.

## Xong rồi!

Em đã viết chữ lên màn hình OLED. Bài sau em sẽ cho servo quay.
