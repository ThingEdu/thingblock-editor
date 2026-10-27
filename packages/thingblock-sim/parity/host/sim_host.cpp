// The host side of the parity run: a virtual clock, the event log, and models of the chips on the
// ThingBot's I2C bus, linked under a generated sketch and the real Adafruit libraries. The program
// prints the same event log as the JavaScript simulator (one JSON object per line), so the two can be
// compared entry by entry.
//
// usage: sketch <run-ms> [inputs-file]
//   inputs-file lines: <t_us> <key> <value>, e.g. `200000 gpio3 0`, applied once virtual time reaches t.
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>

#include <cstdio>
#include <map>
#include <string>
#include <vector>

namespace {

uint64_t now_us = 0;
uint64_t end_us = 0;

struct Input {
  uint64_t t;
  std::string key;
  int value;
};
std::vector<Input> pending_inputs;
std::map<std::string, int> inputs;

std::map<std::string, std::string> last_logged;

std::string json_string(const std::string &s) {
  std::string out = "\"";
  for (unsigned char c : s) {
    if (c == '"' || c == '\\') {
      out += '\\';
      out += static_cast<char>(c);
    } else if (c < 0x20) {
      char buf[8];
      snprintf(buf, sizeof buf, "\\u%04x", c);
      out += buf;
    } else {
      out += static_cast<char>(c);
    }
  }
  return out + "\"";
}

void emit(const char *dev, const std::string &key, const std::string &json_value) {
  printf("{\"t\":%llu,\"dev\":\"%s\",\"key\":%s,\"value\":%s}\n", static_cast<unsigned long long>(now_us), dev,
         json_string(key).c_str(), json_value.c_str());
}

// Record a state, skipping a value that repeats the last one for the same device and key.
void record(const char *dev, const std::string &key, const std::string &json_value) {
  std::string slot = std::string(dev) + '\0' + key;
  auto it = last_logged.find(slot);
  if (it != last_logged.end() && it->second == json_value) return;
  last_logged[slot] = json_value;
  emit(dev, key, json_value);
}

void finish() {
  fflush(stdout);
  exit(0);
}

void apply_inputs() {
  for (auto it = pending_inputs.begin(); it != pending_inputs.end();) {
    if (it->t <= now_us) {
      inputs[it->key] = it->value;
      it = pending_inputs.erase(it);
    } else {
      ++it;
    }
  }
}

// Every way the sketch spends time ends here, so a run stops at the requested virtual time even
// inside a loop that never returns from loop().
void advance(uint64_t us) {
  uint64_t target = now_us + us;
  if (target >= end_us) {
    now_us = end_us;
    finish();
  }
  now_us = target;
  apply_inputs();
}

uint32_t fnv1a(const uint8_t *data, size_t size) {
  uint32_t h = 0x811c9dc5u;
  for (size_t i = 0; i < size; i++) {
    h ^= data[i];
    h *= 0x01000193u;
  }
  return h;
}

// PCA9685 at 0x40: a register file with auto-increment. Writing a channel's four LEDn registers
// logs the channel's duty out of 4096, as the simulator does.
struct Pca9685 {
  uint8_t reg[256] = {};
  uint8_t pointer = 0;

  void write(const uint8_t *data, size_t size) {
    if (size == 0) return;
    pointer = data[0];
    for (size_t i = 1; i < size; i++) {
      uint8_t r = pointer++;
      reg[r] = data[i];
      if (r == 0xFE) record("pca9685", "prescale", std::to_string(data[i]));
      if (r >= 0x06 && r <= 0x45 && (r - 0x06) % 4 == 3) log_channel((r - 0x06) / 4);
    }
  }

  void log_channel(int ch) {
    int base = 0x06 + 4 * ch;
    int on = reg[base] | (reg[base + 1] << 8);
    int off = reg[base + 2] | (reg[base + 3] << 8);
    int duty;
    if (on & 4096) duty = 4096;
    else if (off & 4096) duty = 0;
    else duty = ((off & 4095) - (on & 4095) + 4096) % 4096;
    record("pca9685", "ch" + std::to_string(ch), std::to_string(duty));
  }

  size_t read(uint8_t *out, size_t size) {
    for (size_t i = 0; i < size; i++) out[i] = reg[pointer++];
    return size;
  }
};

// SSD1306 at 0x3C in horizontal addressing mode, the mode Adafruit_SSD1306 drives it in. Data bytes
// fill display RAM from the page/column window the last PAGEADDR/COLUMNADDR set; a frame is logged
// when the window has been filled once.
struct Ssd1306 {
  static constexpr int W = 128, PAGES = 8;
  uint8_t ram[W * PAGES] = {};
  int col0 = 0, col1 = W - 1, page0 = 0, page1 = PAGES - 1;
  int col = 0, page = 0;
  size_t written = 0;
  std::vector<uint8_t> pending_args;
  uint8_t pending_cmd = 0;

  void write(const uint8_t *data, size_t size) {
    if (size == 0) return;
    if (data[0] == 0x40) {
      for (size_t i = 1; i < size; i++) put(data[i]);
    } else {
      for (size_t i = 1; i < size; i++) command(data[i]);
    }
  }

  void command(uint8_t b) {
    if (pending_cmd) {
      pending_args.push_back(b);
      if (pending_args.size() == 2) {
        if (pending_cmd == 0x21) {
          col0 = pending_args[0];
          col1 = pending_args[1];
          col = col0;
        } else {
          page0 = pending_args[0] & 7;
          page1 = std::min<int>(pending_args[1], PAGES - 1);
          page = page0;
        }
        written = 0;
        pending_cmd = 0;
        pending_args.clear();
      }
      return;
    }
    if (b == 0x21 || b == 0x22) pending_cmd = b;
  }

  void put(uint8_t b) {
    ram[page * W + col] = b;
    written++;
    if (++col > col1) {
      col = col0;
      if (++page > page1) page = page0;
    }
    size_t window = static_cast<size_t>(col1 - col0 + 1) * (page1 - page0 + 1);
    if (written == window) {
      char hash[16];
      snprintf(hash, sizeof hash, "\"%08x\"", fnv1a(ram, sizeof ram));
      record("oled", "frame", hash);
      written = 0;
    }
  }
};

Pca9685 pca;
Ssd1306 oled_chip;

}  // namespace

// --- Arduino core ---------------------------------------------------------------------------------

// newlib's itoa/utoa, which the core's String uses and the host C library lacks.
extern "C" char *utoa(unsigned value, char *out, int base) {
  char digits[33];
  int n = 0;
  do {
    unsigned d = value % base;
    digits[n++] = static_cast<char>(d < 10 ? '0' + d : 'a' + d - 10);
    value /= base;
  } while (value);
  for (int i = 0; i < n; i++) out[i] = digits[n - 1 - i];
  out[n] = 0;
  return out;
}
extern "C" char *itoa(int value, char *out, int base) {
  if (value < 0 && base == 10) {
    out[0] = '-';
    utoa(0u - static_cast<unsigned>(value), out + 1, base);
    return out;
  }
  return utoa(static_cast<unsigned>(value), out, base);
}


void pinMode(uint8_t, uint8_t) {}
void digitalWrite(uint8_t pin, uint8_t val) { record("gpio", "gpio" + std::to_string(pin), val ? "1" : "0"); }
int digitalRead(uint8_t pin) {
  auto it = inputs.find("gpio" + std::to_string(pin));
  return it == inputs.end() ? 1 : it->second;
}
uint16_t analogRead(uint8_t pin) {
  auto it = inputs.find("adc" + std::to_string(pin));
  return it == inputs.end() ? 0 : it->second;
}
void delay(uint32_t ms) { advance(static_cast<uint64_t>(ms) * 1000); }
void delayMicroseconds(uint32_t us) { advance(us); }
unsigned long millis() { return static_cast<uint32_t>(now_us / 1000); }
unsigned long micros() { return static_cast<uint32_t>(now_us); }
void yield() {}
void attachInterrupt(uint8_t, void (*)(), int) {}

// The simulator's random() is a fixed xorshift32 sequence; the board's is hardware noise. A parity
// test that uses random() therefore compares against this generator, not against the board.
static uint32_t rng_state = 2463534242u;
uint32_t esp_random() {
  rng_state ^= rng_state << 13;
  rng_state ^= rng_state >> 17;
  rng_state ^= rng_state << 5;
  return rng_state;
}
void randomSeed(unsigned long seed) { rng_state = seed ? static_cast<uint32_t>(seed) : 2463534242u; }
long random(long howbig) {
  if (howbig == 0) return 0;
  if (howbig < 0) return random(0, -howbig);
  return esp_random() % static_cast<uint32_t>(howbig);
}
long random(long howsmall, long howbig) {
  if (howsmall >= howbig) return howsmall;
  return random(howbig - howsmall) + howsmall;
}
long map(long x, long in_min, long in_max, long out_min, long out_max) {
  // The ESP32's long is 32 bits; compute in int32 so overflow wraps the same way it does there.
  const int32_t run = static_cast<int32_t>(in_max - in_min);
  if (run == 0) return -1;
  const int32_t rise = static_cast<int32_t>(out_max - out_min);
  const int32_t delta = static_cast<int32_t>(x - in_min);
  return static_cast<int32_t>(static_cast<int32_t>(static_cast<uint32_t>(delta) * static_cast<uint32_t>(rise)) / run + out_min);
}

HostSerial Serial;
size_t HostSerial::write(uint8_t c) { return write(&c, 1); }
size_t HostSerial::write(const uint8_t *buffer, size_t size) {
  emit("serial", "out", json_string(std::string(reinterpret_cast<const char *>(buffer), size)));
  return size;
}

SPIClass SPI;

// --- I2C bus --------------------------------------------------------------------------------------

TwoWire Wire;

bool TwoWire::setClock(uint32_t hz) {
  clock_ = hz;
  return true;
}
void TwoWire::beginTransmission(uint16_t address) {
  address_ = address;
  txLen_ = 0;
}
size_t TwoWire::write(uint8_t data) {
  if (txLen_ < sizeof tx_) tx_[txLen_++] = data;
  return 1;
}
size_t TwoWire::write(const uint8_t *data, size_t size) {
  for (size_t i = 0; i < size; i++) write(data[i]);
  return size;
}
uint8_t TwoWire::endTransmission(bool) {
  // Address byte plus payload, nine clocks a byte (eight bits and the acknowledge).
  advance((txLen_ + 1) * 9 * 1000000ull / clock_);
  if (address_ == 0x40) pca.write(tx_, txLen_);
  else if (address_ == 0x3C) oled_chip.write(tx_, txLen_);
  else return 2;  // no device acknowledged the address
  return 0;
}
size_t TwoWire::requestFrom(uint16_t address, size_t size, bool) {
  advance((size + 1) * 9 * 1000000ull / clock_);
  rxPos_ = 0;
  rxLen_ = 0;
  if (address == 0x40) rxLen_ = pca.read(rx_, std::min(size, sizeof rx_));
  return rxLen_;
}
int TwoWire::available() { return static_cast<int>(rxLen_ - rxPos_); }
int TwoWire::read() { return rxPos_ < rxLen_ ? rx_[rxPos_++] : -1; }
int TwoWire::peek() { return rxPos_ < rxLen_ ? rx_[rxPos_] : -1; }

// --- Entry point ----------------------------------------------------------------------------------

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s <run-ms> [inputs-file]\n", argv[0]);
    return 2;
  }
  end_us = strtoull(argv[1], nullptr, 10) * 1000;
  if (argc > 2) {
    FILE *f = fopen(argv[2], "r");
    if (!f) {
      perror(argv[2]);
      return 2;
    }
    unsigned long long t;
    char key[64];
    int value;
    while (fscanf(f, "%llu %63s %d", &t, key, &value) == 3) pending_inputs.push_back({t, key, value});
    fclose(f);
  }
  apply_inputs();
  setup();
  // The core's main loop: loop() again and again. Each return costs the simulator's loop-return
  // cost (1 us), so a loop() that only polls still moves time forward.
  for (;;) {
    loop();
    advance(1);
  }
}
