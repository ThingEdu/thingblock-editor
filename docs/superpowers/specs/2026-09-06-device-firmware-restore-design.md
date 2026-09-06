# Device firmware restore — design

**Status:** approved, implementation in progress
**Spans:** `thingblock-resource` (pack contract + payload) · `thingblock-link` (upload request) · `scratch-vm` (device manager) · `scratch-gui` (menu + confirm)

## The problem

ThingBlock has two planes, and one erases the other.

- **Live plane** — the `scratch3_thingbot_telemetrix` extension drives the board over BLE while the
  program runs on the computer. It needs the Telemetrix firmware resident on the board.
- **Compile plane** — board mode generates Arduino C++, compiles it, and flashes it. That flash
  **overwrites the Telemetrix firmware**.

So the moment a learner uploads their first compiled program, the live plane stops working, and
nothing in the editor says why or offers a way back. Recovering means finding a `.bin` outside the
product and running `esptool` by hand — which no learner and few teachers will do.

## What we are building

A menu item, next to the board selection, that flashes a firmware image the selected board's pack
ships. For ThingBot that image is the BLE Telemetrix build, so the item reads as "switch back to
live mode".

The reverse direction needs nothing: going back to the compile plane is just uploading a program,
which already works.

## Design

### 1. Pack contract — `thingblock-resource/src/shared/types.ts`

`DeviceManifest` gains an optional field:

```ts
/** Prebuilt firmware images this board can be restored to, offered in the editor's board menu. */
firmware?: DeviceFirmware[]

interface DeviceFirmware {
  /** Stable id, unique within the device pack, e.g. `telemetrix-ble`. */
  id: string
  /** Image path relative to the pack root, e.g. `firmware/telemetrix-ble.bin`. */
  path: string
  /** Menu label, localized by the VM through format-message. */
  name: LocalizedMessage
  /** Commit of the firmware repo this image was built from, so a stale image is traceable. */
  source?: string
}
```

Optional and additive: a pack that declares nothing gets no menu entry and is unaffected. An array
rather than a single image, so a board can later offer a serial build alongside the BLE one without
another contract change.

### 2. Pack payload — `devices/thingbot/`

**An ESP32 image is a set of files, not one file.** Tested on hardware: handing arduino-cli a merged
`.bin` through `import_file` fails, because the esp32 platform's upload recipe reads siblings by
name:

```
Invalid value for '<address> <filename>...': [Errno 2] No such file or directory:
'…/full_firmware_ble_patched.bootloader.bin'
```

Supplying the set under the convention arduino-cli expects flashes correctly — also verified on
hardware, end to end:

```
firmware/telemetrix-ble/telemetrix-ble.ino.bin             app image
firmware/telemetrix-ble/telemetrix-ble.ino.bootloader.bin  bootloader
firmware/telemetrix-ble/telemetrix-ble.ino.partitions.bin  partition table
```

`boot_app0.bin` comes from the installed core, not the pack. The manifest's `path` names the app
image; the recipe finds the rest. `scripts/copy-assets.mjs` already copies `libs/` and icons
verbatim; firmware directories join that list. The pack grows by roughly 650 KB.

### 2b. Firmware provenance

The editor's `scratch3_thingbot_telemetrix` extension sends opcodes **101–104** (`DC_WRITE`,
`SERVO_WRITE`, `BUZZER_WRITE`, `LED_WRITE`). Two forks of the firmware exist and they **disagree on
these numbers** — `MEO-3/thingbot-telemetrix-arduino` uses 101–104, while
`tuanln/thingbot-telemetrix-arduino` uses 7–10. Flashing the wrong one leaves a board that answers
the handshake and reports DHT while every motor, servo, LED and buzzer command is silently ignored.

The image set must therefore be built from **`MEO-3/thingbot-telemetrix-arduino`**, with the GPIO8
patch described below applied.

### 3. Link protocol — `thingblock-link`

A new request, `flashFirmware`, rather than a flag on `upload`. Reading the code settled this:
`upload` takes an `Artifact` whose `path` is a **helper-filesystem path**, produced by the preceding
compile and passed straight to arduino-cli with no containment check. The browser cannot name such a
path — it never sees the helper's filesystem — so firmware needs a resource-relative reference, which
is a different shape from what `upload` carries.

```rust
FlashFirmware {
    fqbn: String,
    port: String,
    upload_speed: u32,
    /// Pack directory under the resource root, e.g. `extensions/devices/thingbot`.
    pack: String,
    /// App image within that pack, e.g. `firmware/telemetrix-ble/telemetrix-ble.ino.bin`.
    file: String,
}
```

The two-part `{pack, file}` shape mirrors the existing `LibRef {pack, lib}`, which `compile` already
resolves through `ResourceRoot::resolve_lib_dir`. Containment is a new sibling method,
`resolve_firmware_file`, built the same way: join, canonicalize, and reject anything not under the
root. It reuses the guard rather than reimplementing it, and it does not widen `upload`'s contract.

Both requests then converge on the same `upload_stream`, so cancellation, log streaming and the
terminal reply are shared.

### 4. VM — `scratch-vm/src/virtual-machine/device-manager.js`

`_resourceDevicePacks` already holds each device's manifest and served base. Add:

- a getter listing the selected device's firmware entries (id + localized name), for the GUI;
- `flashDeviceFirmware(id)`, which sends `upload` with `importFile` set to the entry's path,
  resolved relative to the pack, and surfaces the same events an ordinary upload does.

### 5. GUI — `scratch-gui`

A board-menu item, enabled only when the selected board declares firmware. On click:

1. A confirm dialog stating plainly that the program currently on the board will be erased.
2. On confirm, progress through the existing `upload-modal`.
3. Success and failure reported the way an upload is.

## Testing

| Layer | Test |
| - | - |
| `thingblock-resource` | manifest carries the firmware entry; the image is copied into `dist` |
| `thingblock-link` | `upload` with `importFile` flashes the named image; a traversal path is refused |
| `scratch-vm` | `flashDeviceFirmware` sends `upload` with the resolved `importFile` |
| `scratch-gui` | the item is disabled without a declaring board; confirm gates the flash |
| hardware | flash from the menu on a real ThingBot, then scan and connect with the Telemetrix extension |

The hardware check is the one that matters: it closes the loop the feature exists for.

## Open decision: which image ships

The only BLE Telemetrix build known to work on ThingBot hardware is a **locally patched** one. The
released build drives `pinMode(8, OUTPUT)` + `digitalWrite(8, LOW)` in `setup()`, and GPIO8 is the
board's I2C SDA — so the PCA9685 is held low through NimBLE init and **every LED, buzzer, servo and
motor is dead over BLE**, while the handshake and DHT keep working and make the firmware look fine.
The fix (dropping those three lines) is verified on hardware but sits in an unmerged PR on the
firmware repo.

Shipping the patched image inside a public pack means shipping a binary that does not correspond to
any released firmware tag. The alternatives:

1. Land the firmware fix upstream first, tag a release, ship that image. Correct, but blocks this
   feature on another repo's review.
2. Ship the patched image now with its `source` commit recorded, and replace it when the fix lands.
   Unblocks the feature; the traceability field carries the debt.

**Decided: option 2.** The patched image ships now, with its `source` commit recorded in the
manifest, and is replaced once the firmware fix lands upstream. The feature is not held behind
another repo's review; the traceability field carries the debt until then.

## Accepted risks

- **The image is versioned with the resource pack, not the firmware repo.** Rebuilding the firmware
  without rebuilding the pack ships a stale image silently. The `source` commit field makes that
  traceable after the fact; it does not prevent it.
- **Flashing destroys the learner's uploaded program.** The confirm dialog is load-bearing, not
  decoration.
- **A menu item requires the learner to know when to press it.** The moment they actually get stuck
  — scanning and finding no board — stays silent. Adding the same action to the connection modal's
  empty state is a small follow-up if classroom use shows it is needed.
