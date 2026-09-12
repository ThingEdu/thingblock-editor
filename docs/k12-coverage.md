# ThingBlock vs the ThingEdu K1–K12 catalogue

What the block library actually covers, checked against
`ThingEdu K1-K12 - Danh muc thiet bi & OpenBlock.xlsx` (120 modules, 42 device codes).

The spreadsheet's "OpenBlock cần bổ sung" sheet states its own status column is a **baseline
assumption**. This document replaces that assumption with the real inventory: every entry below was
read off the pack generators in `packages/thingblock-resource/src/extensions/`, not inferred.

**Headline: 7 of the 23 items the sheet lists as missing already exist in ThingBlock.** The real
blocker for the upper grades is one item, not twenty.

## What the library has today

Read from each pack's `generator.ts` (`forBlock.*`) plus the core Arduino and Scratch generators.

| Pack | Blocks |
| --- | --- |
| `thingbot-core` | init, setMotor, setServo, setServoAngle, moveServoAngle, startServoAngle, waitServos, releaseServo, setLed, switch, buzzer, playNote, setTempo, rest, initPS2 |
| `dht` | init, readTemperature, readHumidity |
| `oled` | init, print, setCursor, setText, clear, refresh, 8 drawing primitives, start/stopScroll |
| `ultrasonic` | readDistance (TRIG/ECHO/unit) |
| `mpu6050` | init, readData, acceleration, gyro, temperature |
| `pca9685` | init, setChannelPWM, setAllChannelPWM, setServoAngle, setAllServoAngle, setPWMFrequency, setToServoMode |
| `ps2` | init, readData, getButton, getJoystick |
| `rgbLedStrip` | init, setPixelColor, fill, color, setBrightness, show, clear |
| `servo` | setangle |
| `serial` | begin, print, println, available, readString, parseInt |
| `viaBanhMi-core` | pwmInit, setMotor, setServo, MPU init/read/acceleration/gyro/temperature |
| core Arduino | pinMode, digitalWrite, digitalRead, analogWrite, analogRead, delay |
| core Scratch | if/else, repeat, repeat_until, while, wait, wait_until, forever, for_each, counters, operators, variables, lists, `sensing_timer` |

## Corrections to the spreadsheet

Seven rows marked "THIẾU — cần bổ sung" are already implemented:

| Sheet row | Code | Reality |
| --- | --- | --- |
| Tone / nốt nhạc (buzzer, loa) — P1 | `SPK` | **Exists.** `thingBotC3_playNote` / `setTempo` / `rest`, note + octave dropdowns (PR #7, open) |
| DHT11/22 — nhiệt độ + độ ẩm — P1 | `DHT` | **Exists.** `dht_init`, `dht_readTemperature`, `dht_readHumidity` |
| Siêu âm HC-SR04 — P1 | `US` | **Exists.** `ultrasonic_readDistance`, cm/inch |
| Đa servo PCA9685 — P2 | `SRV` | **Exists.** Full `pca9685_*` pack |
| Gia tốc MPU6050 — P2 | `ACC` | **Exists.** `mpu6050_*` pack |
| Tay điều khiển không dây — P2 | `RC` | **Exists.** `ps2_*` pack (buttons + both sticks) |
| Bấm giờ / millis — P1 | — | **Partly.** `sensing_timer` returns `millis()/1000.0`; **`sensing_resettimer` is a no-op**, so elapsed time cannot be zeroed. See gap G-9. |

## Real gaps, ranked by how much of K3–K8 they block

K3–K8 is 60 of the 120 modules. Counts below are modules in **K3–K8** that name the device code.

### Blocking whole modules

| # | Gap | Code | K3–K8 modules | Why it blocks |
| --- | --- | --- | --- | --- |
| G-1 | **WiFi + ThingEdges** (connect, send readings, receive commands) | `TE` | 5 | Every K7 ROBOTICS module is an IoT module. Without it K7 cannot be taught from blocks at all. 15 modules across K1–K12 — the single largest dependency in the catalogue. |
| G-2 | **LCD I2C 16×2** (print string/number) | `LCD` | 4 | The catalogue specifies LCD for K5/K6/K7/K8 readouts. OLED substitutes for now (see note), but the kit's listed part has no block. |
| G-3 | **Cảm biến màu TCS34725** (I2C) | `COLOR` | 2 | K3-M7 "Robot theo vạch" and K7-M9 "Cánh tay robot nhà máy" both sort by colour. |
| G-4 | **Dò line nhiều mắt** (2–5 sensors) | `LINE` | 1 | K6-M7 "Xe bám làn". Raw `analogRead` per eye is possible but the lesson needs a line-position reporter. |
| G-5 | **Cảm ứng điện dung** (`touchRead`) | `TOUCH` | 1 | K5-M4 "Đàn piano trái cây" is built on it. ESP32 has the peripheral; only the block is missing. |
| G-6 | **Ma trận LED 8×8** | `LEDM` | 1 | K5-M9 "Bảng tin LED của lớp". |
| G-7 | **Cảm biến từ / hall** | `MAG` | 2 | K8-M3, K8-M6. |
| G-8 | **Cảm biến nước / mực nước** | `WATER` | 1 | K6-M5 "Nước quanh trường (SDG 6)". |

### Usable now, but with raw blocks instead of teachable ones

These do not block a lesson — a teacher can reach them through `analogRead` / `digitalRead` /
`digitalWrite` — but the lesson loses the idea it was meant to teach, because the calibration or
debounce step is hidden in arithmetic instead of named in a block.

| # | Gap | Code | K3–K8 | Workaround today |
| --- | --- | --- | --- | --- |
| G-9 | **Reset the timer** | — | all | `sensing_timer` reads, `sensing_resettimer` does nothing. Lessons that measure an interval must store a start value in a variable and subtract. |
| G-10 | **Nhiệt độ rời** (DS18B20 / NTC, °C) | `TEMP` | 5 | Only via DHT. K4-M4, K5-M6, K6-M3, K7-M1, K7-M6 all want a bare temperature probe. |
| G-11 | **Ẩm đất, hiệu chuẩn % khô–ướt** | `SOIL` | 3 | `analogRead` raw. The lesson is *about* calibration, so a two-point calibration block is the content. |
| G-12 | **Bơm / relay bật-tắt** | `PUMP` | 2 | `digitalWrite` or a motor channel. |
| G-13 | **PIR có chống dội** | `PIR` | 1 | `digitalRead` (used in the K4-M9 sample below). Re-trigger handling is left to the child. |
| G-14 | **Đo điện áp** (hệ số chia) | `VOLT` | 1 | `analogRead` + arithmetic. |
| G-15 | **Khí MQ + ngưỡng cảnh báo** | `GAS` | 1 | `analogRead` raw. |
| G-16 | **Công tắc hành trình** | `LIMIT` | — | `digitalRead`; `thingBotC3_switch` covers the on-board one. |

### Out of scope for block programming

`CAM` (computer vision), `NAI` (edge AI, `.tflite`), `DRONE` — the catalogue already marks these as
outside OpenBlock. K8-M9 "Từ khối lệnh đến Python" is the hand-off point; K9+ is NeoBot/Python.

## Suggested build order

1. **G-1 WiFi + ThingEdges.** Unblocks all of K7 and 15 modules overall. Nothing else comes close.
2. **G-10 temperature, G-11 soil, G-12 pump.** Three small analog/digital packs that together
   complete the K4–K7 "trồng cây / môi trường" thread, which is the catalogue's SDG spine.
3. **G-2 LCD I2C.** Matches the kit's listed part; cheap to add next to the existing OLED pack.
4. **G-9 timer reset.** One block, removes a workaround from every timing lesson.
5. **G-3 colour, G-4 line.** Unblocks the two robot-sorting/ line-following modules.
6. **G-5 touch, G-6 LED matrix, G-7 hall, G-8 water.** One module each.

## Sample programs

`docs/k12-samples/` carries one runnable `.tb` per grade, built only from blocks that exist today.
Each was verified by loading through the real project-load path, generating Arduino C++, and
compiling for `esp32:esp32:esp32c3`.

| File | Module | Uses | Substitution |
| --- | --- | --- | --- |
| `K3-M4-den-giao-thong.tb` | K3-M4 Đèn giao thông ngã tư | LED, wait, repeat | on-board LED1/LED2 for two light clusters |
| `K3-M9-hop-mu-bi-an.tb` | K3-M9 Hộp mù bí ẩn | servo start/wait, note | — |
| `K4-M5-tiet-kiem-dien.tb` | K4-M5 Tiết kiệm điện ở nhà | analogRead, OLED, two thresholds | — |
| `K4-M9-chuong-cua.tb` | K4-M9 Chuông cửa thông minh | digitalRead, music, OLED | `digitalRead` for PIR (G-13) |
| `K5-M7-xe-dieu-khien-tu-xa.tb` | K5-M7 Xe điều khiển từ xa | PS2 sticks, motor mixing | — |
| `K6-M4-tram-khi-tuong.tb` | K6-M4 Trạm khí tượng của em | DHT ×2, OLED, servo, motor, countdown | OLED for LCD (G-2) |
| `K6-M9-cua-sieu-thi.tb` | K6-M9 Cửa siêu thị tự mở | ultrasonic, servo, two thresholds | — |
| `K8-M1-cu-va-cham-an-toan.tb` | K8-M1 Cú va chạm an toàn | MPU6050, sqrt, peak hold | — |

Not sampled, because a gap blocks them: K3-M7 (G-3), K5-M4 (G-5), K5-M9 (G-6, G-2),
K6-M7 (G-4), all four K7 ROBOTICS modules (G-1), K7-M9 (G-3), K8-M4 (G-14).

### A teaching pattern that repeats on purpose

Three samples (K4-M5, K6-M9, K6-M4) use **two thresholds instead of one** — turn on below A, turn
off above B. A single threshold makes the output chatter whenever the reading sits on the line, and
a child sees the lamp or door flutter without understanding why. Meeting the same idea in three
different grades is deliberate.
