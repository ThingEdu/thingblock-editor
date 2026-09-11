/**
 * Planning 
 * 
 * A resource pack is any helper-served bundle of editor capability — a device, a peripheral, or a future
 * feature unrelated to hardware. New features are meant to ship as packs rather than as VM extensions.
 * Today packs are handled by {@link DeviceManager}, which only knows the device and peripheral kinds: it
 * fetches the pack index, registers manifests, activates packs on device selection, and answers
 * {@link DeviceManager#isDeviceExtension} for project load.
 *
 * This class takes over the kind-agnostic part of that — index fetch, manifest registry, module import,
 * opcode-prefix ownership — once a pack kind other than device/peripheral exists. `DeviceManager` then
 * keeps devices and asks this manager for the packs a device references.
 */
module.exports = class ResourcePackManager {};
