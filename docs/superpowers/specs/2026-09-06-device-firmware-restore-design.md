# Device firmware restore — design

**Status:** approved, not yet implemented
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

Ship `firmware/telemetrix-ble.bin` (~643 KB) and declare it in the manifest. `scripts/copy-assets.mjs`
already copies `libs/` and icons verbatim; firmware images join that list. The pack zip grows by the
image size.

### 3. Link protocol — `thingblock-link`

The existing `upload` request gains an optional `importFile`: a path relative to the resource root.

- **Present** — the helper resolves it through `ResourceRoot` and passes it as arduino-cli's
  `import_file`, which "overrides `sketch_path`/`import_dir`". No compile step runs.
- **Absent** — unchanged: the artifact from the preceding compile is flashed.

`ResourceRoot` already refuses paths escaping the root, with a test (`traversal_outside_the_root_is_refused`).
Reusing `upload` rather than adding a request keeps that guard as the single containment check;
a new request would have to reimplement it.

`fqbn` and `port` come from the request as they do today.

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

## Accepted risks

- **The image is versioned with the resource pack, not the firmware repo.** Rebuilding the firmware
  without rebuilding the pack ships a stale image silently. The `source` commit field makes that
  traceable after the fact; it does not prevent it.
- **Flashing destroys the learner's uploaded program.** The confirm dialog is load-bearing, not
  decoration.
- **A menu item requires the learner to know when to press it.** The moment they actually get stuck
  — scanning and finding no board — stays silent. Adding the same action to the connection modal's
  empty state is a small follow-up if classroom use shows it is needed.
