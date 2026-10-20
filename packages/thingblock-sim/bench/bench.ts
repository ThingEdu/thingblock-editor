/**
 * M0 performance check: how much virtual time the simulator gets through per second of real time on
 * the machine it runs on, for the workloads the K4–K8 projects produce. Bundle it with esbuild and run
 * it with node on the target (NEO One: aarch64, 2 GB); V8 in node and in Chromium run this code alike.
 *
 *   npx esbuild bench/bench.ts --bundle --platform=node --outfile=/tmp/sim-bench.mjs --format=esm
 *   node /tmp/sim-bench.mjs
 */
import { Session } from '../src/session'

/** Programs written the way the simulator generator writes them. */
const PROGRAMS: Record<string, string> = {
  // A forever loop with no wait: the worst case, every statement is a yield back to the runner.
  'busy loop (no wait)': `
    let x = 0;
    function* setup() {}
    function* loop() { while (true) { yield "f"; yield "s"; x = $.i32(x + 1); } }
    return { setup, loop };`,
  // k4-01: LED blink, 500 ms on / 500 ms off.
  'LED blink': `
    const LED_1 = 15;
    const pwm = $.hw.Adafruit_PWMServoDriver();
    function mapToPulse(v) { return $.map(Math.min(100, Math.max(0, v)), 0, 100, 0, 4095); }
    function* setup() { pwm.begin(); pwm.setOscillatorFrequency(27000000); pwm.setPWMFreq(50); }
    function* loop() {
      yield "a"; pwm.setPin(LED_1, mapToPulse(100));
      yield "b"; yield $.delay(500);
      yield "c"; pwm.setPin(LED_1, mapToPulse(0));
      yield "d"; yield $.delay(500);
    }
    return { setup, loop };`,
  // An OLED redrawn as fast as the bus allows: clear, print a number, display, no wait (the
  // flickering-menu case). Every display() is a full 1024-byte frame through the GFX port.
  'OLED redraw, no wait': `
    const SSD1306_WHITE = 1;
    const oled = $.hw.Adafruit_SSD1306(128, 64);
    let n = 0;
    function* setup() { oled.begin(); oled.setTextColor(SSD1306_WHITE); }
    function* loop() {
      yield "c"; oled.clearDisplay();
      yield "s"; oled.setTextSize(2);
      yield "k"; oled.setCursor(0, 0);
      yield "p"; oled.println($.printInt(n));
      yield "q"; oled.println($.printFloat($.millis() / 1000.0));
      yield "d"; oled.display();
      yield "i"; n = $.i32(n + 1);
    }
    return { setup, loop };`,
}

const REAL_MS = 2000
const TICK_MS = 16

const run = (name: string, code: string, speed: number) => {
  const session = new Session(code)
  session.running = true
  session.speed = speed
  const start = performance.now()
  let ticks = 0
  let worstTick = 0
  // Feed the session 16 ms ticks back to back, as fast as it can take them, for REAL_MS of real time:
  // what it gets through is its throughput; the slowest tick is the stall a learner would see.
  while (performance.now() - start < REAL_MS) {
    const t0 = performance.now()
    session.tick(TICK_MS)
    worstTick = Math.max(worstTick, performance.now() - t0)
    ticks++
  }
  const real = performance.now() - start
  const virtualMs = session.snapshot().t / 1000
  // Real-time factor: virtual seconds per real second when ticks arrive as fast as possible.
  const factor = virtualMs / real
  const frames = session.log.filter((e) => e.key === 'frame').length
  console.log(
    `${name.padEnd(24)} speed ${String(speed).padStart(3)}x  virtual/real ${factor.toFixed(1).padStart(7)}x` +
      `  worst tick ${worstTick.toFixed(1).padStart(6)} ms  ticks ${ticks}` +
      (frames ? `  frames/s(real) ${(frames / (real / 1000)).toFixed(0)}` : ''),
  )
}

console.log(`node ${process.version} ${process.arch}`)
for (const [name, code] of Object.entries(PROGRAMS)) {
  for (const speed of [1, 100]) run(name, code, speed)
}
