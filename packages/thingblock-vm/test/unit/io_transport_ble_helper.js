const test = require('tap').test;
const HelperBleBackend = require('../../src/io/transport/ble/helper');

// Lets queued promise callbacks (the backend's lazy-open chain) settle.
const flush = () => new Promise(resolve => setImmediate(resolve));

// A fake WebSocket the test drives: it records sent frames and exposes helpers
// to simulate the open handshake and inbound server frames.
const makeFake = sockets => class FakeSocket {
    constructor (url) {
        this.url = url;
        this.readyState = 0;
        this.sent = [];
        sockets.push(this);
    }
    send (data) {
        this.sent.push(JSON.parse(data));
    }
    open () {
        this.readyState = 1;
        if (this.onopen) this.onopen();
    }
    recv (obj) {
        if (this.onmessage) this.onmessage({data: JSON.stringify(obj)});
    }
    serverClose () {
        if (this.onclose) this.onclose();
    }
};

test('scan streams devices, stop cancels', async t => {
    const sockets = [];
    const backend = new HelperBleBackend({url: 'ws://test/io', WebSocket: makeFake(sockets)});
    const devices = [];
    const stop = backend.scan({services: ['svc']}, {onDevice: d => devices.push(d)});

    const sock = sockets[0];
    sock.open();
    await flush();

    t.equal(sock.sent[0].type, 'scan', 'sends a scan request');
    t.same(sock.sent[0].payload.services, ['svc'], 'forwards the service filter');
    const scanId = sock.sent[0].id;

    sock.recv({id: scanId, type: 'bleDevice', payload: {deviceId: 'd1', name: 'ThingBot', rssi: -40}});
    t.equal(devices.length, 1, 'onDevice fired per bleDevice frame');
    t.equal(devices[0].id, 'd1', 'device id mapped from payload');
    t.equal(devices[0].rssi, -40, 'rssi carried through');

    stop();
    t.equal(sock.sent[1].type, 'cancel', 'stop() cancels the scan');
    t.equal(sock.sent[1].id, scanId, 'cancel targets the scan id');
    t.end();
});

test('connect, write (base64), subscribe, notify, read', async t => {
    const sockets = [];
    const backend = new HelperBleBackend({url: 'ws://test/io', WebSocket: makeFake(sockets)});

    const connecting = backend.connect({id: 'd1'});
    const sock = sockets[0];
    sock.open();
    await flush();
    t.equal(sock.sent[0].type, 'connect', 'sends connect');
    sock.recv({id: sock.sent[0].id, type: 'result', payload: {deviceId: 'd1'}});
    const connection = await connecting;
    t.ok(connection.isConnected(), 'connection is live after result');

    const characteristic = await connection.getCharacteristic('svc', 'rx');

    const writing = characteristic.write(new Uint8Array([1, 6]));
    await flush();
    const writeFrame = sock.sent.find(m => m.type === 'write');
    t.equal(writeFrame.payload.data, 'AQY=', 'write payload is base64-encoded bytes');
    sock.recv({id: writeFrame.id, type: 'result', payload: {}});
    await writing;

    const received = [];
    const subscribing = characteristic.subscribe(bytes => received.push(bytes));
    await flush();
    const subFrame = sock.sent.find(m => m.type === 'subscribe');
    sock.recv({id: subFrame.id, type: 'result', payload: {}});
    await subscribing;

    // btoa(String.fromCharCode(2, 6, 1)) === 'AgYB'
    sock.recv({type: 'bleNotify', payload: {deviceId: 'd1', characteristic: 'rx', data: 'AgYB'}});
    t.equal(received.length, 1, 'notification routed to the subscriber');
    t.same(Array.from(received[0]), [2, 6, 1], 'notification bytes base64-decoded');

    const reading = characteristic.read();
    await flush();
    const readFrame = sock.sent.find(m => m.type === 'read');
    sock.recv({id: readFrame.id, type: 'result', payload: {data: 'CQ=='}}); // [9]
    const value = await reading;
    t.same(Array.from(value), [9], 'read result base64-decoded');
    t.end();
});

test('bleDisconnected fires the connection callback', async t => {
    const sockets = [];
    const backend = new HelperBleBackend({url: 'ws://test/io', WebSocket: makeFake(sockets)});

    let dropped = false;
    const connecting = backend.connect({id: 'd1'}, () => {
        dropped = true;
    });
    const sock = sockets[0];
    sock.open();
    await flush();
    sock.recv({id: sock.sent[0].id, type: 'result', payload: {deviceId: 'd1'}});
    await connecting;

    sock.recv({type: 'bleDisconnected', payload: {deviceId: 'd1'}});
    t.ok(dropped, 'onDisconnect called on an unsolicited disconnect');
    t.end();
});

test('a socket error rejects an in-flight request', async t => {
    const sockets = [];
    const FakeErroring = class {
        constructor (url) {
            this.url = url;
            this.readyState = 0;
            sockets.push(this);
        }
        send () {}
        fail () {
            if (this.onerror) this.onerror();
        }
    };
    const backend = new HelperBleBackend({url: 'ws://down/io', WebSocket: FakeErroring});
    const connecting = backend.connect({id: 'd1'});
    sockets[0].fail();
    await t.rejects(connecting, /cannot reach/, 'connect rejects when the socket errors');
    t.end();
});
