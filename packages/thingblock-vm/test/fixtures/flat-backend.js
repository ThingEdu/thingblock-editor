/**
 * Wrap a flat fake exposing whichever link methods a test drives into a backend, by handing the same
 * object to every capability slot. The link controller only calls the slot that owns each method, so a
 * test lists just the methods it cares about.
 * @param {object} fake - the methods (and `isConnected`) the test needs.
 * @returns {object} a backend whose connection, builder, flasher and monitor are all `fake`.
 */
module.exports = fake => ({
    connection: fake,
    builder: fake,
    flasher: fake,
    monitor: fake,
    resourceOrigin: null
});
