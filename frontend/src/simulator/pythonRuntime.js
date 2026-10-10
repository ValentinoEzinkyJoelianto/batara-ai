import { toLevel } from './circuit/boardModel.js';

const KEY_ALIASES = { ' ': 'space', arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', enter: 'enter' };
export function normalizeKey(k) {
  const low = String(k).toLowerCase();
  return KEY_ALIASES[low] || low;
}

function formatError(e) {
  try {
    if (typeof Sk !== 'undefined' && e instanceof Sk.builtin.BaseException) return e.toString();
  } catch { /* ignore */ }
  return e && e.message ? e.message : String(e);
}

export function createRuntime({ board, onOutput = () => {}, onError = () => {}, onRunningChange = () => {} }) {
  let running = false;
  let stopped = false;
  let startTime = 0;
  let mainDone = false;
  let sleepers = new Set();
  let handlers = [];
  let liveCount = 0;

  const js = (x) => Sk.ffi.remapToJs(x);
  const none = () => Sk.builtin.none.none$;
  const guard = () => { if (stopped) throw new Sk.builtin.TimeLimitError('stopped'); };

  function sleep(ms) {
    return new Promise((resolve) => {
      const t = setTimeout(() => { sleepers.delete(release); resolve(); }, ms);
      const release = () => { clearTimeout(t); sleepers.delete(release); resolve(); };
      sleepers.add(release);
    });
  }

  function setRunning(v) {
    if (running !== v) { running = v; onRunningChange(v); }
  }

  function maybeFinish() {
    if (!running || stopped) return;
    if (!mainDone || liveCount > 0) return;
    const waiting = handlers.some((h) => h.kind !== 'start');
    if (!waiting) setRunning(false);
  }

  function trigger(h) {
    if (stopped) return Promise.resolve();
    if (h.running) return h.running;
    liveCount++;
    h.running = Sk.misceval
      .asyncToPromise(() => Sk.misceval.callsimAsync({}, h.fn))
      .catch((e) => { if (!stopped) { onError(formatError(e)); stop(); } })
      .finally(() => { h.running = null; liveCount--; maybeFinish(); });
    return h.running;
  }

  function registerBuiltins() {
    const B = Sk.builtins;
    const fn = (f) => new Sk.builtin.func(f);
    B.HIGH = new Sk.builtin.int_(1);
    B.LOW = new Sk.builtin.int_(0);
    B.OUTPUT = new Sk.builtin.str('OUTPUT');
    B.INPUT = new Sk.builtin.str('INPUT');
    B.INPUT_PULLUP = new Sk.builtin.str('INPUT_PULLUP');

    B.pinMode = fn((pin, mode) => { guard(); board.pinMode(js(pin), js(mode)); return none(); });
    B.digitalWrite = fn((pin, v) => { guard(); board.digitalWrite(js(pin), js(v)); return none(); });
    B.digitalRead = fn((pin) => { guard(); return new Sk.builtin.int_(board.digitalRead(js(pin))); });
    B.analogRead = fn((pin) => { guard(); return new Sk.builtin.int_(board.analogRead(js(pin))); });
    B.analogWrite = fn((pin, v) => { guard(); board.analogWrite(js(pin), js(v)); return none(); });
    B.servoWrite = fn((pin, a) => { guard(); board.servoWrite(js(pin), js(a)); return none(); });
    B.noTone = fn((pin) => { guard(); board.noTone(js(pin)); return none(); });
    B.readUltrasonic = fn((trig, echo) => { guard(); return new Sk.builtin.int_(Math.round(board.readUltrasonic(js(trig), js(echo)))); });
    B.millis = fn(() => { guard(); return new Sk.builtin.int_(Math.round(performance.now() - startTime)); });

    B.delay = fn((ms) => {
      guard();
      return Sk.misceval.promiseToSuspension(sleep(Math.max(0, Number(js(ms)) || 0)).then(guard));
    });
    B._tick = fn(() => {
      guard();
      return Sk.misceval.promiseToSuspension(sleep(0).then(guard));
    });

    B.tone = new Sk.builtin.func(function (pin, freq, dur) {
      guard();
      const p = js(pin);
      board.tonePin(p, js(freq));
      const d = dur === undefined ? null : js(dur);
      if (d == null) return none();
      return Sk.misceval.promiseToSuspension(sleep(Number(d)).then(() => { guard(); board.noTone(p); }));
    });
    B.tone.co_varnames = ['pin', 'freq', 'dur'];
    B.tone.$defaults = [Sk.builtin.none.none$];
    B.tone.co_argcount = 3;

    B.when_start = fn((f) => { handlers.push({ kind: 'start', fn: f, running: null }); return none(); });
    B.when_key_pressed = fn((k, f) => { handlers.push({ kind: 'key', key: normalizeKey(js(k)), fn: f, running: null }); return none(); });
    B.when_message = fn((m, f) => { handlers.push({ kind: 'message', key: String(js(m)), fn: f, running: null }); return none(); });
    B.when_pin = fn((pin, edge, f) => {
      const h = { kind: 'pin', key: String(js(pin)), fn: f, running: null };
      handlers.push(h);
      board.watchPin(js(pin), String(js(edge)).toUpperCase(), () => trigger(h));
      return none();
    });
    B.broadcast = fn((m) => {
      guard();
      handlers.filter((h) => h.kind === 'message' && h.key === String(js(m))).forEach((h) => trigger(h));
      return none();
    });
    B.broadcast_and_wait = fn((m) => {
      guard();
      const ps = handlers.filter((h) => h.kind === 'message' && h.key === String(js(m))).map((h) => trigger(h));
      return Sk.misceval.promiseToSuspension(Promise.all(ps).then(guard));
    });
    B.stop_all = fn(() => { stop(); guard(); return none(); });
    B.start_events = fn(() => {
      handlers.filter((h) => h.kind === 'start').forEach((h) => trigger(h));
      return none();
    });
  }

  async function run(code) {
    if (typeof Sk === 'undefined') {
      onError('Skulpt belum termuat. Pastikan skulpt.min.js dan skulpt-stdlib.js ada di index.html.');
      return;
    }
    stop(true);
    await Promise.resolve();
    board.reset();
    stopped = false;
    mainDone = false;
    handlers = [];
    liveCount = 0;
    startTime = performance.now();

    Sk.configure({
      output: (t) => onOutput(t),
      read: (f) => {
        if (!Sk.builtinFiles || Sk.builtinFiles.files[f] === undefined) throw new Error(`File not found: '${f}'`);
        return Sk.builtinFiles.files[f];
      },
      __future__: Sk.python3,
      execLimit: Infinity,
      yieldLimit: 30,
    });
    registerBuiltins();
    setRunning(true);
    try {
      await Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true));
    } catch (e) {
      if (!stopped) { onError(formatError(e)); stop(); }
      return;
    }
    mainDone = true;
    maybeFinish();
  }

  function stop(silent = false) {
    const wasRunning = running;
    stopped = true;
    if (typeof Sk !== 'undefined') { Sk.execLimit = 0; Sk.execStart = 0; }
    for (const release of [...sleepers]) release();
    board.noToneAll?.();
    if (wasRunning && !silent) setRunning(false);
    else if (wasRunning) running = false;
  }

  function sendKey(key) {
    if (!running || stopped) return;
    const k = normalizeKey(key);
    handlers.filter((h) => h.kind === 'key' && (h.key === k || h.key === 'any')).forEach((h) => trigger(h));
  }

  return { run, stop, sendKey, isRunning: () => running };
}
