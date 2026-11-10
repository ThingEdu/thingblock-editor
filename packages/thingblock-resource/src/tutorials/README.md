# Viết bài học

Mỗi bài là một thư mục `src/tutorials/<ma>/` chứa `bai.vi.md` (và ảnh dùng trong bài, nếu có). Lệnh
`npm run build` biên dịch các bài thành JSON trong `dist/thingblock-resource/tutorials/`.

## Đầu bài (front matter)

```markdown
---
ma: bat-tat-den
ten: Bật tắt đèn
nhom: dau-ra
thu-tu: 1
bo: thingbot
thoi-luong: 10
---
```

- `ma`: định danh, trùng tên thư mục.
- `ten`: tên bài hiện cho em học sinh.
- `nhom`: nhóm bài: `lam-quen`, `dau-ra`, `dong-co`, `dau-vao` hoặc `camera-ai`.
- `thu-tu`: số thứ tự trong nhóm, phải là số. Hai bài cùng `nhom` không được trùng `thu-tu`.
- `bo`: bo mạch của bài (ví dụ `thingbot`), hoặc `khong` cho bài không cần mạch (bài Camera AI).
- `thoi-luong`: số phút ước tính, phải là số.
- `thiet-bi` (không bắt buộc): các thiết bị ngoài bài cần, cách nhau dấu phẩy, viết bằng tên thư mục trong
  `src/extensions/peripheral/` (ví dụ `thiet-bi: oled`). Mở bài là editor tự thêm các thiết bị này vào bảng khối,
  học sinh không phải tự tìm **Add Peripheral**.
- `mo-rong` (không bắt buộc): phần mở rộng của editor mà bài cần, hiện chỉ có `cameraAi`. Mở bài là editor tự
  nạp nhóm khối **Camera AI** và khung **Sân chơi**. Bài Camera AI viết `bo: khong` và `mo-rong: cameraAi`.

## Các bước

Mỗi dòng `## Tên bước` mở một bước. Bước đầu là lời chào (không chấm điểm) và bước cuối là lời kết. Chỉ dùng
`##`; tiêu đề `###` bị báo lỗi. Nội dung bước là Markdown thường: đoạn văn, danh sách, chữ đậm (`**đậm**` hoặc `__đậm__`, như nhau), chữ nghiêng (`*nghiêng*` hoặc `_nghiêng_`, như nhau), ảnh (tệp ảnh
phải nằm trong thư mục của bài).

Bài gọi khối bằng nhãn tiếng Việt đang hiện trong bảng khối (chọn ngôn ngữ Tiếng Việt), in **đậm**, ví dụ **khi Arduino khởi động**, **đặt đèn L1 độ sáng 100**.

### Gợi ý

Dòng `> gợi ý: ...` thêm một gợi ý cho bước. Nhiều dòng `> gợi ý:` liền nhau là nhiều gợi ý riêng, hiện lần lượt
từng cái.

### Luật chấm

Dòng `kiểm: ...` đặt một luật mà mạch ảo phải thoả để bước được tính là đạt. Một bước có thể có nhiều luật
(phải thoả tất cả). Bước không có `kiểm:` thì không chấm. Chữ hoa, chữ thường không phân biệt. Các dạng được
hiểu:

| Viết                                        | Nghĩa                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `kiểm: L1 sáng` / `L2 tắt`                  | Đèn L1 hoặc L2 đang sáng / tắt                                               |
| `kiểm: còi kêu` / `còi tắt`                 | Còi đang kêu / tắt                                                           |
| `kiểm: L1 nhấp nháy, chu kỳ 1 giây`         | Đèn chớp đều với chu kỳ này, sai số mặc định 20%                             |
| `kiểm: L1 nhấp nháy, chu kỳ 0,5 giây ± 10%` | Như trên với sai số tự chọn; chu kỳ tối đa 1,5 giây                          |
| `kiểm: M1 tiến` / `lùi` / `dừng`            | Động cơ M1 (M1 đến M4) quay tiến / lùi / đứng yên                            |
| `kiểm: M1 tốc độ ≥ 50%`                     | Tốc độ động cơ từ mức này trở lên (phần trăm)                                |
| `kiểm: servo S1 ở 90 độ ± 5`                | Servo S1 (S1 đến S5) ở góc này; sai số mặc định 5 độ                         |
| `kiểm: OLED hiện "Xin chào"`                | Màn OLED có chứa chữ này                                                     |
| `kiểm: OLED hiện đúng "Xin chào"`           | Màn OLED hiện đúng chữ này, không thêm gì                                    |
| `kiểm: OLED hiện "ThingBot" ở y 16`         | Chữ này được in bắt đầu từ dòng y = 16                                       |
| `kiểm: OLED hiện "Xin chao" cỡ 12x16`       | Chữ này được in ở cỡ 12x16 (khối set oled text size)                         |
| `kiểm: servo S1 quét từ 0 đến 180 độ`       | Servo đã đi tới gần cả hai góc; sai số mặc định 5 độ                         |
| `kiểm: giữ nút SW` / `nhả nút SW`           | Học sinh đang giữ / đã nhả nút SW trên mạch ảo                               |
| `kiểm: khoảng cách < 20 cm`                 | Thanh khoảng cách đang ở dưới 20 cm (`≤ > ≥` cũng được)                      |
| `kiểm: giữ nút PS2 lên`                     | Học sinh đang giữ nút ▲ trên tay cầm PS2 ảo                                  |
| `kiểm: chọn bóng tối màu` / `sáng màu`      | Học sinh đặt bóng xanh dương, đen / trắng, vàng, đỏ trước mắt hồng ngoại IO4 |
| `kiểm: đọc mắt hồng ngoại IO4`              | Chương trình có đọc chân IO4 (khối **đọc mắt hồng ngoại 1 · IO4**)           |
| `kiểm: phân loại đúng 6 trứng liền`         | Trên băng chuyền trứng, 6 quả gần nhất liền nhau vào đúng thùng              |
| `kiểm: gạt 2 trứng hỏng`                    | Cần gạt (servo S1) đã đẩy ít nhất 2 quả trứng hỏng vào thùng loại            |

Bốn luật `giữ/nhả nút SW`, `khoảng cách`, `giữ nút PS2`, `chọn bóng` là việc học sinh làm trên mạch ảo, không
phải việc chương trình làm. Ghép chúng với một luật đầu ra trong cùng bước, ví dụ `giữ nút SW` và `L1 sáng`:
bước đạt khi cả hai cùng đúng một lúc. Khi chạy `kiem-thu/`, bộ kiểm thử tự đặt mạch ảo cho các luật này (giữ
nút, kéo thanh khoảng cách, đặt quả bóng đen hoặc trắng) trước khi chấm. Nút PS2 viết bằng tên (`lên`, `xuống`,
`trái`, `phải`, `tam giác`, `tròn`, `nhân`, `vuông`, `L1`, `L2`, `R1`, `R2`, `select`, `start`) hoặc ký hiệu trên
tay cầm ảo (`▲ ▼ ◀ ▶ △ ○ ✕ □`).

Mắt hồng ngoại là module phản xạ cắm cổng cảm biến, chân tín hiệu IO4, đọc ra số 0…4095 (bóng trắng 3500, vàng
3100, đỏ 2300, xanh dương 1100, đen 300; ngưỡng gợi ý 1500). Hai luật trứng cần **băng chuyền trứng** trên mạch
ảo: động cơ M1 kéo băng, mắt hồng ngoại nhìn từng quả (trứng tốt 3300, trứng hỏng 900, mặt băng 2600), servo S1
từ 45 độ trở lên gạt quả đang tới cần gạt vào thùng loại. Bài có luật trứng thì editor tự bật băng chuyền; bộ kiểm
thử cũng vậy, và chấm bước đó trong 30 giây thay vì 5 giây vì băng cần thời gian chở 6 quả. Số liệu và cách chạy
băng lấy từ ThingEdu/thingbot-sim (`src/belt.ts`, commit bde12a2). thingbot-sim và gói này cùng giấy phép AGPL-3.0.

### Luật Camera AI

Bài có `mo-rong: cameraAi` chấm được trên khung **Sân chơi** (không cần mạch ảo). Một bước chỉ dùng một loại
luật: toàn luật Camera AI hoặc toàn luật mạch ảo.

| Viết                                        | Nghĩa                                                          |
| ------------------------------------------- | -------------------------------------------------------------- |
| `kiểm: camera bật`                          | Camera (hoặc chế độ chuột) đang bật                            |
| `kiểm: thấy bàn tay`                        | Sân chơi đang thấy ít nhất một bàn tay                         |
| `kiểm: tay nắm` / `tay xòe` / `tay chữ V`   | Học sinh đang làm cử chỉ này (cả `chỉ lên`, `giơ ngón cái`…)   |
| `kiểm: sân chơi có "sao"`                   | Trên sân chơi có vật tên `sao`                                 |
| `kiểm: "sao" chạm ngón trỏ`                 | Vật `sao` chạm đầu ngón trỏ (cả `lòng bàn tay`, `cổ tay`)      |
| `kiểm: điểm người chơi 1 ≥ 1`               | Điểm người chơi 1 (hoặc 2) so với số này (`< ≤ > ≥ =`)         |
| `kiểm: sân chơi nói "Nắm tay"`              | Dòng chữ trên sân chơi có chứa chữ này                         |
| `kiểm: thấy đầu`                            | Sân chơi đang thấy đầu em (mô hình Pose)                       |
| `kiểm: đầu nghiêng trái` / `phải` / `thẳng` | Đầu đang nghiêng (từ 15 độ) hoặc thẳng                         |
| `kiểm: "sao" chạm đầu`                      | Vật `sao` chạm đầu                                             |
| `kiểm: vỗ hai tay` / `gật đầu`              | Học sinh vừa vỗ hai tay xuống / gật đầu (trong 2 giây gần đây) |

Luật `tay …`, `đầu nghiêng …`, `vỗ hai tay`, `gật đầu` là việc học sinh làm. Khi chạy `kiem-thu/`, bộ kiểm thử dùng bàn tay tổng hợp: tay làm cử chỉ bước
đó cần; bước có luật điểm thì tay lần lượt chạm từng vật trên sân chơi; bước về đầu thì có cả người đứng ở chỗ đó, nghiêng hoặc gật đúng như luật; bước `vỗ hai tay` thì hai tay vỗ xuống mỗi 0,9 giây; bước khác thì tay đứng yên ở x 100,
y -60 (xa chỗ các vật được tạo), nên luật `chạm` chỉ đạt khi chương trình thật sự đưa vật theo tay.

Số thập phân viết bằng dấu phẩy hoặc dấu chấm đều được. Gõ sai dạng luật thì `npm run build` dừng và báo
`tệp:dòng`.

## Lời giải kiểm thử

Bài có luật `kiểm:` cần các dự án `.tb` trong `kiem-thu/` để thử rằng chấm điểm không sai. Thư mục này không
được đưa vào bản dựng. Số `<n>` là thứ tự bước trong bài, tính từ 1 và tính cả bước chào.

- `dung.tb`: lời giải phải đạt **mọi** bước có luật.
- `dung-<n>.tb`: lời giải đạt riêng bước n, ưu tiên hơn `dung.tb` cho bước đó. Dùng khi hai bước loại trừ
  nhau (ví dụ `den-nhap-nhay`: chu kỳ 1 giây và chu kỳ 0,5 giây không thể cùng đạt nên có `dung-2.tb` và
  `dung-3.tb`, không có `dung.tb`).
- `sai-<n>.tb`: phản ví dụ phải **trượt** bước n.

Cạnh mỗi `.tb` giữ tệp `*.project.json` cùng tên để người xem đọc được nội dung.

### Tạo tệp `.tb`

- Cách thường: dựng chương trình trong editor, chọn **Lưu dự án**, rồi chép tệp vào `kiem-thu/` với đúng tên.
- Cách viết tay: soạn `*.project.json` rồi gói lại bằng công cụ của gói:

```sh
cd packages/thingblock-resource
node scripts/lessons/make-tb.mjs src/tutorials/bat-tat-den/kiem-thu/dung-2.project.json \
  src/tutorials/bat-tat-den/kiem-thu/dung-2.tb
```

Lời giải Camera AI được chấm bằng VM thật đã dựng (`thingblock-vm/dist/node`), nên cần chạy
`npm run build:libs` ở gốc trước `npm test`. Tệp `.tb` của bài `bo: khong` không lưu `board`.

## Dựng và kiểm tra

```sh
cd packages/thingblock-resource
node scripts/build-lessons.mjs
```

Dựng thành công in `Built N lesson(s)` và ghi `dist/thingblock-resource/tutorials/index.json`. Nếu có lỗi,
lệnh thoát với mã 1 và in từng lỗi dạng `tệp:dòng: thông điệp`.
