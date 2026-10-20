// Host stand-in for SPI.h: the Adafruit display drivers reference SPI types even when wired over I2C.
#pragma once
#include <cstdint>
#define SPI_MODE0 0
class SPISettings {
 public:
  SPISettings() {}
  SPISettings(uint32_t, uint8_t, uint8_t) {}
};
class SPIClass {
 public:
  void begin() {}
  void beginTransaction(SPISettings) {}
  void endTransaction() {}
  uint8_t transfer(uint8_t b) { return b; }
  void transfer(void *, size_t) {}
};
extern SPIClass SPI;
