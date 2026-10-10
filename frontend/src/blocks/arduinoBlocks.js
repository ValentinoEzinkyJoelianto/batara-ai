import * as Blockly from 'blockly/core';

const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => [String(i), String(i)]);
const PWM_PINS = ['3', '5', '6', '9', '10', '11'].map((p) => [p, p]);
const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((p) => [p, p]);

export const KEY_OPTIONS = [
  ['space', 'space'], ['up arrow', 'up'], ['down arrow', 'down'], ['left arrow', 'left'], ['right arrow', 'right'], ['enter', 'enter'],
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => [c, c]),
  ...'0123456789'.split('').map((c) => [c, c]),
  ['any key', 'any'],
];

const EVENT_COLOUR = '#D9960A';
const CONTROL_COLOUR = '#E07B28';

Blockly.defineBlocksWithJsonArray([
  {
    type: 'arduino_pin_mode',
    message0: 'set pin %1 mode %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'field_dropdown', name: 'MODE', options: [['OUTPUT', 'OUTPUT'], ['INPUT', 'INPUT'], ['INPUT_PULLUP', 'INPUT_PULLUP']] },
    ],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Configure a digital pin as input or output', helpUrl: '',
  },
  {
    type: 'arduino_digital_write',
    message0: 'digital write pin %1 to %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'field_dropdown', name: 'STATE', options: [['HIGH', 'HIGH'], ['LOW', 'LOW']] },
    ],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Set a digital pin HIGH or LOW', helpUrl: '',
  },
  {
    type: 'arduino_digital_read',
    message0: 'digital read pin %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS }],
    output: 'Number', style: 'arduino_blocks',
    tooltip: 'Read the digital state of a pin (1 or 0)', helpUrl: '',
  },
  {
    type: 'arduino_analog_read',
    message0: 'analog read pin %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: ANALOG_PINS }],
    output: 'Number', style: 'arduino_blocks',
    tooltip: 'Read the analog value (0-1023) from a pin', helpUrl: '',
  },
  {
    type: 'arduino_analog_write',
    message0: 'analog write (PWM) pin %1 to %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: PWM_PINS },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
    ],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Write a PWM value (0-255) to a pin', helpUrl: '',
  },
  {
    type: 'arduino_delay',
    message0: 'wait %1 ms',
    args0: [{ type: 'input_value', name: 'MS', check: 'Number' }],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Pause execution for the given number of milliseconds', helpUrl: '',
  },
  {
    type: 'arduino_tone',
    message0: 'play tone pin %1 frequency %2 Hz',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'input_value', name: 'FREQUENCY', check: 'Number' },
    ],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Play a tone on a buzzer connected to this pin', helpUrl: '',
  },
  {
    type: 'arduino_no_tone',
    message0: 'stop tone pin %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS }],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Stop playing a tone on this pin', helpUrl: '',
  },
  {
    type: 'arduino_ultrasonic_read',
    message0: 'read ultrasonic distance (cm) trig %1 echo %2',
    args0: [
      { type: 'field_dropdown', name: 'TRIG_PIN', options: DIGITAL_PINS },
      { type: 'field_dropdown', name: 'ECHO_PIN', options: DIGITAL_PINS },
    ],
    output: 'Number', style: 'arduino_blocks',
    tooltip: 'Read the distance (in cm) from an HC-SR04 style ultrasonic sensor', helpUrl: '',
  },
  {
    type: 'arduino_servo_write',
    message0: 'set servo pin %1 to %2 degrees',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'input_value', name: 'ANGLE', check: 'Number' },
    ],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Set a servo motor to an angle between 0 and 180 degrees', helpUrl: '',
  },

  {
    type: 'arduino_tone_duration',
    message0: 'play tone pin %1 frequency %2 Hz for %3 ms',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'input_value', name: 'FREQUENCY', check: 'Number' },
      { type: 'input_value', name: 'DURATION', check: 'Number' },
    ],
    previousStatement: null, nextStatement: null, style: 'arduino_blocks',
    tooltip: 'Play a tone, then stop it automatically', helpUrl: '',
  },
  {
    type: 'arduino_button_pressed',
    message0: 'button on pin %1 pressed? (INPUT_PULLUP)',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS }],
    output: 'Boolean', style: 'arduino_blocks',
    tooltip: 'True while the button is held down (button between the pin and GND)', helpUrl: '',
  },
  {
    type: 'arduino_millis',
    message0: 'timer (ms since start)',
    output: 'Number', style: 'arduino_blocks',
    tooltip: 'Milliseconds since the program started', helpUrl: '',
  },
  {
    type: 'arduino_map',
    message0: 'map %1 from %2 - %3 to %4 - %5',
    args0: [
      { type: 'input_value', name: 'VALUE', check: 'Number' },
      { type: 'input_value', name: 'FROM_LOW', check: 'Number' },
      { type: 'input_value', name: 'FROM_HIGH', check: 'Number' },
      { type: 'input_value', name: 'TO_LOW', check: 'Number' },
      { type: 'input_value', name: 'TO_HIGH', check: 'Number' },
    ],
    inputsInline: true, output: 'Number', style: 'arduino_blocks',
    tooltip: 'Re-map a number from one range to another (like Arduino map())', helpUrl: '',
  },

  {
    type: 'event_when_start',
    message0: 'when program starts',
    nextStatement: null, colour: EVENT_COLOUR,
    tooltip: 'Runs when you press Run', helpUrl: '',
  },
  {
    type: 'event_when_key',
    message0: 'when %1 key pressed',
    args0: [{ type: 'field_dropdown', name: 'KEY', options: KEY_OPTIONS }],
    nextStatement: null, colour: EVENT_COLOUR,
    tooltip: 'Runs each time you press this keyboard key while the program is running', helpUrl: '',
  },
  {
    type: 'event_when_pin',
    message0: 'when pin %1 goes %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'field_dropdown', name: 'EDGE', options: [['LOW (button pressed)', 'FALLING'], ['HIGH (button released)', 'RISING'], ['changes', 'CHANGE']] },
    ],
    nextStatement: null, colour: EVENT_COLOUR,
    tooltip: 'Runs when a pin changes, for example when a pushbutton is pressed', helpUrl: '',
  },
  {
    type: 'event_when_message',
    message0: 'when I receive %1',
    args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }],
    nextStatement: null, colour: EVENT_COLOUR,
    tooltip: 'Runs when another script broadcasts this message', helpUrl: '',
  },
  {
    type: 'event_broadcast',
    message0: 'broadcast %1',
    args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }],
    previousStatement: null, nextStatement: null, colour: EVENT_COLOUR,
    tooltip: 'Send a message to every script waiting for it', helpUrl: '',
  },
  {
    type: 'event_broadcast_wait',
    message0: 'broadcast %1 and wait',
    args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }],
    previousStatement: null, nextStatement: null, colour: EVENT_COLOUR,
    tooltip: 'Broadcast and wait until the receiving scripts finish', helpUrl: '',
  },

  {
    type: 'control_forever',
    message0: 'forever %1',
    args0: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null, colour: CONTROL_COLOUR,
    tooltip: 'Repeat the blocks inside until you press Stop', helpUrl: '',
  },
  {
    type: 'control_wait_seconds',
    message0: 'wait %1 seconds',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
    previousStatement: null, nextStatement: null, colour: CONTROL_COLOUR,
    tooltip: 'Pause for a number of seconds', helpUrl: '',
  },
  {
    type: 'control_wait_until',
    message0: 'wait until %1',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    previousStatement: null, nextStatement: null, colour: CONTROL_COLOUR,
    tooltip: 'Pause until the condition becomes true', helpUrl: '',
  },
  {
    type: 'control_stop_all',
    message0: 'stop all',
    previousStatement: null, colour: CONTROL_COLOUR,
    tooltip: 'Stop the whole program', helpUrl: '',
  },
]);
