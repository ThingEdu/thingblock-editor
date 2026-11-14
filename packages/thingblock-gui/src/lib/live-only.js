/**
 * Live-only editor: a host that sets `globalThis.__THINGBLOCK_LIVE_ONLY__` (the web build for tablets)
 * has no link helper, so nothing is compiled or uploaded. Blocks run in the editor and drive a ThingBot
 * that already has its live firmware, over Web Bluetooth. The editor then offers no board picker and no
 * firmware install, opens with the ThingBot live blocks, and lists only lessons and examples that need
 * no board.
 */
const LIVE_ONLY = Boolean(globalThis.__THINGBLOCK_LIVE_ONLY__);

/** The extension whose blocks drive a ThingBot over Bluetooth in live mode. */
const LIVE_EXTENSION_ID = 'thingbotTelemetrix';

export {LIVE_ONLY, LIVE_EXTENSION_ID};
