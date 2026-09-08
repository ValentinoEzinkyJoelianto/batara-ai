import { Order } from 'blockly/python';

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

  arduino_tone(block, generator) {
    const pin = block.getFieldValue('PIN');
    const frequency = generator.valueToCode(block, 'FREQUENCY', Order.NONE) || '440';
    return `tone(${pin}, ${frequency})\n`;
  },

  arduino_no_tone(block) {
    const pin = block.getFieldValue('PIN');
    return `noTone(${pin})\n`;
  },

  arduino_ultrasonic_read(block) {
    const trigPin = block.getFieldValue('TRIG_PIN');
    const echoPin = block.getFieldValue('ECHO_PIN');
    const code = `readUltrasonicDistance(${trigPin}, ${echoPin})`;
    return [code, Order.FUNCTION_CALL];
  },

  arduino_servo_write(block, generator) {
    const pin = block.getFieldValue('PIN');
    const angle = generator.valueToCode(block, 'ANGLE', Order.NONE) || '0';
    return `servoWrite(${pin}, ${angle})\n`;
  },
};