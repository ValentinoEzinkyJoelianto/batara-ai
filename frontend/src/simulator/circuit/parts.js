export const UNO_PINS = (() => {
  const pins = {};
  const digitalOrder = ['GND_T', '13', '12', '11', '10', '9', '8', null, '7', '6', '5', '4', '3', '2', '1', '0'];
  digitalOrder.forEach((name, i) => {
    if (name) pins[name] = { x: 52 + i * 14.5, y: 10, label: name === 'GND_T' ? 'GND' : name };
  });
  const bottom = ['IOREF', 'RESET', '3V3', '5V', 'GND_1', 'GND_2', 'VIN', null, 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  const shortLabel = { IOREF: 'IOR', RESET: 'RST' };
  bottom.forEach((name, i) => {
    if (name) pins[name] = { x: 98 + i * 14.5, y: 150, label: name.startsWith('GND') ? 'GND' : (shortLabel[name] || name) };
  });
  return pins;
})();

export const PART_TYPES = {
  arduino: {
    label: 'Arduino Uno', w: 300, h: 160, pins: UNO_PINS, fixed: true,
  },
  led: {
    label: 'LED', w: 30, h: 46,
    pins: { anode: { x: 22, y: 44, label: '+' }, cathode: { x: 8, y: 44, label: '-' } },
    defaults: { color: 'red' },
  },
  resistor: {
    label: 'Resistor', w: 60, h: 14,
    pins: { a: { x: 2, y: 7, label: '' }, b: { x: 58, y: 7, label: '' } },
    defaults: { ohms: 220 },
  },
  button: {
    label: 'Pushbutton', w: 40, h: 40,
    pins: { a: { x: 3, y: 7, label: '' }, b: { x: 37, y: 33, label: '' } },
    defaults: { pressed: false },
  },
  buzzer: {
    label: 'Piezo Buzzer', w: 40, h: 48,
    pins: { plus: { x: 12, y: 46, label: '+' }, minus: { x: 28, y: 46, label: '-' } },
  },
  servo: {
    label: 'Servo', w: 80, h: 52,
    pins: { signal: { x: 78, y: 12, label: 'SIG' }, vcc: { x: 78, y: 26, label: '5V' }, gnd: { x: 78, y: 40, label: 'GND' } },
  },
  ultrasonic: {
    label: 'Ultrasonic HC-SR04', w: 110, h: 56,
    pins: {
      vcc: { x: 22, y: 54, label: 'VCC' }, trig: { x: 45, y: 54, label: 'TRIG' },
      echo: { x: 68, y: 54, label: 'ECHO' }, gnd: { x: 91, y: 54, label: 'GND' },
    },
    defaults: { distance: 100 },
  },
  pot: {
    label: 'Potentiometer', w: 60, h: 60,
    pins: { one: { x: 10, y: 58, label: '1' }, wiper: { x: 30, y: 58, label: 'W' }, two: { x: 50, y: 58, label: '2' } },
    defaults: { value: 0.5, ohms: 10000 },
  },
};

export const LED_COLORS = {
  red: { vf: 1.9, hex: '#ef4444' },
  green: { vf: 2.1, hex: '#22c55e' },
  yellow: { vf: 2.0, hex: '#eab308' },
  blue: { vf: 3.0, hex: '#3b82f6' },
  white: { vf: 3.0, hex: '#f8fafc' },
};

export function arduinoDigitalNumber(pin) {
  return /^\d+$/.test(pin) ? Number(pin) : null;
}
export const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
export const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
