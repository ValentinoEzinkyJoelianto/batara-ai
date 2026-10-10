import { LED_COLORS } from './parts.js';

const UNO = 'uno';
const GMIN = 1e-9;
const OUT_G = 1 / 25;
const PULLUP_G = 1 / 20000;
const RAIL_G = 100;
const LED_RD = 15;
export const LED_BURN_A = 0.03;
export const PIN_OVERCURRENT_A = 0.04;

class UnionFind {
  constructor() { this.p = new Map(); }
  find(a) {
    if (!this.p.has(a)) this.p.set(a, a);
    let r = a;
    while (this.p.get(r) !== r) r = this.p.get(r);
    let c = a;
    while (this.p.get(c) !== r) { const n = this.p.get(c); this.p.set(c, r); c = n; }
    return r;
  }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p.set(ra, rb); }
}

const key = (part, pin) => `${part}.${pin}`;

function solveLinear(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
    [A[i], A[max]] = [A[max], A[i]];
    [b[i], b[max]] = [b[max], b[i]];
    const piv = A[i][i];
    if (Math.abs(piv) < 1e-18) continue;
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / piv;
      if (f === 0) continue;
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = Math.abs(A[i][i]) < 1e-18 ? 0 : s / A[i][i];
  }
  return x;
}

export function evaluate(circuit, board = {}) {
  const modes = board.modes || {};
  const out = board.out || {};
  const pwm = board.pwm || {};
  const tone = board.tone || {};
  const servoAngle = board.servo || {};
  const dead = board.dead || new Set();
  const warnings = [];

  const parts = circuit.parts || [];
  const hasUno = parts.some((p) => p.id === UNO);

  const uf = new UnionFind();
  for (const p of parts) {
  }
  for (const w of circuit.wires || []) uf.union(key(w.from.part, w.from.pin), key(w.to.part, w.to.pin));
  if (hasUno) {
    uf.union(key(UNO, 'GND_T'), key(UNO, 'GND_1'));
    uf.union(key(UNO, 'GND_1'), key(UNO, 'GND_2'));
  }
  const gndRoot = hasUno ? uf.find(key(UNO, 'GND_1')) : null;
  const netOf = (part, pin) => uf.find(key(part, pin));

  const idx = new Map();
  const reg = (root) => {
    if (root === gndRoot) return -1;
    if (!idx.has(root)) idx.set(root, idx.size);
    return idx.get(root);
  };
  const allTerminals = [];
  for (const p of parts) {
    const t = pinsOf(p);
    for (const pin of t) allTerminals.push([p.id, pin]);
  }
  for (const [pid, pin] of allTerminals) reg(netOf(pid, pin));
  const n = idx.size;
  const nodeIndex = (pid, pin) => reg(netOf(pid, pin));

  const resistors = [];
  const leds = [];
  const loads = [];
  for (const p of parts) {
    if (p.type === 'resistor') {
      resistors.push({ a: nodeIndex(p.id, 'a'), b: nodeIndex(p.id, 'b'), g: 1 / Math.max(0.01, Number(p.props?.ohms ?? 220)) });
    } else if (p.type === 'button') {
      if (p.props?.pressed) resistors.push({ a: nodeIndex(p.id, 'a'), b: nodeIndex(p.id, 'b'), g: 1000 });
    } else if (p.type === 'pot') {
      const R = Number(p.props?.ohms ?? 10000);
      const v = Math.min(1, Math.max(0, Number(p.props?.value ?? 0.5)));
      resistors.push({ a: nodeIndex(p.id, 'one'), b: nodeIndex(p.id, 'wiper'), g: 1 / Math.max(1, R * v) });
      resistors.push({ a: nodeIndex(p.id, 'wiper'), b: nodeIndex(p.id, 'two'), g: 1 / Math.max(1, R * (1 - v)) });
    } else if (p.type === 'buzzer') {
      resistors.push({ a: nodeIndex(p.id, 'plus'), b: nodeIndex(p.id, 'minus'), g: 1 / 600 });
    } else if (p.type === 'servo') {
      resistors.push({ a: nodeIndex(p.id, 'vcc'), b: nodeIndex(p.id, 'gnd'), g: 1 / 200 });
    } else if (p.type === 'ultrasonic') {
      resistors.push({ a: nodeIndex(p.id, 'vcc'), b: nodeIndex(p.id, 'gnd'), g: 1 / 330 });
    } else if (p.type === 'led') {
      const vf = (LED_COLORS[p.props?.color] || LED_COLORS.red).vf;
      leds.push({ id: p.id, a: nodeIndex(p.id, 'anode'), k: nodeIndex(p.id, 'cathode'), vf, on: false });
    }
  }

  const sources = [];
  if (hasUno) {
    sources.push({ node: nodeIndex(UNO, '5V'), g: RAIL_G, v: 5, rail: '5V' });
    sources.push({ node: nodeIndex(UNO, '3V3'), g: RAIL_G, v: 3.3, rail: '3V3' });
    for (let i = 0; i <= 13; i++) {
      const pin = String(i);
      const mode = modes[pin] || 'INPUT';
      const node = nodeIndex(UNO, pin);
      if (mode === 'OUTPUT') {
        const duty = pwm[pin];
        const high = out[pin] ? 1 : 0;
        const driven = duty != null ? duty > 0 : high === 1;
        const isTone = tone[pin] != null && tone[pin] > 0;
        sources.push({ node, g: OUT_G, v: driven || isTone ? 5 : 0, pin });
      } else if (mode === 'INPUT_PULLUP') {
        sources.push({ node, g: PULLUP_G, v: 5, pin, pullup: true });
      }
    }
    if (hasShort(uf, parts)) warnings.push('Korsleting: 5V terhubung langsung ke GND.');
  }

  let V = new Array(n).fill(0);
  const stampAndSolve = () => {
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    const b = new Array(n).fill(0);
    for (let i = 0; i < n; i++) A[i][i] += GMIN;
    const stampG = (a, c, g) => {
      if (a >= 0) A[a][a] += g;
      if (c >= 0) A[c][c] += g;
      if (a >= 0 && c >= 0) { A[a][c] -= g; A[c][a] -= g; }
    };
    for (const r of resistors) stampG(r.a, r.b, r.g);
    for (const s of sources) {
      if (s.node >= 0) { A[s.node][s.node] += s.g; b[s.node] += s.g * s.v; }
    }
    for (const d of leds) {
      if (!d.on) continue;
      const g = 1 / LED_RD;
      stampG(d.a, d.k, g);
      if (d.a >= 0) b[d.a] += g * d.vf;
      if (d.k >= 0) b[d.k] -= g * d.vf;
    }
    return solveLinear(A, b);
  };
  const vOf = (i) => (i < 0 ? 0 : V[i]);
  for (let iter = 0; iter < 30; iter++) {
    V = stampAndSolve();
    let changed = false;
    for (const d of leds) {
      const want = !dead.has(d.id) && vOf(d.a) - vOf(d.k) > d.vf - (d.on ? 0.05 : 0);
      if (want !== d.on) { d.on = want; changed = true; }
    }
    if (!changed) break;
  }

  const pinVoltage = {};
  if (hasUno) {
    for (let i = 0; i <= 13; i++) pinVoltage[String(i)] = vOf(nodeIndex(UNO, String(i)));
    for (const a of ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']) pinVoltage[a] = vOf(nodeIndex(UNO, a));
    for (const s of sources) {
      if (s.pin == null || s.pullup) continue;
      const i = (s.g) * (s.v - vOf(s.node));
      if (Math.abs(i) > PIN_OVERCURRENT_A) warnings.push(`Pin ${s.pin} dialiri arus berlebih (${Math.round(Math.abs(i) * 1000)} mA). Periksa rangkaian, mungkin ada korsleting.`);
    }
  }

  const pinByNet = new Map();
  if (hasUno) {
    for (let i = 0; i <= 13; i++) pinByNet.set(netOf(UNO, String(i)), String(i));
  }
  const adj = new Map();
  const link = (pa, pb) => {
    const a = netOf(...pa), b = netOf(...pb);
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b); adj.get(b).add(a);
  };
  for (const p of parts) {
    if (p.type === 'resistor') link([p.id, 'a'], [p.id, 'b']);
    if (p.type === 'button' && p.props?.pressed) link([p.id, 'a'], [p.id, 'b']);
  }
  const driverPin = (rootNet) => {
    const seen = new Set([rootNet]);
    const q = [rootNet];
    while (q.length) {
      const cur = q.shift();
      const pin = pinByNet.get(cur);
      if (pin != null && (modes[pin] === 'OUTPUT')) return pin;
      for (const nx of adj.get(cur) || []) if (!seen.has(nx)) { seen.add(nx); q.push(nx); }
    }
    return null;
  };

  const ledOut = {};
  for (const d of leds) {
    const part = parts.find((p) => p.id === d.id);
    const cur = d.on ? Math.max(0, (vOf(d.a) - vOf(d.k) - d.vf) / LED_RD) : 0;
    const burned = cur > LED_BURN_A || dead.has(d.id);
    const dp = driverPin(netOf(d.id, 'anode'));
    const duty = dp != null && pwm[dp] != null ? pwm[dp] : 1;
    ledOut[d.id] = {
      on: cur > 1e-4, current: cur, burned,
      brightness: Math.min(1, cur / 0.02) * duty,
      color: part?.props?.color || 'red',
    };
    if (cur > LED_BURN_A) warnings.push(`LED ${d.id} dialiri ${Math.round(cur * 1000)} mA dan terbakar. Tambahkan resistor (misalnya 220 ohm).`);
    else if (burned) warnings.push(`LED ${d.id} rusak karena arus berlebih sebelumnya. Tambahkan resistor, lalu tekan Run lagi.`);
  }

  const buzzers = {};
  const servos = {};
  const ultrasonics = {};
  for (const p of parts) {
    if (p.type === 'buzzer') {
      const dv = vOf(nodeIndex(p.id, 'plus')) - vOf(nodeIndex(p.id, 'minus'));
      const dp = driverPin(netOf(p.id, 'plus'));
      const f = dp != null ? tone[dp] || 0 : 0;
      buzzers[p.id] = { sounding: dv > 2 && f > 0, freq: f, pin: dp };
    } else if (p.type === 'servo') {
      const powered = vOf(nodeIndex(p.id, 'vcc')) - vOf(nodeIndex(p.id, 'gnd')) > 4;
      const sigPin = pinByNet.get(netOf(p.id, 'signal')) ?? null;
      const ang = sigPin != null ? servoAngle[sigPin] : undefined;
      servos[p.id] = { powered, pin: sigPin, angle: powered && ang != null ? ang : null };
    } else if (p.type === 'ultrasonic') {
      const powered = vOf(nodeIndex(p.id, 'vcc')) - vOf(nodeIndex(p.id, 'gnd')) > 4;
      ultrasonics[p.id] = {
        powered,
        trigPin: pinByNet.get(netOf(p.id, 'trig')) ?? null,
        echoPin: pinByNet.get(netOf(p.id, 'echo')) ?? null,
        distance: Number(p.props?.distance ?? 100),
      };
    }
  }

  return { pinVoltage, leds: ledOut, buzzers, servos, ultrasonics, warnings: [...new Set(warnings)] };
}

function pinsOf(part) {
  switch (part.type) {
    case 'arduino': return ['GND_T', 'GND_1', 'GND_2', '5V', '3V3', 'VIN', 'IOREF', 'RESET',
      ...Array.from({ length: 14 }, (_, i) => String(i)), 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
    case 'led': return ['anode', 'cathode'];
    case 'resistor': return ['a', 'b'];
    case 'button': return ['a', 'b'];
    case 'buzzer': return ['plus', 'minus'];
    case 'servo': return ['signal', 'vcc', 'gnd'];
    case 'ultrasonic': return ['vcc', 'trig', 'echo', 'gnd'];
    case 'pot': return ['one', 'wiper', 'two'];
    default: return [];
  }
}

function hasShort(uf, parts) {
  if (!parts.some((p) => p.id === UNO)) return false;
  return uf.find(key(UNO, '5V')) === uf.find(key(UNO, 'GND_1'))
    || uf.find(key(UNO, '3V3')) === uf.find(key(UNO, 'GND_1'))
    || uf.find(key(UNO, '5V')) === uf.find(key(UNO, '3V3'));
}
