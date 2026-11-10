import {test} from 'tap';
import ThingEdgesExtension from '../../src/extensions/scratch3_thingedges/index.ts';
import {FIRST_PORT} from '../../src/extensions/scratch3_thingedges/bridge-client.ts';
import type {FetchLike, KeyValueStore} from '../../src/extensions/scratch3_thingedges/bridge-client.ts';

const TOKEN = '0123456789abcdef0123456789abcdef';

const devices = [
    {
        id: 'light1', name: 'Đèn bàn', kind: 'light', room: 'Phòng học',
        channels: [{element: 1, label: 'Kênh 1'}], capabilities: ['power', 'brightness', 'color']
    },
    {
        id: 'sw2', name: 'Công tắc', kind: 'switch', room: null,
        channels: [{element: 1, label: 'Nút 1'}, {element: 2, label: 'Nút 2'}], capabilities: ['power']
    },
    {id: 'tv', name: 'TV', kind: 'tv', room: null, channels: [], capabilities: ['power', 'ir']},
    {id: 'th', name: 'Nhiệt kế', kind: 'sensor', room: null, channels: [{element: 1, label: 'Kênh 1'}], capabilities: ['sensor']}
];

/**
 * A bridge on the second port of the range; records every request it receives. Like ThingEdges Desktop, it
 * refuses everything but /v1/info while nobody is signed in, and names the account only to a paired app.
 */
const fakeBridge = ({paired = true, port = FIRST_PORT + 1, controlStatus = 200, signedIn = true} = {}) => {
    const calls: {url: string, method: string, body?: unknown, auth?: string}[] = [];
    let session = signedIn;
    let states: Record<string, unknown> = {
        light1: {on: {1: true}, brightness: 40},
        sw2: {on: {1: false, 2: true}},
        th: {temperature: 31.5, humidity: 70}
    };
    const fetch: FetchLike = (url, init = {}) => {
        const call = {url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined,
            auth: init.headers?.Authorization};
        calls.push(call);
        const reply = (status: number, body: unknown) => Promise.resolve({status, json: () => Promise.resolve(body)});
        if (!url.startsWith(`http://127.0.0.1:${port}/`)) return Promise.reject(new Error('ECONNREFUSED'));
        const path = url.slice(`http://127.0.0.1:${port}`.length);
        const tokenValid = session && call.auth === `Bearer ${TOKEN}` && paired;
        if (path === '/v1/info') {
            return reply(200, {name: 'ThingEdges Desktop', api: 1, signedIn: session, paired: tokenValid,
                ...(tokenValid ? {account: 'An', location: 'Nhà'} : {})});
        }
        if (!session) return reply(503, {error: 'Sign in to ThingEdges Desktop first'});
        if (path === '/v1/pair') {
            paired = true;
            return reply(200, {token: TOKEN});
        }
        if (call.auth !== `Bearer ${TOKEN}`) return reply(401, {error: 'Pair first'});
        if (path === '/v1/devices') return reply(200, {devices});
        if (path === '/v1/states') return reply(200, {states});
        if (path.endsWith('/control')) return reply(controlStatus, controlStatus === 200 ? {ok: true, message: 'ok'} : {error: 'no'});
        return reply(404, {error: 'no route'});
    };
    return {fetch, calls, setStates: (next: Record<string, unknown>) => {
        states = next;
    }, setSignedIn: (value: boolean) => {
        session = value;
    }};
};

const memoryStore = (initial: Record<string, string> = {}): KeyValueStore => {
    const data = {...initial};
    return {
        getItem: key => data[key] ?? null,
        setItem: (key, value) => {
            data[key] = value;
        },
        removeItem: key => {
            delete data[key];
        }
    };
};

const connectedExtension = async (bridge = fakeBridge()) => {
    const ext = new ThingEdgesExtension({}, {fetch: bridge.fetch, store: memoryStore({'thingedges.bridgeToken': TOKEN}), autoStart: false});
    if (await ext._client.discover() !== true) throw new Error('the fake bridge should accept the stored token');
    ext._status = 'connected';
    await ext.refreshDevices();
    await ext.pollStates();
    return {ext, bridge};
};

test('discovery skips ports with nothing listening and finds the bridge', async t => {
    const bridge = fakeBridge({port: FIRST_PORT + 3, paired: false});
    const ext = new ThingEdgesExtension({}, {fetch: bridge.fetch, store: memoryStore(), autoStart: false});
    t.equal(await ext._client.discover(), false, 'found but not paired yet');
    t.equal(ext._client.baseUrl, `http://127.0.0.1:${FIRST_PORT + 3}`);
});

test('connect pairs, stores the token and loads devices', async t => {
    const bridge = fakeBridge({paired: false});
    const store = memoryStore();
    const ext = new ThingEdgesExtension({}, {fetch: bridge.fetch, store, autoStart: false});
    await ext.connect();
    ext.dispose();
    t.equal(store.getItem('thingedges.bridgeToken'), TOKEN);
    t.ok(ext.isConnected());
    t.equal(ext._devices.length, 4);
    t.same(bridge.calls.find(c => c.url.endsWith('/v1/pair'))?.body, {app: 'ThingBlock'});
});

test('device menus list one item per switch channel and only matching kinds', async t => {
    const {ext} = await connectedExtension();
    t.same(ext.powerMenu(), [
        {text: 'Đèn bàn (Phòng học)', value: 'light1'},
        {text: 'Công tắc · Nút 1', value: 'sw2#1'},
        {text: 'Công tắc · Nút 2', value: 'sw2#2'},
        {text: 'TV', value: 'tv'}
    ]);
    t.same(ext.lightMenu(), [{text: 'Đèn bàn (Phòng học)', value: 'light1'}]);
    t.same(ext.remoteMenu(), [{text: 'TV', value: 'tv'}]);
    t.same(ext.sensorMenu(), [{text: 'Nhiệt kế', value: 'th'}]);
    t.equal(ext.acMenu().length, 1, 'an empty menu still offers one placeholder item');
    t.equal((ext.acMenu()[0] as {value: string}).value, '');
});

test('menus say the bridge is not connected yet', t => {
    const ext = new ThingEdgesExtension({}, {fetch: fakeBridge().fetch, store: memoryStore(), autoStart: false});
    const [item] = ext.powerMenu() as {text: string, value: string}[];
    t.equal(item.value, '');
    t.equal(item.text, '(not connected)');
    t.end();
});

test('command blocks send the right command for the chosen channel', async t => {
    const {ext, bridge} = await connectedExtension();
    await ext.turn({DEVICE: 'sw2#2', STATE: 'off'});
    await ext.turn({DEVICE: 'light1', STATE: 'on'});
    await ext.toggle({DEVICE: 'sw2#1'});
    await ext.setBrightness({LIGHT: 'light1', VALUE: 250});
    await ext.setColor({LIGHT: 'light1', HUE: -5});
    await ext.setAcTemperature({AC: 'x', VALUE: 40});
    await ext.pressRemote({KEY: 'vol_up', REMOTE: 'tv'});
    const sent = bridge.calls.filter(c => c.url.endsWith('/control')).map(c => [c.url.split('/v1/devices/')[1], c.body]);
    t.same(sent, [
        ['sw2/control', {action: 'power', on: false, element: 2}],
        ['light1/control', {action: 'power', on: true}],
        ['sw2/control', {action: 'toggle', element: 1}],
        ['light1/control', {action: 'brightness', value: 100}],
        ['light1/control', {action: 'color', hue: 0}],
        ['x/control', {action: 'ac_temperature', value: 30}],
        ['tv/control', {action: 'ir', key: 'vol_up'}]
    ]);
});

test('a placeholder menu value sends nothing', async t => {
    const {ext, bridge} = await connectedExtension();
    await ext.turn({DEVICE: '', STATE: 'on'});
    t.equal(bridge.calls.filter(c => c.url.endsWith('/control')).length, 0);
});

test('a refused command does not stop the program', async t => {
    const {ext} = await connectedExtension(fakeBridge({controlStatus: 429}));
    await t.resolves(ext.turn({DEVICE: 'light1', STATE: 'on'}));
});

test('reporters and hats read the polled state', async t => {
    const {ext, bridge} = await connectedExtension();
    t.equal(ext.isOn({DEVICE: 'light1'}), true);
    t.equal(ext.isOn({DEVICE: 'sw2#1'}), false);
    t.equal(ext.isOn({DEVICE: 'sw2#2'}), true);
    t.equal(ext.isOn({DEVICE: 'sw2'}), true, 'a whole device is on when any channel is');
    t.equal(ext.sensorValue({SENSOR: 'th', MEASURE: 'temperature'}), 31.5);
    t.equal(ext.sensorValue({SENSOR: 'th', MEASURE: 'lux'}), 0);
    t.equal(ext.whenSensorAbove({SENSOR: 'th', MEASURE: 'temperature', VALUE: 30}), true);
    t.equal(ext.whenSensorAbove({SENSOR: 'th', MEASURE: 'humidity', VALUE: 80}), false);
    t.equal(ext.whenTurned({DEVICE: 'sw2#1', STATE: 'off'}), true);
    t.equal(ext.whenTurned({DEVICE: 'tv', STATE: 'off'}), false, 'no state yet is not "off"');

    bridge.setStates({sw2: {on: {1: true, 2: true}}});
    await ext.pollStates();
    t.equal(ext.whenTurned({DEVICE: 'sw2#1', STATE: 'on'}), true);
    t.equal(ext.whenTurned({DEVICE: 'sw2#1', STATE: 'off'}), false);
});

test('a revoked token drops the devices and asks to connect again', async t => {
    const store = memoryStore({'thingedges.bridgeToken': TOKEN});
    const bridge = fakeBridge();
    const ext = new ThingEdgesExtension({}, {fetch: bridge.fetch, store, autoStart: false});
    await ext._client.discover();
    ext._status = 'connected';
    await ext.refreshDevices();
    store.setItem('thingedges.bridgeToken', 'ffffffffffffffffffffffffffffffff');
    await ext.pollStates();
    ext.dispose();
    t.equal(ext._status, 'waiting');
    t.same(ext._devices, []);
    t.equal(store.getItem('thingedges.bridgeToken'), null, 'the rejected token is forgotten');
});

test('getInfo declares every opcode the extension implements', t => {
    const ext = new ThingEdgesExtension({}, {fetch: fakeBridge().fetch, store: memoryStore(), autoStart: false});
    const info = ext.getInfo();
    for (const block of info.blocks ?? []) {
        if (block === '---' || !block.opcode) continue;
        t.type((ext as unknown as Record<string, unknown>)[block.opcode], 'function', block.opcode);
    }
    for (const [name, menu] of Object.entries(info.menus ?? {})) {
        if (typeof menu.items === 'string') t.type((ext as unknown as Record<string, unknown>)[menu.items], 'function', name);
    }
    t.end();
});

test('a signed-out Desktop is not asked for access and the status says to sign in', async t => {
    const bridge = fakeBridge({paired: false, signedIn: false});
    const ext = new ThingEdgesExtension({}, {fetch: bridge.fetch, store: memoryStore(), autoStart: false});
    await ext.connect();
    t.equal(ext._status, 'signedOut');
    t.notOk(bridge.calls.some(c => c.url.endsWith('/v1/pair')), 'no pairing request while signed out');
    t.equal(ext.status(), 'sign in to ThingEdges Desktop with your account');

    bridge.setSignedIn(true);
    await ext.connect();
    ext.dispose();
    t.ok(ext.isConnected());
    t.equal(ext.status(), 'connected: An · Nhà', 'the status names the account and the home');
});

test('signing out of the Desktop drops the devices; signing back in reconnects without asking again', async t => {
    const bridge = fakeBridge();
    const {ext} = await connectedExtension(bridge);
    ext._start = () => {}; // the test drives discovery itself
    bridge.setSignedIn(false);
    await ext.pollStates();
    t.equal(ext._status, 'signedOut');
    t.same(ext._devices, []);

    bridge.setSignedIn(true);
    await ext.connect();
    ext.dispose();
    t.ok(ext.isConnected());
    t.equal(bridge.calls.filter(c => c.url.endsWith('/v1/pair')).length, 0, 'the stored token is still good for this account');
});

test('discovery keeps watching until the signed-in account allowed this app', async t => {
    const bridge = fakeBridge({paired: false, signedIn: false});
    const ext = new ThingEdgesExtension({}, {fetch: bridge.fetch, store: memoryStore({'thingedges.bridgeToken': TOKEN}), autoStart: false});
    const retries: (() => void)[] = [];
    ext._later = task => {
        retries.push(task);
    };
    ext._start();
    await new Promise(resolve => setImmediate(resolve));
    t.equal(ext._status, 'signedOut');
    bridge.setSignedIn(true);
    retries.shift()?.();
    await new Promise(resolve => setImmediate(resolve));
    t.equal(ext._status, 'waiting', 'signed in, but this account has not allowed ThingBlock');
});
