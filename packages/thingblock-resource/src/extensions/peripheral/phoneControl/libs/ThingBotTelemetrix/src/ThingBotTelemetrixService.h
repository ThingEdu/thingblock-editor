/*
 * Entry point for running the ThingBot Telemetrix command loop inside a compiled ThingBlock
 * sketch. Starts a BLE peripheral advertising the ThingBot service and services commands on its
 * own FreeRTOS task, so the sketch's own loop — waits and all — keeps running alongside it.
 *
 * Calling this more than once is harmless: only the first call starts the service.
 */
#pragma once

void thingbotPhoneControlBegin(const char *deviceName);
