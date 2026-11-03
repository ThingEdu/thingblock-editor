// Host stand-in for Serial: what the sketch prints goes to the event log as `serial/out`.
#pragma once
#include "Stream.h"
class HostSerial : public Stream {
 public:
  void begin(unsigned long) {}
  size_t write(uint8_t c) override;
  size_t write(const uint8_t *buffer, size_t size) override;
  operator bool() const { return true; }
};
extern HostSerial Serial;
