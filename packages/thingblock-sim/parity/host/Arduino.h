// Host stand-in for the ESP32 Arduino core's Arduino.h: the declarations a ThingBlock sketch and the
// vendored Adafruit libraries use, with the core's own definitions where they decide behaviour
// (min/max/abs from std, the constrain macro, the Print and String classes compiled from the core).
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>

typedef bool boolean;
typedef uint8_t byte;
typedef uint16_t word;

#define HIGH 0x1
#define LOW 0x0
#define INPUT 0x01
#define OUTPUT 0x03
#define INPUT_PULLUP 0x05
#define LSBFIRST 0
#define MSBFIRST 1
#define CHANGE 0x03
#define PI 3.1415926535897932384626433832795
#define constrain(amt, low, high) ((amt) < (low) ? (low) : ((amt) > (high) ? (high) : (amt)))
#define sq(x) ((x) * (x))
#define digitalPinToInterrupt(p) (p)
#ifndef IRAM_ATTR
#define IRAM_ATTR
#endif

using std::abs;
using std::isinf;
using std::isnan;
using std::max;
using std::min;

void pinMode(uint8_t pin, uint8_t mode);
void digitalWrite(uint8_t pin, uint8_t val);
int digitalRead(uint8_t pin);
uint16_t analogRead(uint8_t pin);
void delay(uint32_t ms);
void delayMicroseconds(uint32_t us);
unsigned long millis();
unsigned long micros();
long random(long howbig);
long random(long howsmall, long howbig);
void randomSeed(unsigned long seed);
long map(long x, long in_min, long in_max, long out_min, long out_max);
void yield();
void attachInterrupt(uint8_t pin, void (*isr)(), int mode);

#include "binary.h"
#include "WString.h"
#include "Print.h"
#include "Stream.h"
#include "HardwareSerial.h"

void setup();
void loop();
