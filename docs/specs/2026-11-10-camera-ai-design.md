# Camera AI trong ThingBlock — thiết kế kiến trúc và bộ khối

Ngày: 10/11/2026 · Trạng thái: **bản thiết kế chờ duyệt** · Phạm vi: máy tính (macOS, Windows, Linux x64). Chưa làm NEO One.

## 1. Mục tiêu và phạm vi

Học sinh dùng webcam của máy tính làm đầu vào cho chương trình khối: điều khiển game trên màn hình và ThingBot thật bằng bàn tay, cử chỉ, tư thế, khuôn mặt; tự dạy máy phân loại ảnh; dựng game có bảng điểm.

**Làm trong đợt này**

- Gói mở rộng **Camera AI** chạy trong app ThingBlock trên máy tính, **không cần mạng** sau khi cài.
- Năm năng lực: tay và cử chỉ · tư thế · khuôn mặt và biểu cảm · phân loại ảnh học sinh tự dạy · nhận vật thể.
- **Sân chơi**: khung vẽ trong cột bên phải, hiện camera, vật thể game, điểm và đồng hồ.
- Điều khiển ThingBot thật qua các khối Telemetrix sẵn có (chế độ trực tiếp).
- Sáu bài học mẫu theo đúng định dạng `bai.vi.md` hiện có.

**Không làm**

- Nhận dạng **danh tính** khuôn mặt. Chỉ dò mặt, vị trí, biểu cảm. Lý do: dữ liệu sinh trắc trẻ em, Luật AI 134/2025, phải xin phép phụ huynh.
- Chạy trên NEO One. Số đo thật từ NeoAiSport: MediaPipe tay chỉ ~3 fps trên NEO. Sẽ đánh giá trải nghiệm bằng NeoAiSport trước, tách thành đợt riêng.
- Sinh mã Arduino cho khối Camera AI. Các khối này chỉ chạy trên máy tính.
- Ghi hình, lưu ảnh, gửi ảnh đi đâu.

## 2. Nghiên cứu cách bố trí khối ở Scratch và App Inventor

### 2.1 Scratch và các mở rộng cùng họ

| Mở rộng | Khối | Điều rút ra |
|---|---|---|
| **Video Sensing** (Scratch 3 chính thức) | `when video motion > (10)` (mũ) · `video [motion/direction] on [sprite/stage]` (báo) · `turn video [on/off/on flipped]` · `set video transparency to (50)` | Camera là **nền của sân khấu**, mờ được; mọi mở rộng khác đều mượn lại bộ 2 khối `turn video` + `transparency` |
| **PoseNet2Scratch** (champierre) | `[part] x of person no. [1]`, `[part] y of person no. [1]`, `people count`, 34 khối tắt `nose x`, `left wrist y`… | Khối báo **x riêng, y riêng**; tên bộ phận là menu; thêm khối tắt cho bộ phận hay dùng |
| **Handpose2Scratch** | `x/y/z of [landmark 1..21]`, `set ratio` | Chỉ có điểm, **không có cử chỉ** → học sinh phải tự tính (quá khó với tiểu học) |
| **Facemesh2Scratch** | `x/y of person no: [1], keypoint no: [1..468]` | 468 điểm thô → ít dùng được; nên **đặt tên điểm** (mũi, cằm, khóe miệng) |
| **ML2Scratch** | `train label [1]`, `when received label [1]`, `label` (báo), `download/upload learning data`, `turn video on/off` | Học sinh **dạy máy ngay trong editor**, 3 nhãn, ~20 ảnh/nhãn; có nhãn → khối mũ `when received` |
| **TM2Scratch** | `image model URL`, `when received image label [x]`, `confidence of image label [x]`, `set confidence threshold`, `classify once every (1) seconds`, `set video [on/off/mirror]`, `switch camera to [device]` | Thêm **ngưỡng tin cậy**, **chu kỳ phân loại**, **chọn camera** |

Tọa độ: cả họ champierre đều quy camera 480×360 về hệ sân khấu Scratch, gốc ở giữa, x −240…240, y −180…180, **lật gương mặc định** (bên phải người chơi là +x).

### 2.2 MIT App Inventor

| Mở rộng | Sự kiện | Thuộc tính / phương thức | Điều rút ra |
|---|---|---|---|
| **PosenetExtension** | `ModelReady`, `PoseUpdated`, `VideoUpdated`, `Error` | `KeyPoints`, `Skeleton`, `Nose`, `LeftWrist`… (cặp x,y), `MinPoseConfidence`, `MinPartConfidence`, `Enabled`, `UseCamera` | Tách rõ **sẵn sàng / cập nhật / lỗi**; mỗi bộ phận là một thuộc tính đọc |
| **FaceMeshExtension** | `ModelReady`, `FaceUpdated`, `VideoUpdated`, `Error` | `Forehead`, `NoseBottom`, `Chin`, `LeftCheek`, `MouthTop`, `MouthBottom`… + **suy diễn**: `FaceWidth`, `EyeToMouthHeight`; `ShowMesh` | Điểm mặt được **đặt tên**, kèm vài số đo suy diễn có ý nghĩa |
| **PersonalImageClassifier** | `ClassifierReady`, `GotClassification(result: nhãn→độ tin)`, `Error` | `ClassifyVideoData`, `Start/StopContinuousClassification`, `InputMode`, `MinimumInterval`, `ModelLabels`, `Running` | Phân loại **liên tục hoặc theo lệnh**; kết quả là bảng nhãn→độ tin |

### 2.3 Nguyên tắc chốt cho ThingBlock

1. **Camera là nền sân chơi**, bật/tắt/lật gương/độ mờ bằng 2 khối, giống Scratch.
2. **Ba tầng khối cho mỗi năng lực**: khối *mũ* "khi…", khối *báo* "vị trí…", khối *đúng/sai* "có… không?". Tiểu học chỉ cần tầng mũ; trung học dùng tầng báo.
3. **Đặt tên bộ phận** (cổ tay, mũi, cằm, khóe miệng) thay cho số điểm; không lộ 468 điểm mặt.
4. **Có cử chỉ sẵn** (nắm, mở, ngón cái lên…) và **biểu cảm sẵn** (cười, há miệng) để khối mũ dùng ngay, học theo PIC/Posenet của App Inventor nhưng gói thành khối mũ của Scratch.
5. **x, y là hai khối riêng**, hệ tọa độ sân chơi 480×360 gốc giữa, gương mặc định bật.
6. **Phân loại dạy ngay trong editor** (ML2Scratch) với ngưỡng tin cậy và chu kỳ (TM2Scratch); mẫu học lưu trong tệp dự án.
7. **Sẵn sàng / lỗi** hiện ở bảng Sân chơi, không thành khối; chỉ có khối mũ `khi camera sẵn sàng`.
8. Khối mũ là **hat sự kiện** (`isEdgeActivated: false`, extension tự gọi `runtime.startHats` khi cử chỉ xuất hiện, camera sẵn sàng, hết giờ). Không dùng hat sườn-lên của scratch-vm vì hat sườn-lên giữ một luồng sống mỗi khung hình, làm nút Chạy hiện "Dừng" ngay khi mở dự án. Giá trị menu dùng để khớp hat (`HAND`, `GESTURE`) lưu **chữ hoa** vì `startHats` so khớp chữ hoa; các khối báo/đúng-sai đọc không phân biệt hoa thường.

## 3. Kiến trúc

### 3.1 Vị trí trong mã nguồn

```
packages/thingblock-vm/src/extensions/scratch3_camera_ai/     ← mở rộng VM `cameraAi` (builtin, như thingbotTelemetrix)
    index.ts            getInfo(): khối, menu, bản dịch
    vision-state.ts     trạng thái thị giác mới nhất (tay, tư thế, mặt, nhãn), đọc không chặn
    gestures.ts         ánh xạ cử chỉ, hướng vẫy, so tư thế mẫu (thuần, có test)
    knn.ts              bộ phân loại kNN trên vector nhúng (thuần, có test)
packages/thingblock-gui/src/lib/vision/
    vision-client.js    cầu nối main thread ↔ worker, watchdog 3 s (cùng kiểu sim-client.js)
    vision.worker.js    nạp MediaPipe Tasks (WASM/WebGL) trong Web Worker, suy luận, trả kết quả
    camera.js           getUserMedia, chọn thiết bị, lật gương, ImageBitmap → worker
    replay.js           nguồn giả phát lại tệp landmark để test và chấm bài
packages/thingblock-gui/src/components/playground/            ← bảng "Sân chơi"
    playground.jsx      canvas: camera + lớp vẽ + vật thể + HUD điểm/đồng hồ + nút
    objects.js          vật thể game: hình, emoji, ảnh thư viện; va chạm tròn; trọng lực nhẹ
    scoreboard.jsx      bảng điểm, lưu localStorage, xuất CSV
packages/thingblock-gui/src/reducers/camera-ai.js             ← trạng thái: camera, mô hình sẵn sàng, fps, điểm
packages/thingblock-resource/src/ai-models/                   ← WASM + .task + manifest sha256 + NOTICE
packages/thingblock-resource/src/tutorials/ai-01…ai-06/       ← 6 bài học
```

### 3.2 Luồng dữ liệu

```
webcam ──getUserMedia──▶ camera.js ──ImageBitmap (640×480, ≤30/s)──▶ vision.worker.js
                                                                          │ MediaPipe Tasks
                                                                          ▼
                 playground.jsx ◀── kết quả {t, hands[], gestures[], pose[], face{landmarks, blendshapes}, embedding?}
                       │                                   │
                       │ vẽ overlay + vật thể              ▼
                       │                        vision-state.ts (bản mới nhất, không hàng đợi)
                       │                                   │
                       ▼                                   ▼
                 HUD điểm/đồng hồ        khối VM đọc: báo/đúng-sai trả ngay; mũ kích theo sườn
                                                           │
                                                           ▼
                                        khối Telemetrix ──serial/BLE──▶ ThingBot thật
```

- Worker **không giữ hàng đợi**: khung mới đến khi đang bận thì bỏ, lấy khung kế. Trễ không dồn.
- Mỗi năng lực là một mô hình bật riêng. Chỉ nạp mô hình khi dự án có khối của nhóm đó (quét opcode lúc nạp dự án và khi kéo khối). Tay + tư thế + mặt cùng lúc là trường hợp nặng nhất; bảng Sân chơi hiện fps để học sinh biết.
- Khối báo không bao giờ chờ mô hình: trả giá trị mới nhất, hoặc rỗng khi chưa thấy, như champierre.

### 3.3 Hệ tọa độ

Sân chơi 480×360, gốc ở giữa, x −240…240 (phải là dương khi gương bật), y −180…180 (trên là dương). Mọi khối vị trí trả về hệ này. Camera 640×480 được co về 480×360 giữ tỉ lệ. Chọn hệ Scratch vì học sinh đã quen và các bài trên Scratch chuyển sang được.

### 3.4 Chế độ chạy

| Chế độ | Khối Camera AI | Khối ThingBot |
|---|---|---|
| **Chạy trên máy tính** (nút Chạy ở Sân chơi, VM scratch chạy luồng) | chạy | chạy nếu mạch đang kết nối Telemetrix; nếu không, báo "chưa kết nối" một lần |
| **Mô phỏng** (SimPanel) | không có camera; khối trả rỗng, khối mũ không kích | mô phỏng như hiện nay |
| **Nạp xuống mạch** (sinh .ino) | không sinh mã; cửa sổ mã hiện ghi chú "khối Camera AI chỉ chạy trên máy tính" và nút Nạp cảnh báo một lần | sinh mã như hiện nay |

Nút **Chạy** của Sân chơi chính là cờ xanh của scratch-vm (`runtime.greenFlag()`); nút **Dừng** là `stopAll()` và cũng dừng động cơ ThingBot như `thingbotTelemetrix` đã làm.

### 3.5 Mô hình và đóng gói

| Năng lực | Mô hình MediaPipe Tasks | Kích thước | Ghi chú |
|---|---|---|---|
| Tay + cử chỉ | `gesture_recognizer.task` (gồm hand landmarker) | ~8 MB | 2 tay, 7 cử chỉ sẵn: Closed_Fist, Open_Palm, Pointing_Up, Thumb_Up, Thumb_Down, Victory, ILoveYou |
| Tư thế | `pose_landmarker_lite.task` | 5,5 MB | 33 điểm; đủ cho cổ tay, mũi, cổ chân |
| Mặt | `face_landmarker.task` | ~3,8 MB | 478 điểm + 52 blendshape; dùng blendshape cho cười, há miệng, nhướng mày, nháy mắt |
| Phân loại tự dạy | `mobilenet_v3_small.tflite` (ImageEmbedder) + kNN | ~4 MB | nhúng 1024 chiều; kNN k=3, lưu vector + ảnh nhỏ 48 px trong dự án |
| Vật thể | `efficientdet_lite0.tflite` (ObjectDetector) | 4,5 MB | 80 lớp COCO; giai đoạn 2 |
| Runtime | `@mediapipe/tasks-vision` WASM | ~6 MB | Apache-2.0 |

Tổng ~32 MB, nằm trong `thingblock-resource/src/ai-models/`, phục vụ từ gốc tài nguyên như các gói mở rộng khác. `manifest.json` ghi tên, phiên bản, sha256, giấy phép; `NOTICE` ghi nguồn theo quy ước của mình. Tệp lớn vào git LFS hoặc tải về lúc dựng (`scripts/fetch-ai-models.mjs` kiểm sha256), quyết định ở mục 9.

### 3.6 Hiệu năng

- Mục tiêu trên laptop trường (Intel i3/i5, không GPU rời): **≥ 15 fps** một mô hình ở 640×480, WebGL delegate. Dưới 12 fps thì tự hạ 320×240; vẫn dưới thì bật chế độ "bỏ khung" 1/2 và ghi nhắc ở bảng Sân chơi.
- Suy luận trong **Web Worker** với OffscreenCanvas, giao diện khối không khựng.
- Vẽ sân chơi bằng `requestAnimationFrame` 60 fps, tách khỏi nhịp suy luận; vị trí làm mượt EMA α=0,35 và giữ 150 ms khi mất dấu (kinh nghiệm NeoAiSport).
- Watchdog 3 s như sim: worker treo thì khởi động lại, mô hình nạp lại, bảng hiện "đang khởi động lại".

### 3.7 Quyền camera và riêng tư

- **macOS**: `NSCameraUsageDescription` trong `Info.plist` của thingblock-desktop và entitlement `com.apple.security.device.camera`. **Windows**: WebView2 phát `PermissionRequested`, Tauri cần cho phép loại `camera`. **Linux**: webkit2gtk hay tắt `getUserMedia`; kiểm chứng trong Spike 0, nếu không được thì ghi rõ "Linux chỉ chạy trên trình duyệt Chrome/Firefox".
- Khung hình **không rời máy**. Không ghi hình. Mẫu phân loại lưu dưới dạng vector nhúng và ảnh nhỏ 48 px trong tệp `.tb`; học sinh xoá được từng mẫu.
- Lần đầu bật camera trong một dự án, Sân chơi hiện một dòng "Camera chỉ dùng trên máy này, không lưu hình" và nút Đồng ý.

## 4. Bộ khối

Nhóm **Camera AI** trong cột khối, màu tím `#7C3AED`, biểu tượng camera có ngôi sao. Khối hiện khi bật gói mở rộng Camera AI từ thư viện mở rộng (giống bật Telemetrix). Mỗi hàng: opcode · loại · chữ trên khối (tiếng Việt / tiếng Anh) · tham số.

Quy ước loại: **M** mũ (hat) · **L** lệnh (command) · **B** báo (reporter) · **Đ** đúng/sai (boolean).

### 4.1 Camera

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `cameraOn` | L | bật camera [gương/thường] · turn camera [mirrored/normal] | MODE menu: `mirror` (mặc định), `normal` |
| `cameraOff` | L | tắt camera · turn camera off | — |
| `cameraOpacity` | L | đặt độ mờ camera (%) · set camera opacity to (50)% | OPACITY số 0–100, mặc định 0 |
| `cameraSelect` | L | dùng camera [tên] · use camera [device] | DEVICE menu động liệt kê thiết bị |
| `whenCameraReady` | M | khi camera sẵn sàng · when camera is ready | — |
| `cameraIsOn` | Đ | camera đang bật? · camera on? | — |

### 4.2 Tay và cử chỉ

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `whenGesture` | M | khi tay [1] làm [nắm] · when hand [1] shows [fist] | HAND menu `ANY`,`1`,`2`,`LEFT`,`RIGHT`; GESTURE menu: nắm `FIST`, mở `OPEN`, ngón cái lên `THUMB_UP`, ngón cái xuống `THUMB_DOWN`, chữ V `VICTORY`, chỉ lên `POINT_UP`, yêu `I_LOVE_YOU` (giá trị báo của `handGesture` là bản chữ thường) |
| `whenWave` | M | khi tay vẫy sang [trái] · when hand waves [left] | DIR menu: trái, phải, lên, xuống |
| `handCount` | B | số bàn tay · hand count | — |
| `handX` | B | x [cổ tay] tay [1] · x of [wrist] hand [1] | PART menu: cổ tay `wrist`, đầu ngón cái `thumbTip`, đầu ngón trỏ `indexTip`, đầu ngón giữa `middleTip`, lòng bàn tay `palm`; HAND `1`,`2` |
| `handY` | B | y [cổ tay] tay [1] | như trên |
| `handGesture` | B | cử chỉ tay [1] · gesture of hand [1] | HAND; trả tên cử chỉ tiếng Việt hoặc rỗng |
| `handIsGesture` | Đ | tay [1] đang [nắm]? · hand [1] is [fist]? | HAND, GESTURE |
| `handOpenness` | B | độ mở tay [1] (%) · openness of hand [1] | HAND; 0 nắm chặt … 100 xoè hết, để làm thanh lực |
| `handSide` | B | tay [1] là tay [trái/phải] · handedness | HAND; trả "trái"/"phải" |

Tay 1 là tay ở **bên trái sân chơi** (sau khi gương), tay 2 bên phải; ổn định danh tính bằng ghép điểm gần nhất giữa hai khung (bài học từ NeoAiSport).

### 4.3 Tư thế

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `whenPose` | M | khi người [1] đứng tư thế [chữ T] · when person [1] holds pose [T] | PERSON `1`,`2`; POSE menu: chữ T, cây, sao, chữ Y, xương rồng, tay lên cao, ngồi xổm |
| `poseX` | B | x [mũi] người [1] · x of [nose] of person [1] | PART menu 17 bộ phận như PoseNet: mũi, mắt T/P, tai T/P, vai T/P, khuỷu T/P, cổ tay T/P, hông T/P, gối T/P, cổ chân T/P; PERSON |
| `poseY` | B | y [mũi] người [1] | như trên |
| `personCount` | B | số người · people count | — |
| `jointAngle` | B | góc [khuỷu trái] người [1] · angle of [left elbow] | JOINT menu: khuỷu T/P, vai T/P, hông T/P, gối T/P; độ 0–180 |
| `poseMatch` | B | độ giống tư thế [chữ T] (%) · match with pose [T] | POSE; so góc khớp như Yoga Robot |
| `isPose` | Đ | người [1] đang tư thế [chữ T]? | PERSON, POSE; ngưỡng 80 % |

Mô hình tư thế một người; "người 2" dùng mẹo chia đôi khung: chạy mô hình trên nửa trái và nửa phải khi dự án dùng `người 2` (gấp đôi chi phí, bảng hiện cảnh báo fps).

### 4.4 Khuôn mặt và biểu cảm

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `whenExpression` | M | khi mặt [cười] · when face [smiles] | EXPR menu: cười `smile`, há miệng `mouthOpen`, nhướng mày `browUp`, nháy mắt trái `blinkL`, nháy mắt phải `blinkR`, chu môi `pucker` |
| `whenHeadTilt` | M | khi nghiêng đầu sang [trái] · when head tilts [left] | DIR trái/phải; ngưỡng 15° |
| `faceCount` | B | số khuôn mặt · face count | — |
| `faceX` | B | x [mũi] mặt [1] · x of [nose] of face [1] | PART menu: mũi, cằm, trán, mắt T/P, khóe miệng T/P, giữa môi trên, giữa môi dưới, má T/P; FACE `1`,`2` |
| `faceY` | B | y [mũi] mặt [1] | như trên |
| `faceSize` | B | cỡ mặt [1] (%) · face size | FACE; bề rộng mặt so với sân, để đo xa gần |
| `headTilt` | B | độ nghiêng đầu [1] · head tilt | FACE; độ, âm trái dương phải |
| `expressionLevel` | B | mức [cười] mặt [1] (%) · level of [smile] | EXPR, FACE; blendshape 0–100 |
| `isExpression` | Đ | mặt [1] đang [cười]? | FACE, EXPR; ngưỡng 50 % |

Không có khối tên người, không có khối so khớp mặt. Mặt 1 bên trái sân, mặt 2 bên phải.

### 4.5 Phân loại ảnh tự dạy

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `addSample` | L | thêm mẫu vào lớp [A] · add sample to class [A] | CLASS menu động (lớp trong dự án) + "lớp mới…" |
| `clearClass` | L | xoá mẫu lớp [A] · clear class [A] | CLASS |
| `sampleCount` | B | số mẫu lớp [A] · samples in class [A] | CLASS |
| `whenClass` | M | khi thấy lớp [A] · when class [A] is seen | CLASS |
| `currentClass` | B | lớp đang thấy · current class | — ; rỗng khi dưới ngưỡng |
| `classConfidence` | B | độ tin lớp [A] (%) · confidence of class [A] | CLASS |
| `setConfidence` | L | đặt ngưỡng tin cậy (%) · set confidence threshold | 0–100, mặc định 60 |
| `setClassifyInterval` | L | phân loại mỗi (0,5) giây · classify every (0.5) seconds | ≥ 0,1 |
| `classifyRegion` | L | phân loại vùng [cả khung/giữa/tay 1] · classify [whole frame/center/hand 1] | REGION; "tay 1" cắt ô quanh bàn tay |

Bảng Sân chơi có **thẻ Dạy máy**: ô mỗi lớp, nút chụp giữ-để-chụp-liên-tục, số mẫu, ảnh nhỏ, nút xoá từng mẫu. Khối `addSample` để làm nút chụp bằng cử chỉ hoặc nút SW trên ThingBot.

Giai đoạn 2: `loadTeachableMachine [URL/tệp]` nhập mô hình Teachable Machine, khối `whenClass` dùng chung.

### 4.6 Vật thể (giai đoạn 2)

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `whenObject` | M | khi thấy [quả bóng] · when [sports ball] is seen | OBJECT menu rút gọn 20 lớp COCO: người, bóng, cốc, chai, sách, điện thoại, ghế, mèo, chó… |
| `objectX` / `objectY` | B | x/y [quả bóng] | OBJECT |
| `objectCount` | B | số [quả bóng] | OBJECT |
| `isObject` | Đ | có [quả bóng]? | OBJECT |

### 4.7 Sân chơi

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `spawn` | L | tạo vật [bóng] tên [b1] tại x (0) y (100) cỡ (40) · spawn [ball] named [b1] at | KIND menu: bóng, rổ, Dế, ngôi sao, giọt mưa, hộp, chữ; NAME; X; Y; SIZE |
| `moveTo` | L | đưa [b1] tới x () y () · move [b1] to | NAME, X, Y |
| `setVelocity` | L | cho [b1] vận tốc x () y () · set velocity | NAME, VX, VY (đơn vị/giây) |
| `setGravity` | L | trọng lực (300) · set gravity | G, 0 tắt |
| `remove` | L | xoá vật [b1] · remove [b1] | NAME |
| `removeAll` | L | xoá hết vật · remove all | — |
| `objX` / `objY` | B | x/y của [b1] | NAME |
| `touching` | Đ | [b1] chạm [tay 1 / b2 / mép dưới]? · [b1] touches [hand 1]? | NAME, TARGET menu: tay 1, tay 2, mũi, cổ tay T/P, cổ chân T/P, mặt 1, vật tên…, mép trên/dưới/trái/phải |
| `whenTouching` | M | khi [b1] chạm [tay 1] · when [b1] touches [hand 1] | NAME, TARGET |
| `say` | L | hiện chữ [Giỏi!] tại x () y () trong (1) giây · show text | TEXT, X, Y, SECS |
| `drawTrail` | L | vẽ vệt theo [tay 1] màu [#] · draw trail | TARGET, COLOR; bật/tắt |
| `showSkeleton` | L | hiện khung xương [bật/tắt] · show skeleton | ON/OFF; dạy "máy thấy gì" |

Vật thể là ảnh SVG/emoji trong thư viện nhỏ của gói, không phải sprite Scratch. Va chạm tròn, trọng lực đơn giản, đủ cho Bắt Dế, Hứng Mưa, Đỡ Bóng, Ball Dế.

### 4.8 Điểm, người chơi và đồng hồ

| opcode | Loại | Khối | Tham số |
|---|---|---|---|
| `setPlayers` | L | chơi [1/2] người · play with [1/2] players | N; 2 người chia sân trái/phải |
| `addScore` | L | cộng (1) điểm cho người [1] · add (1) point to player [1] | POINTS, PLAYER `1`,`2` |
| `setScore` | L | đặt điểm người [1] = (0) | PLAYER, SCORE |
| `score` | B | điểm người [1] · score of player [1] | PLAYER |
| `startTimer` | L | đếm ngược (45) giây · start countdown (45) s | SECS |
| `timeLeft` | B | thời gian còn (giây) · time left | — |
| `whenTimeUp` | M | khi hết giờ · when time is up | — |
| `showScoreboard` | L | hiện bảng điểm [tên game] · show scoreboard | GAME tên; ghi điểm cao vào bảng của máy |
| `playerName` | B | tên người [1] · name of player [1] | PLAYER; nhập ở bảng Sân chơi trước khi chơi |

Bảng điểm lưu `localStorage` theo tên game: 10 điểm cao nhất, tên người, ngày; nút xuất CSV. Không lưu ảnh.

### 4.9 Toolbox

Thứ tự trong nhóm: Camera → Tay → Tư thế → Mặt → Dạy máy → Sân chơi → Điểm, mỗi mục có nhãn phân cách `---`. Khối mũ đứng đầu mỗi mục. Giá trị mặc định: tay 1, người 1, mặt 1, cử chỉ nắm, tư thế chữ T, biểu cảm cười, vật "bóng" tên "b1" tại (0, 100) cỡ 40.

### 4.10 Ví dụ chương trình

Lái ThingBot bằng tay:

```
khi camera sẵn sàng
    bật camera gương
khi tay 1 làm mở        → động cơ M1, M2 tiến 50%
khi tay 1 làm nắm       → dừng động cơ
khi tay vẫy sang trái   → rẽ trái 0,5 giây
khi tay 1 làm ngón cái lên → còi kêu nốt C5 0,2 giây
```

Bắt Dế (SOLO 45 s):

```
khi camera sẵn sàng
    bật camera gương; chơi 1 người; đếm ngược 45 giây
    lặp mãi: đợi 1 giây; tạo vật Dế tên nối("de", số ngẫu nhiên) tại x ngẫu nhiên y 150 cỡ 40
    cho vật vận tốc y −120
khi vật [de*] chạm tay 1 → xoá vật; cộng 1 điểm cho người 1; hiện chữ "+1"
khi hết giờ → hiện bảng điểm "Bắt Dế"
```

## 5. Bài học mẫu

Định dạng như `tutorials/*/bai.vi.md` hiện có, thêm `thiet-bi: camera` (và `thingbot` khi cần mạch). Bộ chấm chạy trên **tệp phát lại** landmark (`kiem-thu/*.replay.json`) để kết quả lặp lại được, không cần camera lúc chấm.

| Mã | Tên | Năng lực | Mạch | Gốc |
|---|---|---|---|---|
| ai-01 | Vẫy tay bật đèn | cử chỉ | ThingBot L1 | mới |
| ai-02 | Lái xe bằng tay | cử chỉ + vẫy | ThingBot M1–M4 | mới |
| ai-03 | Bắt Dế | tay + sân chơi + điểm | không | NeoAiSport |
| ai-04 | Hứng Mưa | tư thế (mũi) + sân chơi | không | NeoAiSport |
| ai-05 | Mặt cười mở cửa | biểu cảm | ThingBot servo S1 | mới |
| ai-06 | Phân loại rác | dạy máy 3 lớp | ThingBot servo S1 | mới |

Luật chấm mới cho `checker/rules.ts`: `cử chỉ [X] → [hành động]` (phát lại cử chỉ, chờ pin/điểm đổi), `điểm người 1 ≥ n sau phát lại`, `lớp [A] có ≥ 10 mẫu`.

## 6. Kiểm thử

- **Thuần, không camera**: chuyển đổi tọa độ; ánh xạ 7 cử chỉ và hướng vẫy (zero-crossing cổ tay, kinh nghiệm NeoMakerViGate); góc khớp và so tư thế; kNN; va chạm; đồng hồ; bảng điểm. Mỗi test phải được chứng minh fail trước khi viết mã.
- **Giao thức worker**: gửi khung giả, nhận kết quả, bỏ khung khi bận, watchdog khởi động lại.
- **Phát lại**: 5 tệp landmark ghi từ Mac (vẫy, nắm/mở, chữ T, cười, hai tay), dùng cho test tích hợp và cho bộ chấm bài.
- **Hiệu năng**: `scripts/bench-vision.mjs` in fps từng mô hình ở 640×480 và 320×240; chạy trên Mac M, một laptop Windows i5 không GPU rời, một máy Linux.
- **Tay**: danh sách kiểm 3 hệ điều hành trong app Tauri thật: xin quyền, bật/tắt, đổi camera, treo worker, nạp xuống mạch có khối AI.

## 7. Lộ trình

| Mốc | Nội dung | Cổng ra |
|---|---|---|
| **Spike 0** (2–3 ngày) | camera trong app Tauri trên 3 hệ; GestureRecognizer + PoseLandmarker trong worker; đo fps; 1 khối `khi tay làm nắm` bật L1 trên ThingBot thật | bảng fps 3 máy; quyết định có/không hỗ trợ Linux |
| **M1** (2 tuần) | Camera + Tay/cử chỉ + Sân chơi + Điểm; bài ai-01, ai-02, ai-03; đóng gói mô hình; NOTICE | 3 bài chạy trên Mac + Windows, test xanh |
| **M2** (2 tuần) | Tư thế + Mặt + Dạy máy; bài ai-04, ai-05, ai-06; bảng điểm lưu/xuất | 6 bài, danh sách kiểm 3 hệ |
| **M3** (1 tuần) | Vật thể COCO, nhập Teachable Machine, 2 người | phát hành 0.7 |

## 8. Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| getUserMedia trong WebView Tauri (Linux webkit2gtk, Windows WebView2 quyền) | cao | Spike 0 làm đầu tiên; Linux có thể chỉ hỗ trợ trên trình duyệt |
| fps thấp trên laptop trường | vừa | hạ độ phân giải, bỏ khung, hiện fps; chỉ nạp mô hình dự án cần |
| gói cài tăng ~32 MB | thấp | chấp nhận; tệp mô hình tải lúc dựng, kiểm sha256 |
| Hai người với mô hình tư thế một người | vừa | chia đôi khung; nếu không đủ nhanh thì M3 chỉ hỗ trợ 2 người bằng tay |
| `develop` và `main` của editor đã tách (sim ở `develop`, link API mới #59 ở `main`) | cao cho mốc M1 | ghép `main` vào `develop` trước khi bắt đầu M1 vì khối Telemetrix dùng link API mới |

## 9. Quyết định cần anh Tuấn / Vinh chốt

1. Hệ tọa độ sân chơi: Scratch (gốc giữa, −240…240) như đề xuất, hay góc trên-trái như OLED?
2. Tệp mô hình: git LFS trong `thingblock-resource`, hay tải lúc dựng từ release GitHub của ThingEdu?
3. Linux: nếu Spike 0 cho thấy webkit2gtk không mở được camera, chấp nhận "Linux chỉ qua trình duyệt" hay dừng hỗ trợ Linux cho gói này?
4. Có cần khối "nhận dạng danh tính" không? Đề xuất **không**, xem mục 1.

## 10. Nguồn

- MediaPipe Tasks Vision, Apache-2.0: https://github.com/google-ai-edge/mediapipe — GestureRecognizer, PoseLandmarker, FaceLandmarker, ImageEmbedder, ObjectDetector
- Scratch Video Sensing: https://en.scratch-wiki.info/wiki/Video_Sensing_Extension
- champierre: ML2Scratch, PoseNet2Scratch, Handpose2Scratch, Facemesh2Scratch, TM2Scratch — https://github.com/champierre
- MIT App Inventor extensions: PosenetExtension, FaceMeshExtension, PersonalImageClassifier — https://github.com/mit-cml/appinventor-extensions
- NeoAiSport (ThingEdu, MIT): https://github.com/ThingEdu/NeoAiSport — số đo NEO One, luật game Bắt Dế / Hứng Mưa / Đỡ Bóng / Ball Dế, ổn định danh tính tay
- NeoMakerViGate (MIT): https://github.com/tuanln/NeoMakerViGate — vẫy tay zero-crossing, so tư thế bằng góc khớp

## 11. Trạng thái Spike 0 / bản demo (10/11/2026)

Nhánh `feat/camera-ai-demo` (tách từ `docs/camera-ai-design` ← `origin/develop`). Đã chạy được end-to-end trong trình duyệt bằng Chromium + camera giả (ảnh cử chỉ mẫu của MediaPipe), kiểm bằng Playwright:

- VM: extension builtin `cameraAi` (`packages/thingblock-vm/src/extensions/scratch3_camera_ai/`: `index.ts`, `vision-state.ts`, `playground.ts`), 26 khối: Camera 4 · Tay 6 · Sân chơi 8 · Điểm 7. 9 test tap (`test/unit/extension_camera_ai.ts`).
- GUI: bảng **Sân chơi** (`containers/playground-panel.jsx`, `components/playground-panel/`) hiện khi extension được thêm; camera + GestureRecognizer chạy ở **luồng chính** (`lib/vision/hand-tracker.js`, GPU → CPU fallback) chứ chưa đưa vào Web Worker như §3.2 đề xuất — việc của M1. Mô hình tải bằng `scripts/fetch-ai-models.sh`, WASM chép qua webpack.
- Ví dụ "Bắt Dế": `docs/specs/camera-ai-demo/bat-de.tb` (bóng theo ngón trỏ, chạm dế +1 điểm, đếm ngược 30 s, nắm tay thì dế nhảy). Chưa đưa vào `examples/index.json` vì bộ sinh ví dụ (`scripts/examples/dsl.mjs`) chưa biết khối extension.
- Chưa làm: Tư thế, Mặt, Dạy máy, Vật thể, worker + watchdog, tệp phát lại, bài học, Tauri (quyền camera 3 hệ), đo fps trên laptop trường.

### Gợi ý ví dụ từ Day of AI / App Inventor (khảo sát 10/11)

Day of AI (MIT RAISE) không có bài dùng camera theo dõi thân/mặt/tay (chỉ Teachable Machine phân loại ảnh). Mẫu dùng được nằm ở MIT App Inventor và MIT Media Lab:

| Ví dụ | Nguồn | Tín hiệu | Cần khối ThingBlock |
|---|---|---|---|
| Bóng rổ bằng mũi (bóng dính mũi, đưa vào rổ; há miệng xoá vết) | App Inventor FaceExtension, forum `p299D_baloncestoFace.aia` | `faceX/faceY mũi`, `whenExpression mouthOpen` | §4.4 Mặt (M2) |
| Dẫn bóng qua chữ BRAVO | App Inventor, `p299D_letrasFace.aia` | mũi + há miệng | §4.4 |
| AI Dance (điểm nhảy: tay lên trời, gối lên, T-pose) | YR Toolkit `aidance.html`, PosenetExtension | so toạ độ cổ tay/tai/gối | §4.3 Tư thế `poseX/poseY`, `whenPose` (M2) |
| Dancing with AI (Scratch + PoseNet: RainbowVolleyball, FingerFoodNinja, CatcherModel, SnakeGame…) | dancingwithai.media.mit.edu | tay/ngón, tư thế | Tay (có), Tư thế (M2) |
| Flappy Bird nhảy thật | không có mẫu chính thức; tự thiết kế | y vai/hông giảm nhanh so với trung bình vài khung | Tư thế + khối `whenJump` (đề xuất thêm vào §4.3) |

Kết luận cho lộ trình: nhóm **Tư thế** và **Mặt** (M2) mở ra hầu hết các ví dụ trên; "Bắt Dế" và "Lái xe bằng tay" là đủ cho M1.


## 12. Đề xuất bộ ví dụ "AI Sport" cho gói Camera AI (10/11/2026)

Tiêu chí chọn: chơi bằng cơ thể, có điểm và đồng hồ, mỗi trò dạy đúng một ý lập trình, dựng được bằng ≤ 15 khối. Nguồn gốc ghi rõ để làm mục Nguồn khi phát hành. Mã ví dụ `sp-xx`, đặt cạnh `ai-xx` trong `examples/index.json`.

### 12.1 Chơi được ngay với nhóm Tay (bản demo)

| Mã | Trò | Cách chơi | Khối chính | Dạy gì | Gốc |
|---|---|---|---|---|---|
| sp-01 | Bắt Dế | ngón trỏ chạm dế, dế nhảy chỗ khác, 30 s | `handX/handY`, `touching`, `addScore`, `startTimer` | vòng lặp + điều kiện | NeoAiSport |
| sp-02 | Hứng Mưa bằng tay | rổ theo cổ tay, giọt rơi từ trên, hứng được +1, rơi đáy −1 | `spawn drop`, biến `y` giảm mỗi khung, `touching basket` | biến, toạ độ | NeoAiSport |
| sp-03 | Đỡ Bóng | bóng rơi theo trọng lực, lòng bàn tay chạm thì bật lên; rớt đáy là thua; tính số lần đỡ | biến `vy`, `moveTo`, `touching palm` | mô phỏng vật lý bằng khối | NeoAiSport |
| sp-04 | Bóng chuyền 2 người | tay trái/phải sân, bóng bay qua lại, chạm tay đổi hướng, rơi bên nào bên đó mất điểm | `HAND left/right`, `addScore PLAYER 1/2` | 2 người chơi, điểm riêng | Dancing with AI RainbowVolleyball |
| sp-05 | Hái sao né bom | sao ⭐ và bom 💣 xuất hiện ngẫu nhiên, lướt ngón trỏ qua sao +1, qua bom −3 | `pick random`, `spawn star/bomb`, `touching indexTip` | ngẫu nhiên, điểm âm | Dancing with AI FingerFoodNinja |
| sp-06 | Oẳn tù tì | máy chọn ngẫu nhiên, đếm 3-2-1, người ra nắm/mở/chữ V, so kết quả | `whenGesture FIST/OPEN/VICTORY`, `handGesture`, `say` | menu cử chỉ, so sánh chuỗi | mới |
| sp-07 | Phản xạ cử chỉ | màn hình hiện tên cử chỉ, làm đúng càng nhanh càng nhiều điểm trong 30 s | `handIsGesture`, `timeLeft`, `addScore` | thời gian, bộ đếm | mới |
| sp-08 | Khúc côn cầu trên không | mỗi người một bàn tay làm vợt, bóng bật tường, vào khung thành đối phương +1 | 2 tay, bật tường bằng đổi dấu `vx`/`vy` | vật lý phản xạ | mới |

Để sp-02/03/04/08 viết gọn, nên thi công sớm ba khối đã có trong §4.7: `setVelocity`, `setGravity`, `whenTouching` (hat), và `touching` nhận mục tiêu mép trên/dưới/trái/phải. Không có ba khối này vẫn dựng được bằng biến, nhưng chương trình dài gấp đôi.

### 12.2 Cần nhóm Tư thế (M2)

| Mã | Trò | Cách chơi | Khối chính | Gốc |
|---|---|---|---|---|
| sp-09 | Flappy nhảy thật | nhảy tại chỗ để chim bay lên, né ống | `whenJump` (mới, §4.3), `poseY hông` | ý anh Tuấn |
| sp-10 | Ball Dế đá penalty | vung cổ chân nhanh = sút, hướng theo chân; thủ môn Dế bay ngẫu nhiên; 5 lượt | `poseX/poseY cổ chân T/P`, tốc độ = hiệu toạ độ 2 khung | NeoAiSport |
| sp-11 | Hứng Mưa bằng đầu | rổ theo mũi, nghiêng người để hứng | `poseX mũi` | NeoAiSport |
| sp-12 | Né chướng ngại | thanh chắn chạy tới: thấp thì nhảy, cao thì ngồi xổm, lệch thì nghiêng trái/phải | `whenJump`, `isPose ngồi xổm`, `poseX vai` | mới |
| sp-13 | Tập thể dục đếm nhịp | đếm squat / jumping jack đúng tư thế, chấm biên độ | `jointAngle gối`, `isPose tay lên cao` | mới |
| sp-14 | AI Dance | nhạc chạy, màn hiện tư thế mẫu, giữ đúng ≥ 1 s được điểm | `poseMatch`, `whenPose` | YR Toolkit AI Dance |

### 12.3 Cần nhóm Mặt (M2)

| Mã | Trò | Cách chơi | Khối chính | Gốc |
|---|---|---|---|---|
| sp-15 | Bóng rổ bằng mũi | bóng dính mũi, đưa vào rổ; há miệng chơi lại | `faceX/faceY mũi`, `whenExpression mouthOpen` | App Inventor FaceExtension |
| sp-16 | Lái xe nghiêng đầu | xe chạy, nghiêng đầu trái/phải để lách, há miệng phanh | `headTilt`, `whenHeadTilt` | mới |
| sp-17 | Thổi nến / cười ghi điểm | mức cười càng cao bóng bay càng nhanh | `expressionLevel smile` | mới |

### 12.4 Ghép ThingBot (sau M2)

| Mã | Trò | Ý tưởng |
|---|---|---|
| sp-18 | Thủ môn ThingBot | người đá (sp-10), xe ThingBot lao sang trái/phải chặn bóng thật trên bàn |
| sp-19 | Đèn phạt việt vị | LED L1 nháy khi người bước qua vạch (x vai vượt ngưỡng) |

### 12.5 Đề xuất thứ tự làm

1. Thi công `setVelocity`, `setGravity`, `whenTouching`, `touching` mép → dựng sp-02, sp-03, sp-04, sp-06 ngay trên bản demo (mỗi trò ≤ 15 khối).
2. M2 Tư thế: thêm `whenJump` và `poseSpeed` (tốc độ bộ phận, đơn vị/giây) để sp-09, sp-10, sp-12 không phải tự tính hiệu toạ độ.
3. Mỗi trò kèm tệp phát lại landmark để bộ chấm chạy không cần camera (§5), và ghi Nguồn (NeoAiSport MIT, Dancing with AI, App Inventor) trong NOTICE.
