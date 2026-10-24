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
- `nhom`: nhóm bài (ví dụ `dau-ra`).
- `thu-tu`: số thứ tự trong danh sách, phải là số.
- `bo`: bo mạch của bài (ví dụ `thingbot`).
- `thoi-luong`: số phút ước tính, phải là số.

## Các bước

Mỗi dòng `## Tên bước` mở một bước. Bước đầu là lời chào (không chấm điểm) và bước cuối là lời kết. Chỉ dùng
`##`; tiêu đề `###` bị báo lỗi. Nội dung bước là Markdown thường: đoạn văn, danh sách, chữ đậm (`**đậm**` hoặc `__đậm__`, như nhau), chữ nghiêng (`*nghiêng*` hoặc `_nghiêng_`, như nhau), ảnh (tệp ảnh
phải nằm trong thư mục của bài).

Hiện khối chỉ có nhãn tiếng Anh, nên bài gọi khối bằng nhãn đang hiện trên màn hình, in **đậm**.

### Gợi ý

Dòng `> gợi ý: ...` thêm một gợi ý cho bước. Nhiều dòng `> gợi ý:` liền nhau là nhiều gợi ý riêng, hiện lần lượt
từng cái.

### Luật chấm

Dòng `kiểm: ...` đặt một luật mà mạch ảo phải thoả để bước được tính là đạt. Một bước có thể có nhiều luật
(phải thoả tất cả). Bước không có `kiểm:` thì không chấm. Chữ hoa, chữ thường không phân biệt. Các dạng được
hiểu:

| Viết                                        | Nghĩa                                                |
| ------------------------------------------- | ---------------------------------------------------- |
| `kiểm: L1 sáng` / `L2 tắt`                  | Đèn L1 hoặc L2 đang sáng / tắt                       |
| `kiểm: còi kêu` / `còi tắt`                 | Còi đang kêu / tắt                                   |
| `kiểm: L1 nhấp nháy, chu kỳ 1 giây`         | Đèn chớp đều với chu kỳ này, sai số mặc định 20%     |
| `kiểm: L1 nhấp nháy, chu kỳ 0,5 giây ± 10%` | Như trên với sai số tự chọn; chu kỳ tối đa 1,5 giây  |
| `kiểm: M1 tiến` / `lùi` / `dừng`            | Động cơ M1 (M1 đến M4) quay tiến / lùi / đứng yên    |
| `kiểm: M1 tốc độ ≥ 50`                      | Tốc độ động cơ từ mức này trở lên (phần trăm)        |
| `kiểm: servo S1 ở 90 độ ± 5`                | Servo S1 (S1 đến S5) ở góc này; sai số mặc định 5 độ |
| `kiểm: OLED hiện "Xin chào"`                | Màn OLED có chứa chữ này                             |
| `kiểm: OLED hiện đúng "Xin chào"`           | Màn OLED hiện đúng chữ này, không thêm gì            |

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
node scripts/lessons/make-tb.mjs src/tutorials/bat-tat-den/kiem-thu/dung.project.json \
  src/tutorials/bat-tat-den/kiem-thu/dung.tb
```

## Dựng và kiểm tra

```sh
cd packages/thingblock-resource
node scripts/build-lessons.mjs
```

Dựng thành công in `Built N lesson(s)` và ghi `dist/thingblock-resource/tutorials/index.json`. Nếu có lỗi,
lệnh thoát với mã 1 và in từng lỗi dạng `tệp:dòng: thông điệp`.
