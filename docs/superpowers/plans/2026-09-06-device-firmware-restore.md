# Device Firmware Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a learner a menu item that reflashes their board's live-mode (Telemetrix) firmware, so switching back from the compile plane stops requiring `esptool` and a `.bin` found outside the product.

**Architecture:** The device pack ships a prebuilt ESP32 image set. A new `flashFirmware` WS request names it as `{pack, file}` — the shape `compile` already uses for vendored libs — and the helper resolves it under its resource root, then drives the same arduino-cli upload stream a normal upload uses. The VM exposes the selected device's firmware list; the GUI offers it behind a confirm dialog.

**Tech Stack:** Rust (axum, tonic, tower-http) in `thingblock-link`; TypeScript + Vitest in `thingblock-resource`; JavaScript + Tap in `scratch-vm`; React + Jest in `scratch-gui`; PlatformIO/arduino-cli for the firmware image.

**Spec:** `docs/superpowers/specs/2026-09-06-device-firmware-restore-design.md`

## Global Constraints

- Two repos, checked out as siblings: `thingblock-link` and `thingblock-editor`.
- `thingblock-link`: Rust edition 2024. `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` must pass.
- `thingblock-editor`: follow each package's existing stack — do not introduce TypeScript into a JS package or Vitest into a Tap package (`AGENTS.md`).
- Conventional Commits, enforced by husky + commitlint.
- The firmware image set must be built from **`MEO-3/thingbot-telemetrix-arduino`** (opcodes 101–104). The fork at `tuanln/thingbot-telemetrix-arduino` uses 7–10 and is the wrong one.
- Two pre-existing failures are not yours: `scratch-vm` `test/integration/clone-cleanup.js` times out and `test/unit/io_mouse.js` has a lint error; `thingblock-link` `platform_api::reports_bundled_platform_installed_with_cors` fails in a fresh clone. Verify against the base branch before chasing any of them.

---

## File Structure

**`thingblock-link`**
- Modify `src/service/resource.rs` — add `resolve_firmware_file`, sibling to `resolve_lib_dir`.
- Modify `src/server/protocol.rs` — add the `FlashFirmware` request variant.
- Modify `src/service/arduino/bridge.rs` — dispatch it into the existing upload stream.
- Modify `tests/resource.rs` — containment tests for the new resolver.
- Modify `tests/upload.rs` — request-level test for `flashFirmware`.

**`thingblock-editor`**
- Modify `packages/thingblock-resource/src/shared/types.ts` — `DeviceFirmware` + the manifest field.
- Modify `packages/thingblock-resource/src/extensions/devices/thingbot/manifest.ts` — declare the image.
- Create `packages/thingblock-resource/src/extensions/devices/thingbot/firmware/telemetrix-ble/` — the image set.
- Modify `packages/thingblock-resource/scripts/copy-assets.mjs` — copy `firmware/` wholesale.
- Modify `packages/thingblock-resource/test/servo.test.ts` — manifest assertions.
- Modify `packages/scratch-vm/src/link/client/link-client.js` — `flashFirmware` sender.
- Modify `packages/scratch-vm/src/virtual-machine/device-manager.js` — firmware list + `flashDeviceFirmware`.
- Modify `packages/scratch-vm/src/virtual-machine/index.js` — delegators.
- Modify `packages/scratch-vm/test/unit/virtual-machine_resource-packs.js` — VM tests.
- Modify `packages/scratch-gui/src/components/menu-bar/board-menu.jsx` + its container — the menu item and confirm.

---

### Task 1: Resolve a firmware file under the resource root

**Repo:** `thingblock-link`

**Files:**
- Modify: `src/service/resource.rs`
- Test: `tests/resource.rs`

**Interfaces:**
- Produces: `ResourceRoot::resolve_firmware_file(&self, pack: &str, file: &str) -> Result<PathBuf>`

- [ ] **Step 1: Write the failing tests**

Append to `tests/resource.rs`:

```rust
#[test]
fn resolve_firmware_file_returns_a_file_inside_the_root() {
    let dir = TempDir::new("thingblock-link-fw").expect("temp dir");
    let pack = dir.path().join("extensions/devices/thingbot/firmware/telemetrix-ble");
    fs::create_dir_all(&pack).expect("create pack dir");
    fs::write(pack.join("telemetrix-ble.ino.bin"), b"\x00\x01").expect("write image");
    let root = ResourceRoot::new(dir.path()).expect("resource root");

    let resolved = root
        .resolve_firmware_file(
            "extensions/devices/thingbot",
            "firmware/telemetrix-ble/telemetrix-ble.ino.bin",
        )
        .expect("firmware should resolve");

    assert!(resolved.is_file(), "resolves to the image file");
    assert!(resolved.starts_with(root.path()), "stays under the root");
}

#[test]
fn resolve_firmware_file_refuses_a_path_escaping_the_root() {
    let dir = TempDir::new("thingblock-link-fw-esc").expect("temp dir");
    fs::create_dir_all(dir.path().join("extensions/devices/thingbot")).expect("create pack dir");
    let root = ResourceRoot::new(dir.path()).expect("resource root");

    let err = root
        .resolve_firmware_file("extensions/devices/thingbot", "../../../../etc/hosts")
        .expect_err("a path leaving the root must be refused");

    assert!(
        err.to_string().contains("escapes the resource root"),
        "error should name the containment failure, got: {err}"
    );
}

#[test]
fn resolve_firmware_file_refuses_a_directory() {
    let dir = TempDir::new("thingblock-link-fw-dir").expect("temp dir");
    let pack = dir.path().join("extensions/devices/thingbot/firmware/telemetrix-ble");
    fs::create_dir_all(&pack).expect("create pack dir");
    let root = ResourceRoot::new(dir.path()).expect("resource root");

    let err = root
        .resolve_firmware_file("extensions/devices/thingbot", "firmware/telemetrix-ble")
        .expect_err("a directory is not an image");

    assert!(err.to_string().contains("is not a file"), "got: {err}");
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test --test resource`
Expected: FAIL — `no method named resolve_firmware_file`.

- [ ] **Step 3: Implement the resolver**

In `src/service/resource.rs`, directly below `resolve_lib_dir`:

```rust
    /// Resolve a prebuilt firmware image a device pack ships, for `flashFirmware`. The same
    /// containment rule as `resolve_lib_dir`: canonicalize, then refuse anything that leaves the
    /// root — the pack and file both come from the browser. Resolves to a file rather than a
    /// directory because arduino-cli's `import_file` names the app image, and reads its siblings
    /// (bootloader, partition table) from the same directory by name.
    pub fn resolve_firmware_file(&self, pack: &str, file: &str) -> Result<PathBuf> {
        let path = self
            .root
            .join(pack)
            .join(file)
            .canonicalize()
            .map_err(|e| Error::Resource(format!("firmware {pack}/{file} is unreadable: {e}")))?;
        if !path.starts_with(&self.root) {
            return Err(Error::Resource(format!(
                "firmware {pack}/{file} escapes the resource root"
            )));
        }
        if !path.is_file() {
            return Err(Error::Resource(format!(
                "firmware {pack}/{file} is not a file"
            )));
        }
        Ok(path)
    }
```

If `ResourceRoot` has no public `path()` accessor, add one returning `&Path`; the static route already needs the root's path, so check before adding a duplicate.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test --test resource && cargo fmt --check && cargo clippy --all-targets -- -D warnings`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/service/resource.rs tests/resource.rs
git commit -m "feat(resource): resolve a pack's prebuilt firmware image"
```

---

### Task 2: The `flashFirmware` request

**Repo:** `thingblock-link`

**Files:**
- Modify: `src/server/protocol.rs` (the `RequestBody` enum, near `Upload`)
- Modify: `src/service/arduino/bridge.rs` (dispatch, near `RequestBody::Upload`)
- Test: `tests/upload.rs`

**Interfaces:**
- Consumes: `ResourceRoot::resolve_firmware_file` from Task 1.
- Produces: WS request `{"type":"flashFirmware","payload":{"fqbn","port","uploadSpeed","pack","file"}}`, replying with the same `log` stream and terminal `result` an `upload` sends.

- [ ] **Step 1: Write the failing test**

Append to `tests/upload.rs`, following the harness already in that file (reuse its session helper rather than writing a new one):

```rust
#[tokio::test]
async fn flash_firmware_refuses_an_image_outside_the_resource_root() {
    let (mut ws, _guard) = connect_session().await;

    let reply = request(
        &mut ws,
        "1",
        "flashFirmware",
        json!({
            "fqbn": "esp32:esp32:esp32c3",
            "port": "/dev/null",
            "uploadSpeed": 921600,
            "pack": "extensions/devices/thingbot",
            "file": "../../../../etc/hosts"
        }),
    )
    .await;

    assert_eq!(reply["type"], "error", "a path leaving the root must be refused");
    assert!(
        reply["payload"]["message"].as_str().unwrap().contains("escapes the resource root"),
        "error should name the containment failure, got: {reply}"
    );
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cargo test --test upload flash_firmware`
Expected: FAIL — the request type is unknown, so the helper replies with a deserialization error rather than the containment message.

- [ ] **Step 3: Add the request variant**

In `src/server/protocol.rs`, after `Upload`:

```rust
    /// Flash a prebuilt firmware image a device pack ships, skipping compile. `pack` and `file` are
    /// resolved under the resource root — the browser cannot name a helper filesystem path, which is
    /// why this does not reuse `upload`'s `Artifact`.
    FlashFirmware {
        fqbn: String,
        port: String,
        upload_speed: u32,
        pack: String,
        file: String,
    },
```

- [ ] **Step 4: Dispatch it into the existing upload stream**

In `src/service/arduino/bridge.rs`, beside the `RequestBody::Upload` arm:

```rust
        // Same pump as `upload`, differing only in where the image comes from: the resource root
        // rather than the artifact a compile just produced.
        RequestBody::FlashFirmware {
            fqbn,
            port,
            upload_speed,
            pack,
            file,
        } => {
            let path = session.resource_root().resolve_firmware_file(&pack, &file)?;
            let artifact = Artifact {
                format: "bin".into(),
                path: path.to_string_lossy().into_owned(),
                data: None,
                parts: Vec::new(),
            };

            let in_flight = session.in_flight();
            let token = CancellationToken::new();
            in_flight
                .lock()
                .expect("in_flight mutex")
                .insert(id.to_string(), token.clone());
            debug!(id, %fqbn, %port, %pack, %file, "flashFirmware: spawning");

            tokio::spawn(run_upload(
                session.daemon(),
                responder.clone(),
                in_flight,
                token,
                fqbn,
                port,
                upload_speed,
                artifact,
            ));
        }
```

Resolution happens on the read loop, before spawning, so a bad path returns an error synchronously rather than through the streaming terminal.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cargo test && cargo fmt --check && cargo clippy --all-targets -- -D warnings`
Expected: the new test PASSes; only the pre-existing `platform_api` failure remains.

- [ ] **Step 6: Document the request**

Add a row to the README's WebSocket protocol reference table, matching the surrounding style, and describe the payload fields.

- [ ] **Step 7: Commit**

```bash
git add src/server/protocol.rs src/service/arduino/bridge.rs tests/upload.rs README.md
git commit -m "feat(server): add flashFirmware for pack-shipped images"
```

---

### Task 3: Pack contract — declare a device's firmware

**Repo:** `thingblock-editor`

**Files:**
- Modify: `packages/thingblock-resource/src/shared/types.ts`
- Modify: `packages/thingblock-resource/src/extensions/devices/thingbot/manifest.ts`
- Test: `packages/thingblock-resource/test/servo.test.ts`

**Interfaces:**
- Produces: `DeviceFirmware {id, path, name, source?}` and `DeviceManifest.firmware?: DeviceFirmware[]`.

- [ ] **Step 1: Write the failing test**

In `test/servo.test.ts`, inside the `manifests` describe block:

```ts
  it('thingbot declares the live-mode firmware image its pack ships', () => {
    const firmware = thingbotManifest.firmware ?? []
    expect(firmware).toHaveLength(1)
    expect(firmware[0].id).toBe('telemetrix-ble')
    expect(firmware[0].path).toBe('firmware/telemetrix-ble/telemetrix-ble.ino.bin')
    expect(firmware[0].name.id).toBe('device.thingbot.firmware.telemetrixBle')
    // The image must be traceable to the firmware commit it was built from; a pack rebuilt without
    // rebuilding the firmware would otherwise ship a stale binary invisibly.
    expect(firmware[0].source).toMatch(/^[0-9a-f]{7,40}$/)
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run test/servo.test.ts -t "live-mode firmware"` from `packages/thingblock-resource`
Expected: FAIL — `firmware` is undefined, so the length assertion fails.

- [ ] **Step 3: Extend the contract**

In `src/shared/types.ts`, above `DeviceManifest`:

```ts
/** A prebuilt firmware image a device pack ships, offered in the editor as a restore target. */
export interface DeviceFirmware {
  /** Stable id, unique within the pack, e.g. `telemetrix-ble`. */
  id: string
  /**
   * The app image, relative to the pack root. An ESP32 image is a set: arduino-cli reads the
   * bootloader and partition table from siblings named after this file, so the whole directory
   * ships together and only the app image is named here.
   */
  path: string
  /** Menu label; the VM resolves it via `format-message`. */
  name: LocalizedMessage
  /** Commit of the firmware repo this image was built from, so a stale image is traceable. */
  source?: string
}
```

and inside `DeviceManifest`:

```ts
  /** Prebuilt firmware images this board can be restored to. Absent means the editor offers none. */
  firmware?: DeviceFirmware[]
```

- [ ] **Step 4: Declare it on ThingBot**

In `src/extensions/devices/thingbot/manifest.ts`, inside the manifest object:

```ts
  firmware: [
    {
      id: 'telemetrix-ble',
      path: 'firmware/telemetrix-ble/telemetrix-ble.ino.bin',
      name: {
        id: 'device.thingbot.firmware.telemetrixBle',
        default: 'Live mode (Telemetrix over BLE)',
        description: 'Name of the ThingBot live-mode firmware image',
      },
      source: 'REPLACE_WITH_COMMIT_FROM_TASK_5',
    },
  ],
```

The `source` value is filled in by Task 5, which builds the image and knows the commit. Leave the literal in place until then; Task 5's step list includes replacing it.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test --workspace=packages/thingblock-resource`
Expected: the manifest test PASSes except the `source` pattern, which stays failing until Task 5. Note that in the commit message; do not weaken the assertion to make it green.

- [ ] **Step 6: Commit**

```bash
git add packages/thingblock-resource/src packages/thingblock-resource/test
git commit -m "feat(thingblock-resource): let a device pack declare firmware images"
```

---

### Task 4: Ship the image set in the built pack

**Repo:** `thingblock-editor`

**Files:**
- Modify: `packages/thingblock-resource/scripts/copy-assets.mjs`
- Test: `packages/thingblock-resource/test/copy-assets.test.ts` (create)

**Interfaces:**
- Consumes: the manifest field from Task 3.
- Produces: `dist/thingblock-resource/extensions/devices/thingbot/firmware/**` copied verbatim.

- [ ] **Step 1: Write the failing test**

Create `test/copy-assets.test.ts`. Import the copy walker rather than shelling out; if `copy-assets.mjs` has no exported function, export `copyRawAssets` from it first (a one-line change, still Task 4).

```ts
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { copyRawAssets } from '../scripts/copy-assets.mjs'

describe('pack asset copying', () => {
  it('copies a firmware directory wholesale, not just images and libs', () => {
    const src = mkdtempSync(join(tmpdir(), 'pack-src-'))
    const out = mkdtempSync(join(tmpdir(), 'pack-out-'))
    mkdirSync(join(src, 'firmware', 'telemetrix-ble'), { recursive: true })
    writeFileSync(join(src, 'firmware', 'telemetrix-ble', 'telemetrix-ble.ino.bin'), 'app')
    writeFileSync(join(src, 'firmware', 'telemetrix-ble', 'telemetrix-ble.ino.bootloader.bin'), 'boot')

    copyRawAssets(src, src, out)

    expect(existsSync(join(out, 'firmware/telemetrix-ble/telemetrix-ble.ino.bin'))).toBe(true)
    // The bootloader has no image or lib extension; a rule that only matches those would drop it,
    // and the board would fail to flash with a missing-sibling error from esptool.
    expect(existsSync(join(out, 'firmware/telemetrix-ble/telemetrix-ble.ino.bootloader.bin'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run test/copy-assets.test.ts`
Expected: FAIL — the bootloader assertion is false, because the walker copies only `libs/` directories and `.svg`/`.png` files.

- [ ] **Step 3: Copy firmware directories wholesale**

In `scripts/copy-assets.mjs`, change the directory branch so `firmware` is treated like `libs`:

```js
    if (entry.isDirectory()) {
      // `libs/` and `firmware/` are copied whole: their contents are opaque payloads (C++ sources,
      // ESP image sets) whose file extensions carry no meaning to this script.
      if (entry.name === 'libs' || entry.name === 'firmware') {
        mkdirSync(dirname(target), { recursive: true })
        cpSync(source, target, { recursive: true })
      } else {
        copyRawAssets(root, source, out)
      }
      continue
    }
```

Update the file's header comment, which currently says it copies "vendored `libs/` C++ sources and board icons".

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test --workspace=packages/thingblock-resource`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/thingblock-resource/scripts packages/thingblock-resource/test
git commit -m "feat(thingblock-resource): ship pack firmware directories in the build"
```

---

### Task 5: Build the Telemetrix BLE image set

**Repo:** `thingblock-editor` (payload) sourced from `MEO-3/thingbot-telemetrix-arduino`

**Files:**
- Create: `packages/thingblock-resource/src/extensions/devices/thingbot/firmware/telemetrix-ble/telemetrix-ble.ino.bin`
- Create: `…/telemetrix-ble.ino.bootloader.bin`
- Create: `…/telemetrix-ble.ino.partitions.bin`
- Modify: `packages/thingblock-resource/src/extensions/devices/thingbot/manifest.ts` (the `source` field)

This task is hardware-gated: it ends with a board that the editor's Telemetrix extension can actually drive.

- [ ] **Step 1: Clone the firmware fork the extension expects**

```bash
git clone https://github.com/MEO-3/thingbot-telemetrix-arduino.git /tmp/thingbot-fw
grep -rn "DC_WRITE" /tmp/thingbot-fw/src/main.cpp
```

Expected: `#define DC_WRITE 101`. If it reads `7`, stop — this is the wrong fork, and flashing it produces a board that answers the handshake while ignoring every actuator command.

- [ ] **Step 2: Apply the GPIO8 patch**

In `setup()`, remove the `pinMode(ONBOARD_LED_PIN, OUTPUT)` / `digitalWrite(ONBOARD_LED_PIN, LOW)` lines guarded for the BLE build. GPIO8 is the board's I2C SDA; holding it low through NimBLE init wedges the PCA9685, and every LED, buzzer, servo and motor goes dead over BLE while the handshake and DHT keep working.

- [ ] **Step 3: Build the BLE variant**

```bash
cd /tmp/thingbot-fw
pio run -e <the BLE environment in platformio.ini>
ls .pio/build/*/firmware.bin .pio/build/*/bootloader.bin .pio/build/*/partitions.bin
```

If `platformio.ini` has no BLE environment, the transport is chosen by `-D BLE_TRANSPORT`; add an environment that sets it rather than editing the default one.

- [ ] **Step 4: Stage the image set under the pack**

```bash
D=packages/thingblock-resource/src/extensions/devices/thingbot/firmware/telemetrix-ble
mkdir -p $D
cp /tmp/thingbot-fw/.pio/build/*/firmware.bin    $D/telemetrix-ble.ino.bin
cp /tmp/thingbot-fw/.pio/build/*/bootloader.bin  $D/telemetrix-ble.ino.bootloader.bin
cp /tmp/thingbot-fw/.pio/build/*/partitions.bin  $D/telemetrix-ble.ino.partitions.bin
```

- [ ] **Step 5: Record the commit in the manifest**

```bash
git -C /tmp/thingbot-fw rev-parse --short HEAD
```

Replace `REPLACE_WITH_COMMIT_FROM_TASK_5` in `manifest.ts` with that value, and re-run `npm test --workspace=packages/thingblock-resource` — the `source` assertion from Task 3 now passes.

- [ ] **Step 6: Flash it by hand and prove the board answers**

```bash
CLI=/Applications/ThingBlock.app/Contents/Resources/bin/arduino-cli
CFG="$HOME/Library/Application Support/ThingBlock"
"$CLI" --config-file "$CFG/arduino-cli.yaml" upload \
  -b esp32:esp32:esp32c3 -p <port> -i $D/telemetrix-ble.ino.bin
```

Then open ThingBlock, add the Telemetrix extension, scan, connect, and drive a motor and the buzzer. A board that connects but ignores actuators means the wrong fork or a missing GPIO8 patch — go back to Step 1.

- [ ] **Step 7: Commit**

```bash
git add packages/thingblock-resource/src/extensions/devices/thingbot
git commit -m "feat(thingblock-resource): ship the ThingBot live-mode firmware image"
```

---

### Task 6: VM — expose and flash a device's firmware

**Repo:** `thingblock-editor`

**Files:**
- Modify: `packages/scratch-vm/src/link/client/link-client.js`
- Modify: `packages/scratch-vm/src/virtual-machine/device-manager.js`
- Modify: `packages/scratch-vm/src/virtual-machine/index.js`
- Test: `packages/scratch-vm/test/unit/virtual-machine_resource-packs.js`

**Interfaces:**
- Consumes: the `flashFirmware` request from Task 2; the manifest field from Task 3.
- Produces: `vm.getDeviceFirmware(deviceId) -> Array<{id, name}>` and `vm.flashDeviceFirmware(deviceId, firmwareId, callbacks) -> Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Append to `test/unit/virtual-machine_resource-packs.js`, reusing `sampleManifest` from that file (extend a local copy with a `firmware` entry rather than mutating the shared one):

```js
const firmwareManifest = Object.assign({}, sampleManifest, {
    firmware: [{
        id: 'telemetrix-ble',
        path: 'firmware/telemetrix-ble/telemetrix-ble.ino.bin',
        name: {id: 'device.thingbot.firmware.telemetrixBle', default: 'Live mode (Telemetrix over BLE)'}
    }]
});

test('getDeviceFirmware lists what the pack declared', t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    const list = vm.getDeviceFirmware('thingbot');

    t.equal(list.length, 1, 'one image offered');
    t.equal(list[0].id, 'telemetrix-ble', 'carries the id');
    t.equal(list[0].name, 'Live mode (Telemetrix over BLE)', 'resolves the localized name');
    t.end();
});

test('getDeviceFirmware is empty for a device that declares none', t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(sampleManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    t.same(vm.getDeviceFirmware('thingbot'), [], 'no images, no menu entry');
    t.end();
});

test('flashDeviceFirmware sends flashFirmware with the pack-relative image', async t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    // `LinkClient._request(type, payload, callbacks, cancellable)` is the single send path every
    // request goes through; `flash()` uses it too. Stubbing it keeps the test off the socket.
    const sent = [];
    vm.client._request = (type, payload) => {
        sent.push({type, payload});
        return Promise.resolve({});
    };
    vm.client.isConnected = true;
    vm.client._connectedTarget = {id: '/dev/ttyUSB0'};

    await vm.flashDeviceFirmware('thingbot', 'telemetrix-ble');

    t.equal(sent.length, 1, 'one request');
    t.equal(sent[0].type, 'flashFirmware', 'uses the firmware request, not upload');
    t.equal(sent[0].payload.pack, 'extensions/devices/thingbot', 'pack is relative to the resource root');
    t.equal(sent[0].payload.file, 'firmware/telemetrix-ble/telemetrix-ble.ino.bin', 'names the app image');
    t.equal(sent[0].payload.fqbn, 'esp32:esp32:esp32c3', 'carries the board fqbn');
    t.end();
});

test('flashDeviceFirmware rejects an unknown image id', async t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    await t.rejects(
        vm.flashDeviceFirmware('thingbot', 'no-such-image'),
        /no firmware "no-such-image"/,
        'names the missing id rather than failing silently'
    );
    t.end();
});
```

`flash()` reads `this._connectedTarget.id` for the port and throws when `isConnected` is false, so the
stub sets both. Keep `flashFirmware` on that same guard: flashing without a connected port must fail
the same way an upload does.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx tap --node-arg=--require=$PWD/test/fixtures/register-asset-require.js test/unit/virtual-machine_resource-packs.js --disable-coverage`
Expected: FAIL — `vm.getDeviceFirmware is not a function`.

- [ ] **Step 3: Store the manifest's firmware on registration**

`registerDeviceManifest` already keeps `{manifest, base}` in `_resourceDevicePacks`, so no new storage is needed. Add to `device-manager.js`:

```js
    /**
     * The firmware images the selected device's pack ships, for the GUI's restore menu. Empty when
     * the device declares none, which is how a pack opts out of the feature.
     * @param {string} deviceId - the device to list images for.
     * @returns {Array.<object>} `{id, name}` entries, names resolved to the active locale.
     */
    getDeviceFirmware (deviceId) {
        const pack = this._resourceDevicePacks.get(deviceId);
        if (!pack) return [];
        return (pack.manifest.firmware || []).map(fw => ({
            id: fw.id,
            name: formatMessage(fw.name)
        }));
    }

    /**
     * Flash one of the device's pack-shipped firmware images, replacing whatever program is on the
     * board. The pack path is expressed relative to the resource root because the browser cannot
     * name a path on the helper's filesystem.
     * @param {string} deviceId - the selected device.
     * @param {string} firmwareId - the image's manifest id.
     * @param {object} [callbacks] - log/progress callbacks, as `upload` takes.
     * @returns {Promise<void>} resolves when the flash completes.
     */
    async flashDeviceFirmware (deviceId, firmwareId, callbacks) {
        const pack = this._resourceDevicePacks.get(deviceId);
        const firmware = pack && (pack.manifest.firmware || []).find(fw => fw.id === firmwareId);
        if (!firmware) {
            throw new Error(`flashDeviceFirmware: no firmware "${firmwareId}" for "${deviceId}"`);
        }
        const device = this.deviceRegistry.get(deviceId);
        return this.client.flashFirmware(device, this._packPath(deviceId), firmware.path, callbacks);
    }
```

`_packPath(deviceId)` derives `extensions/devices/<id>` from the stored `base` by stripping the resource origin — write it as a small private helper next to these, and cover the derivation in the test above rather than hardcoding the string in the implementation.

- [ ] **Step 4: Add the client sender**

In `link-client.js`, beside `flash()`:

```js
    /**
     * Flash a firmware image the device's pack ships, by resource-root-relative reference. The
     * counterpart to `flash()`, which uploads an artifact the helper just compiled; here nothing is
     * compiled and the helper resolves the image itself.
     * @param {Device} device - the selected device (supplies fqbn and upload config).
     * @param {string} pack - pack directory under the resource root, e.g. `extensions/devices/thingbot`.
     * @param {string} file - app image within the pack.
     * @param {object} [callbacks] - log/progress callbacks, as `flash()` takes.
     * @returns {Promise<void>} resolves when the flash completes.
     */
    async flashFirmware (device, pack, file, callbacks) {
        if (!this.isConnected) {
            throw new Error('LinkClient.flashFirmware: no connected port; call connect() first');
        }
        const fqbn = this._composeFqbn(device);
        const {uploadSpeed = 0} = device.getUploadConfig();
        const port = this._connectedTarget.id;
        log.info(`LinkClient.flashFirmware: flashing ${pack}/${file} to ${port} for ${fqbn}`);
        await this._request(
            'flashFirmware',
            {fqbn, port, uploadSpeed, pack, file},
            withDefaults(callbacks),
            true
        );
        log.info('LinkClient.flashFirmware: flash complete');
    }
```

- [ ] **Step 5: Add the VM delegators**

In `virtual-machine/index.js`, beside the existing device delegators:

```js
    getDeviceFirmware (deviceId) {
        return this._devices.getDeviceFirmware(deviceId);
    }

    flashDeviceFirmware (deviceId, firmwareId, callbacks) {
        return this._devices.flashDeviceFirmware(deviceId, firmwareId, callbacks);
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run the tap command from Step 2, then `npm run lint` in `packages/scratch-vm`.
Expected: PASS; the only lint error is the pre-existing one in `test/unit/io_mouse.js`.

- [ ] **Step 7: Commit**

```bash
git add packages/scratch-vm/src packages/scratch-vm/test
git commit -m "feat(scratch-vm): flash a device's pack-shipped firmware"
```

---

### Task 7: GUI — the menu item and its confirm

**Repo:** `thingblock-editor`

**Files:**
- Modify: `packages/scratch-gui/src/components/menu-bar/board-menu.jsx` (props at line 49; it is
  `connect`-ed in the same file, mapping `state.scratchGui.board.selectedDeviceId` and
  `state.scratchGui.vm`)
- Test: `packages/scratch-gui/test/unit/components/board-menu.test.jsx` (exists; extend it)

**Interfaces:**
- Consumes: `vm.getDeviceFirmware`, `vm.flashDeviceFirmware` from Task 6.

- [ ] **Step 1: Write the failing tests**

Append to the existing `test/unit/components/board-menu.test.jsx`, reusing its `renderBoardMenu`
helper and its `vm` instance:

```jsx
    test('offers no firmware item when the board declares none', () => {
        jest.spyOn(vm, 'getDeviceFirmware').mockReturnValue([]);
        renderBoardMenu(selectedDevice.deviceId);

        fireEvent.click(screen.getByRole('button', {name: `Board: ${selectedDevice.name}`}));

        expect(screen.queryByText(/live mode/i)).not.toBeInTheDocument();
    });

    test('does not flash until the dialog is confirmed', () => {
        jest.spyOn(vm, 'getDeviceFirmware').mockReturnValue([
            {id: 'telemetrix-ble', name: 'Live mode (Telemetrix over BLE)'}
        ]);
        const flash = jest.spyOn(vm, 'flashDeviceFirmware').mockResolvedValue();
        renderBoardMenu(selectedDevice.deviceId);

        fireEvent.click(screen.getByRole('button', {name: `Board: ${selectedDevice.name}`}));
        fireEvent.click(screen.getByText('Live mode (Telemetrix over BLE)'));

        // Opening the dialog must not flash: this erases whatever the learner uploaded.
        expect(flash).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', {name: /flash|confirm/i}));

        expect(flash).toHaveBeenCalledTimes(1);
        expect(flash).toHaveBeenCalledWith(selectedDevice.deviceId, 'telemetrix-ble', expect.anything());
    });

    test('the confirm dialog warns that the board program is erased', () => {
        jest.spyOn(vm, 'getDeviceFirmware').mockReturnValue([
            {id: 'telemetrix-ble', name: 'Live mode (Telemetrix over BLE)'}
        ]);
        renderBoardMenu(selectedDevice.deviceId);

        fireEvent.click(screen.getByRole('button', {name: `Board: ${selectedDevice.name}`}));
        fireEvent.click(screen.getByText('Live mode (Telemetrix over BLE)'));

        expect(screen.getByText(/erase|replace/i)).toBeInTheDocument();
    });
```

Add `afterEach(() => jest.restoreAllMocks())` to the describe block if it has none.

The second test is the one that matters: flashing without confirmation destroys a learner's work.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest test/unit/components/board-menu.test.jsx` from `packages/scratch-gui`
Expected: FAIL — `vm.getDeviceFirmware is not a function` (Task 6 supplies it), then no such menu item.

- [ ] **Step 3: Render the item**

Add a menu item per firmware entry, enabled only when a board is selected and `getDeviceFirmware` is non-empty. All user-visible strings go through `react-intl` `FormattedMessage`, never hardcoded English (`AGENTS.md`). Run `npm run i18n:src` afterwards.

- [ ] **Step 4: Wire the confirm and the flash**

On confirm, call `vm.flashDeviceFirmware(deviceId, firmwareId, callbacks)` and surface progress through the existing `upload-modal`, so a firmware flash looks like an upload — because it is one.

- [ ] **Step 5: Run the tests to verify they pass**

Run the jest command from Step 2, then `npm run lint` in `packages/scratch-gui`.

- [ ] **Step 6: Commit**

```bash
git add packages/scratch-gui/src packages/scratch-gui/test packages/scratch-gui/translations
git commit -m "feat(scratch-gui): offer a board's live-mode firmware in the board menu"
```

---

### Task 8: Hardware acceptance

**Repo:** both, integrated

This is the task the feature exists for. Nothing here is a unit test; every step is on the real board.

- [ ] **Step 1: Build and install the dev app**

```bash
cd thingblock-editor && npm ci
for w in task-herder scratch-storage scratch-svg-renderer scratch-render scratch-vm scratch-media-lib-scripts scratch-blocks; do
  npm run build --workspace=packages/$w
done
cd ../thingblock-desktop && npx tauri build --bundles app
```

`npm ci` installs but does not build workspace packages, and `scratch-gui`'s webpack needs their emitted type declarations — skipping the loop produces seven `TS2307` errors. `tauri.conf.json` targets `deb`/`rpm` only, hence `--bundles app` on macOS.

- [ ] **Step 2: Put the board into the compile plane**

Upload any block program from the editor. This is the state a learner is stuck in: the Telemetrix firmware is gone.

- [ ] **Step 3: Confirm the live plane is broken**

Add the Telemetrix extension, scan. Expected: no board found. This is the symptom the feature addresses; see it before fixing it.

- [ ] **Step 4: Restore from the menu**

Board menu → the live-mode firmware item → confirm. Expected: upload progress, then success.

- [ ] **Step 5: Confirm the live plane works**

Scan again, connect, and drive a motor, a servo, the buzzer, and an LED. All four must respond — the actuators are exactly what a wrong fork or an unpatched GPIO8 would leave dead while the connection still looked healthy.

- [ ] **Step 6: Record the result in the spec**

Change the spec's status line to `implemented, verified on hardware <date>` and note anything that surprised you.

```bash
git add docs/superpowers/specs/2026-09-06-device-firmware-restore-design.md
git commit -m "docs: record hardware acceptance of firmware restore"
```
