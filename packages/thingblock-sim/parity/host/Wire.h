// Host stand-in for the core's TwoWire. Bytes the libraries send are not dropped: each transmission is
// handed to a model of the chip at that address (the PCA9685 register file, the SSD1306 display RAM),
// which logs what the hardware would then do. Transfers cost virtual time at the bus clock.
#pragma once
#include <cstddef>
#include <cstdint>
#include "Stream.h"

// The ESP32 core's Wire buffer size, which Adafruit_I2CDevice sizes its chunks by.
#define I2C_BUFFER_LENGTH 128
class TwoWire : public Stream {
 public:
  bool begin() { return true; }
  bool end() { return true; }
  bool begin(int, int, uint32_t = 0) { return true; }
  bool setClock(uint32_t hz);
  uint32_t getClock() { return clock_; }
  void beginTransmission(uint16_t address);
  uint8_t endTransmission(bool sendStop = true);
  size_t requestFrom(uint16_t address, size_t size, bool sendStop = true);
  uint8_t requestFrom(uint8_t address, uint8_t size, uint8_t sendStop) {
    return requestFrom((uint16_t)address, (size_t)size, (bool)sendStop);
  }
  size_t write(uint8_t data) override;
  size_t write(const uint8_t *data, size_t size) override;
  int available() override;
  int read() override;
  int peek() override;
  size_t setBufferSize(size_t) { return 128; }

 private:
  uint32_t clock_ = 100000;
  uint16_t address_ = 0;
  uint8_t tx_[256];
  size_t txLen_ = 0;
  uint8_t rx_[256];
  size_t rxLen_ = 0, rxPos_ = 0;
};
extern TwoWire Wire;
