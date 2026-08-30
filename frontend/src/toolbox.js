// Standard Blockly blocks to start with. Custom Arduino-specific blocks
// (digitalWrite, analogRead, delay, etc.) get added here later as their
// own category once we design them against the simulator.
export const toolboxXml = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="Logic" colour="%{BKY_LOGIC_HUE}">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"></block>
  </category>
  <category name="Loops" colour="%{BKY_LOOPS_HUE}">
    <block type="controls_repeat_ext"></block>
    <block type="controls_whileUntil"></block>
  </category>
  <category name="Math" colour="%{BKY_MATH_HUE}">
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
  </category>
  <category name="Text" colour="%{BKY_TEXTS_HUE}">
    <block type="text"></block>
    <block type="text_print"></block>
  </category>
  <category name="Variables" colour="%{BKY_VARIABLES_HUE}" custom="VARIABLE"></category>
  <category name="Functions" colour="%{BKY_PROCEDURES_HUE}" custom="PROCEDURE"></category>
</xml>
`;
