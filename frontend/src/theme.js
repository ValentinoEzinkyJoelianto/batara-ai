import * as Blockly from 'blockly/core';

// A friendlier, more colorful palette than Blockly's default "Classic" theme —
// aimed at secondary school students, closer to the playful feel of Scratch,
// while keeping Blockly's own rendering engine and Python code generation
// fully intact underneath. Colors are grouped by block category so students
// can visually associate shape + color with meaning.
export const bataraTheme = Blockly.Theme.defineTheme('batara', {
  base: Blockly.Themes.Classic,
  blockStyles: {
    logic_blocks: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#3373CC',
      colourTertiary: '#2E5FA3',
    },
    loop_blocks: {
      colourPrimary: '#0FBD8C',
      colourSecondary: '#0DA57A',
      colourTertiary: '#0B8C68',
    },
    math_blocks: {
      colourPrimary: '#FFAB19',
      colourSecondary: '#EC9C13',
      colourTertiary: '#CF8B17',
    },
    text_blocks: {
      colourPrimary: '#CF63CF',
      colourSecondary: '#BD42BD',
      colourTertiary: '#A63BA6',
    },
    variable_blocks: {
      colourPrimary: '#FF661A',
      colourSecondary: '#E6570E',
      colourTertiary: '#CC4E0D',
    },
    procedure_blocks: {
      colourPrimary: '#8C52FF',
      colourSecondary: '#7A3FE6',
      colourTertiary: '#6B37CC',
    },
  },
  categoryStyles: {
    logic_category: { colour: '#4C97FF' },
    loop_category: { colour: '#0FBD8C' },
    math_category: { colour: '#FFAB19' },
    text_category: { colour: '#CF63CF' },
    variable_category: { colour: '#FF661A' },
    procedure_category: { colour: '#8C52FF' },
  },
  componentStyles: {
    workspaceBackgroundColour: '#F5F7FA',
    toolboxBackgroundColour: '#FFFFFF',
    toolboxForegroundColour: '#333333',
    flyoutBackgroundColour: '#F5F7FA',
    flyoutForegroundColour: '#333333',
    flyoutOpacity: 1,
    scrollbarColour: '#CCCCCC',
    insertionMarkerColour: '#4C97FF',
    insertionMarkerOpacity: 0.4,
    cursorColour: '#4C97FF',
  },
  fontStyle: {
    family: '"Segoe UI", -apple-system, sans-serif',
    weight: '500',
    size: 12,
  },
});