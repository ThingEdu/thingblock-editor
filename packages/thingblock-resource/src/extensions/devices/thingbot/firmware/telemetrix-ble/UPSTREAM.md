# Live-mode firmware image: upstream status

> **@lgthevinh — MEO-3 needs updating.** This image is built from
> [MEO-3/thingbot-telemetrix-arduino](https://github.com/MEO-3/thingbot-telemetrix-arduino)
> `a41229a` (tag 3.1) **plus the two patch commits below, which are not upstream yet**. Please
> apply them to MEO-3 (or tell us to open the PR from the fork), then rebuild this image from the
> merge commit and update `source` in `../../manifest.ts`.

| Patch                                                           | Why                                                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| M3 reverse drives PCA9685 channel **6**, not 8                  | `M3_B 8` collides with `SERVO_5 8` in the same header; upload mode uses 6 (#32)                                                     |
| A positive DC speed drives channel **B** (forward = A 0, B PWM) | Upload mode has always done this; the firmware did the opposite, so Live mode and the phone app drove the robot the other way (#31) |

The same changes are already applied to the vendored copy in
`peripheral/phoneControl/libs/ThingBotTelemetrix/`. `test/motorChannels.test.ts` keeps the
generator and the vendored firmware in step; the prebuilt image here is not checked by it.

Build: `pio run -e esp32-c3-devkitm-1-ble`. Two clean builds were byte-identical:
sha256 `2830c7369de1768f5d783cfbc55f088b30186519f9289346f2c06e11681dbcfc` (577 248 bytes).
The bootloader and partition images are unchanged.

## Patch (against MEO-3 `a41229a`)

```diff
From b0112c04c72b2cd44a3332443077906cfdd7bcef Mon Sep 17 00:00:00 2001
From: Le Ngoc Tuan <tuanln@Les-Mac-mini.local>
Date: Tue, 3 Nov 2026 05:49:12 +0700
Subject: [PATCH 1/2] fix: drive M3 reverse on PCA9685 channel 6, not servo
 S5's channel 8

M3_B was defined as channel 8, which is also SERVO_5. Running M3
backwards therefore pulsed servo S5's line, and channel 6 -- the one
wired to M3's second input on ThingBot and used by ThingBlock's upload
mode -- was never driven.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VKJVruj5UoXV3y6NvvDQfP
---
 lib/ThingBotTelemetrixArduino/ThingBotExtended.h | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/lib/ThingBotTelemetrixArduino/ThingBotExtended.h b/lib/ThingBotTelemetrixArduino/ThingBotExtended.h
index 1ec80d4..40866c0 100644
--- a/lib/ThingBotTelemetrixArduino/ThingBotExtended.h
+++ b/lib/ThingBotTelemetrixArduino/ThingBotExtended.h
@@ -29,7 +29,7 @@
 #define M2_A 4
 #define M2_B 5
 #define M3_A 7
-#define M3_B 8
+#define M3_B 6  // channel 8 is SERVO_5
 #define M4_A 1
 #define M4_B 0

--
2.53.0


From af58ad91a09b1def73924fec2fce918bc6ad923a Mon Sep 17 00:00:00 2001
From: Le Ngoc Tuan <tuanln@Les-Mac-mini.local>
Date: Tue, 3 Nov 2026 05:49:12 +0700
Subject: [PATCH 2/2] fix: make a positive DC speed turn motors the same way as
 upload mode

ThingBlock's upload mode generates `motor M forward` as channel A = 0,
channel B = PWM, while this firmware drove channel A for a positive
speed. The same "forward" therefore spun a wheel one way in an uploaded
program and the other way in live mode or from the phone app.

Swap the branches for M1..M4: speed >= 0 holds A at 0 and drives B,
speed < 0 drives A with -speed and holds B at 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VKJVruj5UoXV3y6NvvDQfP
---
 CLAUDE.md                                     |  2 +-
 .../ThingBotExtended.cpp                      | 35 ++++++++++---------
 2 files changed, 20 insertions(+), 17 deletions(-)

diff --git a/CLAUDE.md b/CLAUDE.md
index 583ce3c..7f4ca5c 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -41,7 +41,7 @@ This is Arduino/PlatformIO firmware for an ESP32-C3 that implements a Telemetrix

 **Feature flags** (defined at top of `src/main.cpp`): `THINGBOT_EXTENDED` gates PCA9685 PWM driver code for DC motors (M1–M4), servos (S1–S5), buzzer, and LEDs. Disabling it produces a base Telemetrix-compatible build.

-**PCA9685 pin mapping (THINGBOT_EXTENDED):** Motors use paired A/B PWM channels; direction is controlled by setting one channel to a PWM value and the other to 0. Servos map angle (0–180°) to PCA9685 pulse counts (150–600). `map_speed_to_pwm()` maps 0–100% to 0–4095.
+**PCA9685 pin mapping (THINGBOT_EXTENDED):** Motors use paired A/B PWM channels; direction is controlled by setting one channel to a PWM value and the other to 0. A positive speed (forward) drives channel B and holds A at 0, matching ThingBlock upload mode; M3 uses channels 7 (A) and 6 (B). Servos map angle (0–180°) to PCA9685 pulse counts (150–600). `map_speed_to_pwm()` maps 0–100% to 0–4095.

 **Local libraries:**
 - `lib/Ultrasonic/` — minimal trigger/echo driver; instances are stored per-pin in `ultrasonic_sensors[]` and polled by `read_ultrasonic()` on command or `READ_ULTRASONIC` request.
diff --git a/lib/ThingBotTelemetrixArduino/ThingBotExtended.cpp b/lib/ThingBotTelemetrixArduino/ThingBotExtended.cpp
index 89a6db4..76f376d 100644
--- a/lib/ThingBotTelemetrixArduino/ThingBotExtended.cpp
+++ b/lib/ThingBotTelemetrixArduino/ThingBotExtended.cpp
@@ -40,42 +40,45 @@ void control_dc() {
     int8_t speed;
     motor = command_buffer[0];
     speed = (int8_t)command_buffer[1];
+    // Forward (speed >= 0) drives channel B and holds A low, the same convention ThingBlock's
+    // upload mode generates for `motor M forward`, so a positive speed turns the wheel the same
+    // way in live mode and in an uploaded program.
     // send_debug_info(DC_WRITE, speed);
     switch (motor) {
         case M1:
             if (speed >= 0) {
-                pwm.setPWM(M1_A, 0, map_speed_to_pwm(speed));
-                pwm.setPWM(M1_B, 0, 0);
-            } else {
                 pwm.setPWM(M1_A, 0, 0);
-                pwm.setPWM(M1_B, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M1_B, 0, map_speed_to_pwm(speed));
+            } else {
+                pwm.setPWM(M1_A, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M1_B, 0, 0);
             }
             break;
         case M2:
             if (speed >= 0) {
-                pwm.setPWM(M2_A, 0, map_speed_to_pwm(speed));
-                pwm.setPWM(M2_B, 0, 0);
-            } else {
                 pwm.setPWM(M2_A, 0, 0);
-                pwm.setPWM(M2_B, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M2_B, 0, map_speed_to_pwm(speed));
+            } else {
+                pwm.setPWM(M2_A, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M2_B, 0, 0);
             }
             break;
         case M3:
             if (speed >= 0) {
-                pwm.setPWM(M3_A, 0, map_speed_to_pwm(speed));
-                pwm.setPWM(M3_B, 0, 0);
-            } else {
                 pwm.setPWM(M3_A, 0, 0);
-                pwm.setPWM(M3_B, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M3_B, 0, map_speed_to_pwm(speed));
+            } else {
+                pwm.setPWM(M3_A, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M3_B, 0, 0);
             }
             break;
         case M4:
             if (speed >= 0) {
-                pwm.setPWM(M4_A, 0, map_speed_to_pwm(speed));
-                pwm.setPWM(M4_B, 0, 0);
-            } else {
                 pwm.setPWM(M4_A, 0, 0);
-                pwm.setPWM(M4_B, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M4_B, 0, map_speed_to_pwm(speed));
+            } else {
+                pwm.setPWM(M4_A, 0, map_speed_to_pwm(-speed));
+                pwm.setPWM(M4_B, 0, 0);
             }
             break;
     }
--
2.53.0

```
