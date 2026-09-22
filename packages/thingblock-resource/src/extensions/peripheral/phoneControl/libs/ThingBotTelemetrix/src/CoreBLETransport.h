/*
 * THROWAWAY SPIKE — a Transport built on the BLE library the ESP32 core already ships, instead
 * of the vendored NimBLE the Meo3 firmware uses.
 *
 * Why: NimBLE-Arduino is pinned to an IDF generation. Meo3 builds against Arduino core 2.0.17
 * (PlatformIO) with NimBLE 1.4.3; ThingBlock compiles with core 3.3.11, where that version
 * panics at BT init. The core's own BLE library moves with the core, so a pack that uses it
 * cannot fall out of step with whatever core ThingBlock ships, and there is nothing to vendor.
 *
 * Same service and characteristic UUIDs, same framing — so the editor's live-mode transport and
 * any phone app speaking the ThingBlock telemetrix protocol talk to it unchanged.
 */
#pragma once

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include "core/transport.h"

#define TB_SERVICE_UUID "aa700001-8f6a-4e2c-b369-4060e0bb33aa"
#define TB_RX_CHAR_UUID "aa700002-8f6a-4e2c-b369-4060e0bb33aa"
#define TB_TX_CHAR_UUID "aa700003-8f6a-4e2c-b369-4060e0bb33aa"
#define TB_RX_BUF_SIZE 256

class CoreBLETransport : public Transport, public BLEServerCallbacks, public BLECharacteristicCallbacks {
public:
  explicit CoreBLETransport(const char *name) : _name(name) {}

  void begin() {
    BLEDevice::init(_name);
    _server = BLEDevice::createServer();
    _server->setCallbacks(this);

    BLEService *service = _server->createService(TB_SERVICE_UUID);

    BLECharacteristic *rx = service->createCharacteristic(
      TB_RX_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
    rx->setCallbacks(this);

    _tx = service->createCharacteristic(TB_TX_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
    _tx->addDescriptor(new BLE2902());

    service->start();

    BLEAdvertising *adv = BLEDevice::getAdvertising();
    adv->addServiceUUID(TB_SERVICE_UUID);
    adv->setScanResponse(true);
    BLEDevice::startAdvertising();
  }

  // ── Transport ────────────────────────────────────────────────────────────
  bool connected() override {
    return _connected;
  }

  int available() override {
    return (int)((_head - _tail + TB_RX_BUF_SIZE) % TB_RX_BUF_SIZE);
  }

  int read() override {
    if (_head == _tail) return -1;
    uint8_t b = _buf[_tail];
    _tail = (_tail + 1) % TB_RX_BUF_SIZE;
    return b;
  }

  size_t write(const uint8_t *buf, size_t size) override {
    if (!_connected || _tx == nullptr) return 0;
    _tx->setValue(const_cast<uint8_t *>(buf), size);
    _tx->notify();
    return size;
  }

  // ── BLE callbacks ────────────────────────────────────────────────────────
  void onConnect(BLEServer *) override {
    _connected = true;
  }

  void onDisconnect(BLEServer *server) override {
    _connected = false;
    server->startAdvertising();  // let the phone come back without a reset
  }

  void onWrite(BLECharacteristic *characteristic) override {
    String value = characteristic->getValue();
    for (size_t i = 0; i < value.length(); i++) {
      size_t next = (_head + 1) % TB_RX_BUF_SIZE;
      if (next == _tail) break;  // full: drop rather than overwrite unread bytes
      _buf[_head] = (uint8_t)value[i];
      _head = next;
    }
  }

private:
  const char *_name;
  BLEServer *_server = nullptr;
  BLECharacteristic *_tx = nullptr;
  volatile bool _connected = false;

  // Single producer (BLE callback task), single consumer (telemetrix task).
  uint8_t _buf[TB_RX_BUF_SIZE];
  volatile size_t _head = 0;
  volatile size_t _tail = 0;
};
