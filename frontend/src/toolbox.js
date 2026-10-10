const num = (n) => `<shadow type="math_number"><field name="NUM">${n}</field></shadow>`;
const text = (t) => `<shadow type="text"><field name="TEXT">${t}</field></shadow>`;
const value = (name, inner) => `<value name="${name}">${inner}</value>`;
const block = (type, { fields = {}, values = {}, mutation = '' } = {}) => {
  const f = Object.entries(fields).map(([k, v]) => `<field name="${k}">${v}</field>`).join('');
  const v = Object.entries(values).map(([k, inner]) => value(k, inner)).join('');
  return `<block type="${type}">${mutation}${f}${v}</block>`;
};
const category = (name, colour, body, extra = '') => `<category name="${name}" colour="${colour}"${extra}>${body}</category>`;

const events = [
  block('event_when_start'),
  block('event_when_key', { fields: { KEY: 'space' } }),
  block('event_when_pin', { fields: { PIN: '2', EDGE: 'FALLING' } }),
  block('event_when_message'),
  block('event_broadcast'),
  block('event_broadcast_wait'),
].join('');

const control = [
  block('control_forever'),
  block('controls_repeat_ext', { values: { TIMES: num(10) } }),
  block('controls_whileUntil'),
  block('controls_for', { fields: { VAR: 'i' }, values: { FROM: num(1), TO: num(10), BY: num(1) } }),
  block('controls_forEach'),
  block('controls_if'),
  block('controls_if', { mutation: '<mutation else="1"></mutation>' }),
  block('controls_flow_statements'),
  block('control_wait_seconds', { values: { SECONDS: num(1) } }),
  block('control_wait_until'),
  block('arduino_delay', { values: { MS: num(1000) } }),
  block('control_stop_all'),
].join('');

const logic = [
  block('logic_compare'), block('logic_operation'), block('logic_negate'), block('logic_boolean'), block('logic_ternary'),
].join('');

const math = [
  block('math_number'),
  block('math_arithmetic', { values: { A: num(1), B: num(1) } }),
  block('math_modulo', { values: { DIVIDEND: num(10), DIVISOR: num(3) } }),
  block('math_single', { values: { NUM: num(9) } }),
  block('math_round', { values: { NUM: num(3.1) } }),
  block('math_constrain', { values: { VALUE: num(50), LOW: num(1), HIGH: num(100) } }),
  block('math_random_int', { values: { FROM: num(1), TO: num(100) } }),
  block('math_random_float'),
  block('math_number_property', { values: { NUMBER_TO_CHECK: num(0) } }),
  block('math_trig', { values: { NUM: num(45) } }),
  block('math_constant'),
  block('arduino_map', { values: { VALUE: num(512), FROM_LOW: num(0), FROM_HIGH: num(1023), TO_LOW: num(0), TO_HIGH: num(255) } }),
].join('');

const texts = [
  block('text'),
  block('text_print', { values: { TEXT: text('Hello') } }),
  block('text_join'),
  block('text_length', { values: { VALUE: text('abc') } }),
  block('text_isEmpty', { values: { VALUE: text('') } }),
  block('text_indexOf', { values: { VALUE: '<block type="variables_get"></block>', FIND: text('a') } }),
  block('text_charAt', { values: { VALUE: '<block type="variables_get"></block>' } }),
  block('text_changeCase', { values: { TEXT: text('abc') } }),
].join('');

const lists = [
  block('lists_create_with', { mutation: '<mutation items="3"></mutation>' }),
  block('lists_repeat', { values: { NUM: num(5) } }),
  block('lists_length'),
  block('lists_isEmpty'),
  block('lists_indexOf'),
  block('lists_getIndex'),
  block('lists_setIndex'),
  block('lists_getSublist'),
  block('lists_split', { values: { DELIM: text(',') } }),
  block('lists_sort'),
  block('lists_reverse'),
].join('');

const arduinoOut = [
  block('arduino_pin_mode', { fields: { PIN: '13', MODE: 'OUTPUT' } }),
  block('arduino_digital_write', { fields: { PIN: '13', STATE: 'HIGH' } }),
  block('arduino_analog_write', { fields: { PIN: '9' }, values: { VALUE: num(128) } }),
  block('arduino_tone', { fields: { PIN: '8' }, values: { FREQUENCY: num(440) } }),
  block('arduino_tone_duration', { fields: { PIN: '8' }, values: { FREQUENCY: num(440), DURATION: num(500) } }),
  block('arduino_no_tone', { fields: { PIN: '8' } }),
  block('arduino_servo_write', { fields: { PIN: '9' }, values: { ANGLE: num(90) } }),
].join('');

const arduinoIn = [
  block('arduino_digital_read', { fields: { PIN: '2' } }),
  block('arduino_button_pressed', { fields: { PIN: '2' } }),
  block('arduino_analog_read', { fields: { PIN: 'A0' } }),
  block('arduino_ultrasonic_read', { fields: { TRIG_PIN: '7', ECHO_PIN: '6' } }),
  block('arduino_millis'),
].join('');

export const toolboxXml = `<xml xmlns="https://developers.google.com/blockly/xml">
${category('Events', '#D9960A', events)}
${category('Control', '#E07B28', control)}
${category('Logic', 210, logic)}
${category('Math', 230, math)}
${category('Text', 160, texts)}
${category('Lists', 260, lists)}
${category('Variables', 330, '', ' custom="VARIABLE"')}
${category('Functions', 290, '', ' custom="PROCEDURE"')}
${category('Arduino Output', 190, arduinoOut)}
${category('Arduino Input', 175, arduinoIn)}
</xml>`;
