#pragma once
#include "core/config.h"
#include "core/protocol.h"
#include "core/pin_state.h"
#include "core/transport.h"
#ifdef BLE_TRANSPORT
// The NimBLE-backed transport is not vendored: it is pinned to an older Arduino core
// generation and panics at BT init on the core ThingBlock compiles with. CoreBLETransport.h
// serves the same protocol on the BLE library the core itself ships.
#else
#include "transport/SerialTransport.h"
#endif
#ifdef THINGBOT_EXTENDED
#include "ThingBotExtended.h"
#endif
