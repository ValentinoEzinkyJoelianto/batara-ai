import { Order } from 'blockly/python';

// These generate calls against a Python API we define ourselves
// (pinMode, digitalWrite, digitalRead, analogRead, analogWrite, delay) —
// not real Arduino C++. A future runtime (Skulpt or Pyodide, TBD) will
// provide these as global functions that drive the client-side simulator.
export const forBlock = {
  arduino_pin_mode(block) {
    const pin = block.getFieldValue('PIN');
    const mode = block.getFieldValue('MODE');
    return `pinMode(${pin}, '${mode}')\n`;
  },

  arduino_digital_write(block) {
    const pin = block.getFieldValue('PIN');
    const state = block.getFieldValue('STATE');
    return `digitalWrite(${pin}, '${state}')\n`;
  },

  arduino_digital_read(block) {
    const pin = block.getFieldValue('PIN');
    const code = `digitalRead(${pin})`;
    return [code, Order.FUNCTION_CALL];
  },

  arduino_analog_read(block) {
    const pin = block.getFieldValue('PIN');
    const code = `analogRead('${pin}')`;
    return [code, Order.FUNCTION_CALL];
  },

  arduino_analog_write(block, generator) {
    const pin = block.getFieldValue('PIN');
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || '0';
    return `analogWrite(${pin}, ${value})\n`;
  },

  arduino_delay(block, generator) {
    const ms = generator.valueToCode(block, 'MS', Order.NONE) || '0';
    return `delay(${ms})\n`;
  },
};