import * as Blockly from 'blockly/core';
import { pythonGenerator, Order } from 'blockly/python';

const SHIM_START = '# batara:start';
const SHIM_END = '# batara:end';

const SHIM = [
  SHIM_START,
  'try:',
  '    pinMode',
  'except NameError:',
  '    import time as _time',
  '    import threading as _threading',
  '    HIGH = 1',
  '    LOW = 0',
  "    OUTPUT = 'OUTPUT'",
  "    INPUT = 'INPUT'",
  "    INPUT_PULLUP = 'INPUT_PULLUP'",
  '    _t0 = _time.time()',
  '    _handlers = []',
  '    def _level(v):',
  "        return 1 if str(v).upper() in ('HIGH', '1', 'TRUE', 'ON') else 0",
  '    def pinMode(pin, mode):',
  "        print('[pinMode] pin', pin, '=', mode)",
  '    def digitalWrite(pin, value):',
  "        print('[digitalWrite] pin', pin, '->', 'HIGH' if _level(value) else 'LOW')",
  '    def digitalRead(pin):',
  '        return 0',
  '    def analogRead(pin):',
  '        return 512',
  '    def analogWrite(pin, value):',
  "        print('[analogWrite] pin', pin, '->', value)",
  '    def delay(ms):',
  '        _time.sleep(ms / 1000.0)',
  '    def _tick():',
  '        _time.sleep(0.001)',
  '    def millis():',
  '        return int((_time.time() - _t0) * 1000)',
  '    def tone(pin, freq, duration=None):',
  "        print('[tone] pin', pin, '->', freq, 'Hz')",
  '        if duration is not None:',
  '            _time.sleep(duration / 1000.0)',
  "            print('[noTone] pin', pin)",
  '    def noTone(pin):',
  "        print('[noTone] pin', pin)",
  '    def servoWrite(pin, angle):',
  "        print('[servo] pin', pin, '->', angle, 'derajat')",
  '    def readUltrasonic(trig, echo):',
  '        return 100',
  '    def when_start(fn):',
  "        _handlers.append(('start', None, fn))",
  '    def when_key_pressed(key, fn):',
  "        print('[info] event tombol keyboard hanya bekerja di simulator BATARA-AI')",
  '    def when_pin(pin, edge, fn):',
  "        print('[info] event pin hanya bekerja di simulator BATARA-AI')",
  '    def when_message(name, fn):',
  "        _handlers.append(('message', name, fn))",
  '    def _run_async(fn):',
  '        t = _threading.Thread(target=fn)',
  '        t.daemon = True',
  '        t.start()',
  '        return t',
  '    def broadcast(name):',
  '        for h in _handlers:',
  "            if h[0] == 'message' and h[1] == name:",
  '                _run_async(h[2])',
  '    def broadcast_and_wait(name):',
  "        ts = [_run_async(h[2]) for h in _handlers if h[0] == 'message' and h[1] == name]",
  '        for t in ts:',
  '            t.join()',
  '    def stop_all():',
  '        import os',
  '        os._exit(0)',
  '    def start_events():',
  "        ts = [_run_async(h[2]) for h in _handlers if h[0] == 'start']",
  '        try:',
  '            while any(t.is_alive() for t in ts):',
  '                _time.sleep(0.05)',
  '        except KeyboardInterrupt:',
  '            pass',
  SHIM_END,
].join('\n');

export function splitShim(code) {
  const text = String(code || '');
  const a = text.indexOf(SHIM_START);
  const b = text.indexOf(SHIM_END);
  if (a < 0 || b < a) return { shim: '', program: text.replace(/^\n+/, '') };
  const shim = text.slice(a, b + SHIM_END.length);
  const program = (text.slice(0, a) + text.slice(b + SHIM_END.length)).replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
  return { shim, program };
}

function addShim(gen) {
  gen.definitions_.batara_shim = SHIM;
}

const pyStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const val = (block, gen, name, dflt = '0', order = Order.NONE) => gen.valueToCode(block, name, order) || dflt;

const HAT_TYPES = new Set(['event_when_start', 'event_when_key', 'event_when_pin', 'event_when_message']);

function hatCode(block, gen, base, register) {
  addShim(gen);
  const next = block.getNextBlock();
  let body = next ? gen.blockToCode(next) : '';
  if (Array.isArray(body)) body = body[0];
  body = body && body.trim() ? gen.prefixLines(body, gen.INDENT) : gen.INDENT + 'pass\n';
  const name = gen.nameDB_.getDistinctName(base, Blockly.Names.NameType.PROCEDURE);
  gen.__usesEvents = true;
  const vars = Blockly.Variables.allUsedVarModels(block.workspace) || [];
  const globals = vars.map((v) => gen.getVariableName(v.getId()));
  const globalLine = globals.length ? `${gen.INDENT}global ${globals.join(', ')}\n` : '';
  return `def ${name}():\n${globalLine}${body}${register(name)}\n`;
}

export const forBlock = {
  arduino_pin_mode(block, gen) {
    addShim(gen);
    return `pinMode(${block.getFieldValue('PIN')}, '${block.getFieldValue('MODE')}')\n`;
  },
  arduino_digital_write(block, gen) {
    addShim(gen);
    return `digitalWrite(${block.getFieldValue('PIN')}, '${block.getFieldValue('STATE')}')\n`;
  },
  arduino_digital_read(block, gen) {
    addShim(gen);
    return [`digitalRead(${block.getFieldValue('PIN')})`, Order.FUNCTION_CALL];
  },
  arduino_analog_read(block, gen) {
    addShim(gen);
    return [`analogRead('${block.getFieldValue('PIN')}')`, Order.FUNCTION_CALL];
  },
  arduino_analog_write(block, gen) {
    addShim(gen);
    return `analogWrite(${block.getFieldValue('PIN')}, ${val(block, gen, 'VALUE')})\n`;
  },
  arduino_delay(block, gen) {
    addShim(gen);
    return `delay(${val(block, gen, 'MS')})\n`;
  },
  arduino_tone(block, gen) {
    addShim(gen);
    return `tone(${block.getFieldValue('PIN')}, ${val(block, gen, 'FREQUENCY')})\n`;
  },
  arduino_tone_duration(block, gen) {
    addShim(gen);
    return `tone(${block.getFieldValue('PIN')}, ${val(block, gen, 'FREQUENCY')}, ${val(block, gen, 'DURATION')})\n`;
  },
  arduino_no_tone(block, gen) {
    addShim(gen);
    return `noTone(${block.getFieldValue('PIN')})\n`;
  },
  arduino_ultrasonic_read(block, gen) {
    addShim(gen);
    return [`readUltrasonic(${block.getFieldValue('TRIG_PIN')}, ${block.getFieldValue('ECHO_PIN')})`, Order.FUNCTION_CALL];
  },
  arduino_servo_write(block, gen) {
    addShim(gen);
    return `servoWrite(${block.getFieldValue('PIN')}, ${val(block, gen, 'ANGLE')})\n`;
  },
  arduino_button_pressed(block, gen) {
    addShim(gen);
    return [`digitalRead(${block.getFieldValue('PIN')}) == 0`, Order.RELATIONAL];
  },
  arduino_millis(block, gen) {
    addShim(gen);
    return ['millis()', Order.FUNCTION_CALL];
  },
  arduino_map(block, gen) {
    const v = val(block, gen, 'VALUE', '0', Order.ADDITIVE);
    const fl = val(block, gen, 'FROM_LOW', '0', Order.ADDITIVE);
    const fh = val(block, gen, 'FROM_HIGH', '1023', Order.ADDITIVE);
    const tl = val(block, gen, 'TO_LOW', '0', Order.ADDITIVE);
    const th = val(block, gen, 'TO_HIGH', '255', Order.ADDITIVE);
    return [`((${v} - ${fl}) * (${th} - ${tl}) / (${fh} - ${fl}) + ${tl})`, Order.ATOMIC];
  },

  event_when_start: (block, gen) => hatCode(block, gen, 'on_start', (n) => `when_start(${n})\n`),
  event_when_key: (block, gen) => hatCode(block, gen, 'on_key_' + block.getFieldValue('KEY'), (n) => `when_key_pressed(${pyStr(block.getFieldValue('KEY'))}, ${n})\n`),
  event_when_pin: (block, gen) => hatCode(block, gen, 'on_pin_' + block.getFieldValue('PIN'), (n) => `when_pin(${block.getFieldValue('PIN')}, '${block.getFieldValue('EDGE')}', ${n})\n`),
  event_when_message: (block, gen) => hatCode(block, gen, 'on_message', (n) => `when_message(${pyStr(block.getFieldValue('MESSAGE'))}, ${n})\n`),
  event_broadcast(block, gen) {
    addShim(gen);
    return `broadcast(${pyStr(block.getFieldValue('MESSAGE'))})\n`;
  },
  event_broadcast_wait(block, gen) {
    addShim(gen);
    return `broadcast_and_wait(${pyStr(block.getFieldValue('MESSAGE'))})\n`;
  },

  control_forever(block, gen) {
    addShim(gen);
    const body = gen.statementToCode(block, 'DO') || gen.PASS;
    return `while True:\n${body}${gen.INDENT}_tick()\n`;
  },
  control_wait_seconds(block, gen) {
    addShim(gen);
    return `delay(${val(block, gen, 'SECONDS', '1', Order.MULTIPLICATIVE)} * 1000)\n`;
  },
  control_wait_until(block, gen) {
    addShim(gen);
    return `while not (${val(block, gen, 'CONDITION', 'False')}):\n${gen.INDENT}_tick()\n`;
  },
  control_stop_all(block, gen) {
    addShim(gen);
    return 'stop_all()\n';
  },
};

if (!pythonGenerator.__bataraInstalled) {
  pythonGenerator.__bataraInstalled = true;
  Object.assign(pythonGenerator.forBlock, forBlock);

  const origScrub = pythonGenerator.scrub_;
  pythonGenerator.scrub_ = function scrub(block, code, thisOnly) {
    if (HAT_TYPES.has(block.type)) return code;
    return origScrub.call(this, block, code, thisOnly);
  };

  const origInit = pythonGenerator.init;
  pythonGenerator.init = function init(workspace) {
    this.__usesEvents = false;
    return origInit.call(this, workspace);
  };

  const origFinish = pythonGenerator.finish;
  pythonGenerator.finish = function finish(code) {
    const usesEvents = this.__usesEvents;
    const out = origFinish.call(this, code);
    return usesEvents ? out.replace(/\n*$/, '\n') + '\nstart_events()\n' : out;
  };
}