import { evaluate } from './engine.js';

const HIGH_WORDS = new Set(['HIGH', '1', 'TRUE', 'ON']);

export function toLevel(v) {
  if (typeof v === 'string') return HIGH_WORDS.has(v.toUpperCase()) ? 1 : 0;
  return v ? 1 : 0;
}

export class BoardModel {
  constructor(circuit, onChange) {
    this.circuit = circuit || { parts: [], wires: [] };
    this.onChange = onChange || (() => {});
    this.watchers = [];
    this.resetPins();
    this.dead = new Set();
    this.result = null;
    this.recompute();
  }

  powerOff() {
    this.resetPins();
    this.watchers = [];
    this.recompute();
  }

  setCircuit(circuit) {
    this.circuit = circuit;
    this.recompute();
    this.checkWatchers();
  }

  resetPins() {
    this.modes = {}; this.out = {}; this.pwm = {}; this.tone = {}; this.servo = {};
  }

  reset() {
    this.resetPins();
    this.dead = new Set();
    this.watchers = [];
    this.recompute();
  }

  recompute() {
    const r = evaluate(this.circuit, {
      modes: this.modes, out: this.out, pwm: this.pwm, tone: this.tone, servo: this.servo, dead: this.dead,
    });
    for (const [id, led] of Object.entries(r.leds)) if (led.burned) this.dead.add(id);
    this.result = r;
    this.onChange(r);
    return r;
  }

  pinMode(pin, mode) {
    this.modes[String(pin)] = String(mode).toUpperCase();
    this.recompute();
    for (const w of this.watchers) if (w.pin === String(pin)) w.last = this.digitalRead(pin);
    this.checkWatchers();
  }
  digitalWrite(pin, value) {
    const p = String(pin);
    this.out[p] = toLevel(value);
    delete this.pwm[p];
    this.recompute(); this.checkWatchers();
  }
  analogWrite(pin, value) {
    const p = String(pin);
    const v = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
    this.pwm[p] = v / 255;
    this.out[p] = v > 0 ? 1 : 0;
    this.recompute();
  }
  digitalRead(pin) {
    const v = this.result.pinVoltage[String(pin)];
    return v > 2.5 ? 1 : 0;
  }
  analogRead(pin) {
    const name = typeof pin === 'number' ? 'A' + pin : String(pin).toUpperCase();
    const v = this.result.pinVoltage[name] ?? 0;
    return Math.max(0, Math.min(1023, Math.round((v / 5) * 1023)));
  }
  tonePin(pin, freq) {
    this.tone[String(pin)] = Number(freq) || 0;
    this.recompute();
  }
  noTone(pin) {
    delete this.tone[String(pin)];
    this.recompute();
  }
  noToneAll() {
    if (Object.keys(this.tone).length) { this.tone = {}; this.recompute(); }
  }
  servoWrite(pin, angle) {
    this.servo[String(pin)] = Math.max(0, Math.min(180, Number(angle) || 0));
    this.recompute();
  }
  readUltrasonic(trig, echo) {
    const t = String(trig), e = String(echo);
    for (const u of Object.values(this.result.ultrasonics)) {
      if (u.powered && u.trigPin === t && u.echoPin === e) return u.distance;
    }
    return 0;
  }

  setPartProp(partId, prop, value) {
    const parts = this.circuit.parts.map((p) => (p.id === partId ? { ...p, props: { ...p.props, [prop]: value } } : p));
    this.circuit = { ...this.circuit, parts };
    this.recompute();
    this.checkWatchers();
  }

  watchPin(pin, edge, fn) {
    this.watchers.push({ pin: String(pin), edge, last: this.digitalRead(pin), fn });
  }
  checkWatchers() {
    for (const w of this.watchers) {
      const now = this.digitalRead(w.pin);
      if (now !== w.last) {
        const rising = now === 1;
        w.last = now;
        if (w.edge === 'CHANGE' || (w.edge === 'RISING' && rising) || (w.edge === 'FALLING' && !rising)) w.fn();
      }
    }
  }
}
