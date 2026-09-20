/*
 * Runs the ThingBot Telemetrix command loop inside a compiled ThingBlock sketch.
 *
 * Upstream the firmware is a standalone application: its `main.cpp` owns the shared pin state,
 * the command table, and `setup()`/`loop()`. A ThingBlock program already owns setup and loop, so
 * that ownership moves here and the entry point becomes `thingbotPhoneControlBegin()`.
 *
 * The service runs on its own FreeRTOS task. `delay()` on this core is `vTaskDelay`
 * (cores/esp32/esp32-hal-misc.c), which blocks only the calling task and yields the CPU — so the
 * student's `wait` blocks do not stall the phone. Measured on an ESP32-C3: command round-trip
 * stayed at a 57 ms median while the sketch's own loop was sitting in delay(1000).
 */
#include <Arduino.h>

#include "ThingBotTelemetrixArduino.h"
#include "CoreBLETransport.h"
#include "handlers.h"
#include "scan.h"
#include "ThingBotTelemetrixService.h"

#ifdef I2C_ENABLED
#include <Wire.h>
#endif

// Shared state — extern-declared in pin_state.h
byte command_buffer[MAX_COMMAND_LENGTH];
pin_descriptor the_digital_pins[MAX_DIGITAL_PINS_SUPPORTED];
pin_descriptor the_analog_pins[MAX_ANALOG_PINS_SUPPORTED];
dht_sensor dht_sensors[MAX_DIGITAL_PINS_SUPPORTED];
ultrasonic_sensor ultrasonic_sensors[MAX_DIGITAL_PINS_SUPPORTED];

// Active transport — extern-declared in transport.h
Transport *transport = nullptr;

command_descriptor command_table[] = {
  {SERIAL_LOOP_BACK, &serial_loopback},
  {SET_PIN_MODE, &set_pin_mode},
  {DIGITAL_WRITE, &digital_write},
  {DIGITAL_READ, &digital_read},
  {ANALOG_WRITE, &analog_write},
  {ANALOG_READ, &analog_read},
  {ARE_YOU_THERE, &are_you_there},
  {READ_ULTRASONIC, &read_ultrasonic},
#ifdef THINGBOT_EXTENDED
  {DC_WRITE, &control_dc},
  {SERVO_WRITE, &control_servo},
  {BUZZER_WRITE, &control_buzzer},
  {LED_WRITE, &control_led},
#endif
};

void (*lookup_command(byte command))() {
  size_t command_count = sizeof(command_table) / sizeof(command_table[0]);
  for (size_t i = 0; i < command_count; i++) {
    if (command_table[i].command_id == command) {
      return command_table[i].command_func;
    }
  }
  return nullptr;
}

void send_debug_info(byte id, int value) {
  byte debug_buffer[5] = {(byte)4, (byte)DEBUG_REPORT, 0, 0, 0};
  debug_buffer[2] = id;
  debug_buffer[3] = highByte(value);
  debug_buffer[4] = lowByte(value);
  transport->write(debug_buffer, 5);
}

void get_next_command() {
    byte command;
    byte packet_length;
    void (*command_func)();

    if (!transport->connected()) {
        return;
    }

    // clear the command buffer
    memset(command_buffer, 0, sizeof(command_buffer));

    // if there is no command waiting, then return
    if (!transport->available()) {
        return;
    }
    // get the packet length
    packet_length = (byte)transport->read();

    while (!transport->available()) {
        delay(1);
    }

    // get the command byte
    command = (byte)transport->read();

    // send_debug_info(packet_length, command);
    command_func = lookup_command(command);
    if (command_func == nullptr) {
        return;
    }

    if (packet_length > 1) {
        // get the data for that command
        for (int i = 0; i < packet_length - 1; i++) {
        // need this delay or data read is not correct
        while (!transport->available()) {
            delay(1);
        }
        command_buffer[i] = (byte)transport->read();
        // send_debug_info(i, command_buffer[i]);
        }
    }
    // call the command function
    command_func();
}

static void thingbotTelemetrixTask(void *arg) {
  const char *name = (const char *)arg;

  static CoreBLETransport bleTransport(name);
  bleTransport.begin();
  transport = &bleTransport;

  init_pin_structures();
#ifdef THINGBOT_EXTENDED
  // Deliberately not setup_pwm_driver(): the generated sketch already begins the PCA9685 and
  // sets its frequency, and one owner of that driver is the point. Note the standalone
  // firmware picks 60 Hz there while thingbot-core's sketch picks 50 Hz; the sketch wins.
  setup_sw_input();
#endif

  for (;;) {
    current_millis = millis();
    get_next_command();
    scan_digital_inputs();
    scan_analog_inputs();
    scan_dht_inputs();
    vTaskDelay(1);  // one tick, so the sketch's loop task and the idle task still run
  }
}

void thingbotPhoneControlBegin(const char *deviceName) {
  static bool started = false;
  if (started) return;  // placing the block twice must not start two services
  started = true;
  xTaskCreate(thingbotTelemetrixTask, "thingbot-remote", 8192, (void *)deviceName, 1, nullptr);
}
