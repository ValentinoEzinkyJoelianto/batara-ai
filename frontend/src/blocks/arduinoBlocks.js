import * as Blockly from 'blockly/core';

// Digital pins 0-13 (Arduino Uno layout — adjust later if targeting other boards)
const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => [String(i), String(i)]);

// PWM-capable pins on the Uno
const PWM_PINS = ['3', '5', '6', '9', '10', '11'].map((p) => [p, p]);

// Analog input pins
const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((p) => [p, p]);

Blockly.defineBlocksWithJsonArray([
  {
    type: 'arduino_pin_mode',
    message0: 'set pin %1 mode %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: [
          ['OUTPUT', 'OUTPUT'],
          ['INPUT', 'INPUT'],
          ['INPUT_PULLUP', 'INPUT_PULLUP'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'arduino_blocks',
    tooltip: 'Configure a digital pin as input or output',
    helpUrl: '',
  },
  {
    type: 'arduino_digital_write',
    message0: 'digital write pin %1 to %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['HIGH', 'HIGH'],
          ['LOW', 'LOW'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'arduino_blocks',
    tooltip: 'Set a digital pin HIGH or LOW',
    helpUrl: '',
  },
  {
    type: 'arduino_digital_read',
    message0: 'digital read pin %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS }],
    output: 'Number',
    style: 'arduino_blocks',
    tooltip: 'Read the digital state of a pin (1 or 0)',
    helpUrl: '',
  },
  {
    type: 'arduino_analog_read',
    message0: 'analog read pin %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: ANALOG_PINS }],
    output: 'Number',
    style: 'arduino_blocks',
    tooltip: 'Read the analog value (0-1023) from a pin',
    helpUrl: '',
  },
  {
    type: 'arduino_analog_write',
    message0: 'analog write (PWM) pin %1 to %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: PWM_PINS },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'arduino_blocks',
    tooltip: 'Write a PWM value (0-255) to a pin',
    helpUrl: '',
  },
  {
    type: 'arduino_delay',
    message0: 'wait %1 ms',
    args0: [{ type: 'input_value', name: 'MS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    style: 'arduino_blocks',
    tooltip: 'Pause execution for the given number of milliseconds',
    helpUrl: '',
  },
]);