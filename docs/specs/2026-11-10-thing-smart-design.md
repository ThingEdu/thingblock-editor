# Thing Smart trong ThingBlock — thiết kế cầu nối với ThingEdges Desktop

Ngày: 10/11/2026 · Trạng thái: **chờ duyệt, nhắm bản 0.8** · Phạm vi: máy tính có cài cả ThingBlock và ThingEdges Desktop (macOS đã thử; Windows, Linux chưa thử).

## 1. Mục tiêu và phạm vi

Học sinh lập trình bằng khối các thiết bị thật trong nhà: đèn, công tắc, ổ cắm, điều hòa, TV và remote hồng ngoại qua IR Hub, cảm biến. Thiết bị đã được người lớn thêm sẵn vào nhà trong **ThingEdges Desktop** (app của Rogo). ThingBlock không tự thêm hay cấu hình thiết bị.

**Làm trong đợt này**

- Gói mở rộng **Thing Smart** (id `thingEdges`), có sẵn trong thư viện khối mở rộng khi chưa chọn mạch.
- Cầu nối HTTP cục bộ trong ThingEdges Desktop. ThingBlock đọc danh sách thiết bị, đọc trạng thái và gửi lệnh qua cầu nối này.
- Quyền dùng thiết bị gắn với **tài khoản ThingEdges cá nhân** đang đăng nhập trong Desktop.

**Không làm**

- Đăng nhập ThingEdges ngay trong ThingBlock (xem §6).
- Sinh mã Arduino cho khối Thing Smart. Khối chạy trong editor (host mode), giống Camera AI.
- Chạy chương trình khi tắt máy tính. Việc này thuộc hướng runner trên NEO One, sẽ tách thành đợt riêng.

## 2. Kiến trúc

```text
 ThingBlock (webview / trình duyệt)          ThingEdges Desktop (JVM)                 Nhà
┌──────────────────────────────┐   HTTP   ┌──────────────────────────────┐        ┌──────────────┐
│ extension thingEdges         │ 127.0.0.1│ LocalBridge                  │  SDK   │ NEO One /    │
│  bridge-client.ts ───────────┼─────────►│  /v1/info /pair /devices     ├───────►│ gateway, BLE │
│  thăm dò 1 s, danh sách 30 s │ :47380–89│  /v1/states /control         │ MQTT,  │ mesh, Zigbee,│
│  token trong localStorage    │  Bearer  │  token gắn với tài khoản     │ cloud  │ IR Hub       │
└──────────────────────────────┘          │  đăng nhập: tài khoản cá nhân│        └──────────────┘
                                          └──────────────────────────────┘
```

- Mật khẩu tài khoản và khóa đối tác (appKey/appSecret) chỉ nằm trong Desktop. Trang web của ThingBlock không bao giờ thấy chúng.
- Cầu nối chỉ nghe trên `127.0.0.1`, ở cổng trống đầu tiên trong dải 47380–47389. Desktop ghi cổng đang dùng vào `~/.thingedges-desktop/local-bridge.json` (tệp này không chứa bí mật).
- Cầu nối chỉ nhận yêu cầu có `Origin` của app cục bộ: `tauri://localhost`, `http(s)://tauri.localhost`, `http://localhost:*`, `http://127.0.0.1:*`, hoặc yêu cầu không có `Origin`. Vì vậy một trang web lạ mà em bé mở không điều khiển được nhà.
- Mã nguồn:
  - ThingBlock: `packages/thingblock-vm/src/extensions/scratch3_thingedges/`
  - Desktop: `ThingEdges-Desktop`, các tệp `LocalBridge.kt` và `LocalBridgeModel.kt`

## 3. Hợp đồng HTTP (api 1)

| Đường dẫn | Cần token | Trả về |
|---|---|---|
| `GET /v1/info` | không | `name`, `api`, `signedIn`, `paired`. Khi token hợp lệ thì có thêm `account` và `location`. |
| `POST /v1/pair {"app":"ThingBlock"}` | không | Chờ người lớn trả lời tối đa 2 phút, rồi trả `{"token"}`. Trả 503 khi chưa đăng nhập hoặc chưa mở địa điểm. Trả 403 khi bị từ chối. Trả 409 khi một app khác đang hỏi. |
| `GET /v1/devices` | có | Thiết bị của địa điểm đang mở, mỗi thiết bị có: `id`, `name`, `kind`, `room`, `channels[]`, `capabilities[]`, `irKeys[]`. |
| `GET /v1/states` | có | `states[id]`, gồm các trường có thể có: `on{element}`, `brightness`, `acTemperature`, `temperature`, `humidity`, `lux`, `open`. |
| `POST /v1/devices/{id}/control` | có | Nhận một lệnh: `power`, `toggle`, `brightness` (0–100), `color` (hue 0–360), `ac_temperature` (18–30), `ir` (tên phím). |

Mã lỗi chung:

- 401: token không hợp lệ cho tài khoản đang đăng nhập.
- 503: Desktop chưa đăng nhập.
- 422: thiết bị không nhận lệnh đó.
- 429: quá 5 lệnh/giây cho một thiết bị. Giới hạn này chặn vòng `mãi mãi` làm ngập sóng mesh.

## 4. Ghép đôi theo tài khoản

1. Người lớn đăng nhập ThingEdges Desktop bằng tài khoản cá nhân, rồi mở một địa điểm (nhà).
2. Em bé chạy khối **kết nối ThingEdges Desktop**. Desktop hiện hộp thoại: «ThingBlock … muốn điều khiển … của "Nhà" bằng tài khoản *An*. Quyền này chỉ dùng được khi tài khoản này đang đăng nhập.»
3. Người lớn bấm **Cho phép**. Desktop sinh token 128 bit và lưu `sha256(userId):sha256(token)`, không lưu token gốc. ThingBlock giữ token trong `localStorage` (khóa `thingedges.bridgeToken`).
4. Từ đó, mỗi yêu cầu được kiểm tra với tài khoản **đang** đăng nhập:
   - Đổi sang tài khoản khác thì token hết hiệu lực.
   - Tài khoản cũ đăng nhập lại thì token dùng lại được, không phải hỏi lại.
   - Đăng xuất thì cầu nối trả 503.
5. Muốn thu hồi, vào Desktop › Cài đặt › Lập trình với ThingBlock › **Thu hồi quyền**.

Trạng thái của extension, hiện qua khối báo **trạng thái ThingEdges**:

| `_status` | Khi nào | Khối báo hiện |
|---|---|---|
| `searching` | Không thấy Desktop | mở ThingEdges Desktop trên máy này |
| `signedOut` | Desktop chưa đăng nhập | đăng nhập tài khoản của em vào ThingEdges Desktop |
| `waiting` | Đã đăng nhập, nhưng tài khoản này chưa cho phép | chưa được cho phép: dùng khối kết nối |
| `connected` | Token hợp lệ | đã kết nối: *An · Nhà* |

Khi chưa kết nối, extension thăm dò lại mỗi 5 giây. Nhờ đó nó tự chuyển trạng thái khi Desktop vừa mở, khi có người vừa đăng nhập, hoặc khi tài khoản cũ đăng nhập lại.

## 5. Bộ khối

| Khối | Loại | Ghi chú |
|---|---|---|
| kết nối ThingEdges Desktop | lệnh | ghép đôi |
| trạng thái ThingEdges | báo | xem §4 |
| bật/tắt [thiết bị · kênh] | lệnh | công tắc nhiều nút: mỗi nút là một mục trong menu |
| đảo trạng thái [thiết bị] | lệnh | |
| đặt độ sáng [đèn] (0–100) | lệnh | |
| đặt màu [đèn] (hue) | lệnh | |
| đặt [điều hòa] (18–30) °C | lệnh | |
| bấm [phím] trên remote [TV/điều hòa IR] | lệnh | phím đã học trên IR Hub |
| [thiết bị] đang bật? | Boolean | |
| [nhiệt độ/độ ẩm/ánh sáng] của [cảm biến] | báo | |
| khi [thiết bị] chuyển [bật/tắt] | mũ, theo cạnh | |
| khi [đo] của [cảm biến] > (n) | mũ, theo cạnh | |

- Menu thiết bị được đọc đồng bộ từ danh sách đã lưu, vì menu động của Scratch phải trả kết quả ngay.
- Lệnh bị từ chối (429, 422) không làm dừng chương trình của em bé, chỉ ghi `console.warn`.

## 6. Vì sao không đăng nhập thẳng trong ThingBlock

Đăng nhập thẳng trong ThingBlock giúp dùng được trên máy tính bảng mà không cần Desktop, nhưng hiện chưa làm được:

- `staging.openapi.rogo.com.vn` trả lời preflight nhưng **không có** `Access-Control-Allow-Origin` cho origin lạ, nên trình duyệt chặn.
- `appSecret` của đối tác sẽ nằm trong mã JS, ai cũng đọc được.
- MQTT cloud dùng TLS với CA riêng, chưa rõ có cổng WebSocket hay không.
- Lệnh điều khiển là gói nhị phân của SDK, phải viết lại bằng JS.
- `SmartSdk.requestOtpPartner` / `getLoginTokenForPartner` là code chết: chỉ viết cho `FPT`, đã bị comment.

Để làm được, Rogo cần mở: CORS cho origin của ThingBlock, luồng token cho ứng dụng công khai (PKCE hoặc OTP theo đối tác), và MQTT qua WSS.

## 7. Kiểm thử

- ThingBlock: `test/unit/extension_thingedges.ts`, 60 assertion, dùng một cầu nối giả mô phỏng việc đăng nhập và đăng xuất. Đã thử phá có chủ đích hai nhánh kiểm tra đăng nhập, và test bắt được. Toàn bộ VM có 2401 test qua.
- Desktop: `./gradlew localBridgeCheck` (loại thiết bị, lệnh, origin, giới hạn tốc độ, token gắn tài khoản).
- Chạy thật trên Mac với Desktop đã đăng nhập staging: khối trạng thái báo đúng «chưa được cho phép»; ghép đôi qua hộp thoại thành công.
- **Chưa thử**:
  - điều khiển thiết bị thật, vì địa điểm staging chỉ có gateway;
  - Windows và Linux;
  - webview Tauri. Chromium có thể chặn gọi từ `tauri://localhost` vào loopback; cầu nối đã gửi `Access-Control-Allow-Private-Network: true`.

## 8. Việc còn mở

1. **Khóa đối tác ThingEdu**: Desktop đang dùng khóa staging mẫu. Khi có khóa ThingEdu trên developer.rogo.com.vn, chỉ cần điền `THINGEDGES_APP_ID/SECRET` vào `local.properties` rồi build lại.
2. Phát hành ThingEdges Desktop có cầu nối. Cầu nối nằm ở PR riêng trong `RogoSolutions/ThingEdges-Desktop`.
3. Runner trên NEO One, để chương trình chạy khi không có máy tính. Đã đo khả thi: VM headless dùng 85 MB RAM và 12 % một nhân.
