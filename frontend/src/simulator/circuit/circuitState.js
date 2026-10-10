import { PART_TYPES } from './parts.js';

export const UNO_POS = { x: 250, y: 330 };
export const WORLD = { w: 820, h: 520 };

export function emptyCircuit() {
  return { parts: [{ id: 'uno', type: 'arduino', x: UNO_POS.x, y: UNO_POS.y, props: {} }], wires: [] };
}

export function normalizeCircuit(c) {
  if (!c || !Array.isArray(c.parts) || !c.parts.some((p) => p.id === 'uno')) return emptyCircuit();
  return { parts: c.parts, wires: Array.isArray(c.wires) ? c.wires : [] };
}

const PREFIX = { led: 'led', resistor: 'r', button: 'btn', buzzer: 'buz', servo: 'servo', ultrasonic: 'us', pot: 'pot' };

export function nextPartId(circuit, type) {
  const base = PREFIX[type] || type;
  let i = 1;
  while (circuit.parts.some((p) => p.id === `${base}${i}`)) i++;
  return `${base}${i}`;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const snap = (v, g = 5) => Math.round(v / g) * g;

export function addPart(circuit, type, at) {
  const def = PART_TYPES[type];
  if (!def || def.fixed) return circuit;
  const count = circuit.parts.filter((p) => p.type === type).length;
  const x = at ? at.x : 40 + (count % 6) * 120;
  const y = at ? at.y : 40 + (Math.floor(count / 6) % 3) * 90;
  const part = {
    id: nextPartId(circuit, type), type,
    x: snap(clamp(x, 0, WORLD.w - def.w)), y: snap(clamp(y, 0, WORLD.h - def.h)),
    props: { ...(def.defaults || {}) },
  };
  return { ...circuit, parts: [...circuit.parts, part] };
}

export function movePart(circuit, id, x, y) {
  return {
    ...circuit,
    parts: circuit.parts.map((p) => {
      if (p.id !== id) return p;
      const def = PART_TYPES[p.type];
      return { ...p, x: snap(clamp(x, 0, WORLD.w - def.w)), y: snap(clamp(y, 0, WORLD.h - def.h)) };
    }),
  };
}

export function removePart(circuit, id) {
  if (id === 'uno') return circuit;
  return {
    parts: circuit.parts.filter((p) => p.id !== id),
    wires: circuit.wires.filter((w) => w.from.part !== id && w.to.part !== id),
  };
}

export function setProp(circuit, id, prop, value) {
  return { ...circuit, parts: circuit.parts.map((p) => (p.id === id ? { ...p, props: { ...p.props, [prop]: value } } : p)) };
}

const sameEnd = (a, b) => a.part === b.part && a.pin === b.pin;

export function pinExists(circuit, end) {
  const part = circuit.parts.find((p) => p.id === end.part);
  return !!part && !!PART_TYPES[part.type]?.pins[end.pin];
}

export function wireColorFor(circuit, from, to) {
  const isGnd = (e) => e.part === 'uno' && e.pin.startsWith('GND') || e.pin === 'gnd' || e.pin === 'cathode' || e.pin === 'minus';
  const isPwr = (e) => e.part === 'uno' && (e.pin === '5V' || e.pin === '3V3' || e.pin === 'VIN') || e.pin === 'vcc';
  if (isGnd(from) || isGnd(to)) return '#1f2937';
  if (isPwr(from) || isPwr(to)) return '#dc2626';
  const palette = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777'];
  return palette[circuit.wires.length % palette.length];
}

export function addWire(circuit, from, to) {
  if (!pinExists(circuit, from) || !pinExists(circuit, to)) return circuit;
  if (sameEnd(from, to)) return circuit;
  if (circuit.wires.some((w) => (sameEnd(w.from, from) && sameEnd(w.to, to)) || (sameEnd(w.from, to) && sameEnd(w.to, from)))) return circuit;
  let i = 1;
  while (circuit.wires.some((w) => w.id === `w${i}`)) i++;
  return { ...circuit, wires: [...circuit.wires, { id: `w${i}`, from, to, color: wireColorFor(circuit, from, to) }] };
}

export function removeWire(circuit, id) {
  return { ...circuit, wires: circuit.wires.filter((w) => w.id !== id) };
}

export function pinPosition(circuit, end) {
  const part = circuit.parts.find((p) => p.id === end.part);
  const pin = part && PART_TYPES[part.type]?.pins[end.pin];
  return part && pin ? { x: part.x + pin.x, y: part.y + pin.y } : null;
}

const W = (id, a, ap, b, bp, color) => ({ id, from: { part: a, pin: ap }, to: { part: b, pin: bp }, color });
export const PRESETS = {
  blink: {
    label: 'LED berkedip (pin 13)',
    circuit: () => ({
      parts: [
        { id: 'uno', type: 'arduino', x: UNO_POS.x, y: UNO_POS.y, props: {} },
        { id: 'r1', type: 'resistor', x: 140, y: 150, props: { ohms: 220 } },
        { id: 'led1', type: 'led', x: 260, y: 130, props: { color: 'red' } },
      ],
      wires: [
        W('w1', 'uno', '13', 'r1', 'a', '#2563eb'),
        W('w2', 'r1', 'b', 'led1', 'anode', '#2563eb'),
        W('w3', 'led1', 'cathode', 'uno', 'GND_T', '#1f2937'),
      ],
    }),
  },
  button: {
    label: 'Tombol + LED',
    circuit: () => ({
      parts: [
        { id: 'uno', type: 'arduino', x: UNO_POS.x, y: UNO_POS.y, props: {} },
        { id: 'btn1', type: 'button', x: 520, y: 150, props: { pressed: false } },
        { id: 'r1', type: 'resistor', x: 140, y: 150, props: { ohms: 220 } },
        { id: 'led1', type: 'led', x: 260, y: 130, props: { color: 'green' } },
      ],
      wires: [
        W('w1', 'uno', '13', 'r1', 'a', '#2563eb'),
        W('w2', 'r1', 'b', 'led1', 'anode', '#2563eb'),
        W('w3', 'led1', 'cathode', 'uno', 'GND_T', '#1f2937'),
        W('w4', 'btn1', 'a', 'uno', '2', '#16a34a'),
        W('w5', 'btn1', 'b', 'uno', 'GND_1', '#1f2937'),
      ],
    }),
  },
  sensor: {
    label: 'Ultrasonic + buzzer + servo',
    circuit: () => ({
      parts: [
        { id: 'uno', type: 'arduino', x: UNO_POS.x, y: UNO_POS.y, props: {} },
        { id: 'us1', type: 'ultrasonic', x: 60, y: 120, props: { distance: 100 } },
        { id: 'buz1', type: 'buzzer', x: 400, y: 120, props: {} },
        { id: 'servo1', type: 'servo', x: 600, y: 110, props: {} },
      ],
      wires: [
        W('w1', 'us1', 'vcc', 'uno', '5V', '#dc2626'),
        W('w2', 'us1', 'trig', 'uno', '7', '#2563eb'),
        W('w3', 'us1', 'echo', 'uno', '6', '#16a34a'),
        W('w4', 'us1', 'gnd', 'uno', 'GND_T', '#1f2937'),
        W('w5', 'buz1', 'plus', 'uno', '8', '#d97706'),
        W('w6', 'buz1', 'minus', 'uno', 'GND_2', '#1f2937'),
        W('w7', 'servo1', 'signal', 'uno', '9', '#9333ea'),
        W('w8', 'servo1', 'vcc', 'uno', '5V', '#dc2626'),
        W('w9', 'servo1', 'gnd', 'uno', 'GND_1', '#1f2937'),
      ],
    }),
  },
};
