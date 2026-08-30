import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { pythonGenerator } from 'blockly/python';
import * as en from 'blockly/msg/en';
import { toolboxXml } from './toolbox';
import { bataraTheme } from './theme';
import './blocks/arduinoBlocks';
import { forBlock as arduinoForBlock } from './generators/arduinoGenerators';

Blockly.setLocale(en);
Object.assign(pythonGenerator.forBlock, arduinoForBlock);

export default function BlocklyEditor({ initialXml, onChange }) {
  const blocklyDivRef = useRef(null);
  const workspaceRef = useRef(null);
  const [pythonCode, setPythonCode] = useState('');

  useEffect(() => {
    const toolbox = Blockly.utils.xml.textToDom(toolboxXml);
    const workspace = Blockly.inject(blocklyDivRef.current, {
      toolbox,
      trashcan: true,
      zoom: { controls: true, wheel: true },
      renderer: 'zelos',
      theme: bataraTheme,
    });
    workspaceRef.current = workspace;

    if (initialXml) {
      const dom = Blockly.utils.xml.textToDom(initialXml);
      Blockly.Xml.domToWorkspace(dom, workspace);
    }

    const handleChange = () => {
      const code = pythonGenerator.workspaceToCode(workspace);
      setPythonCode(code);

      if (onChange) {
        const xmlDom = Blockly.Xml.workspaceToDom(workspace);
        const xmlText = Blockly.Xml.domToText(xmlDom);
        onChange({ xml: xmlText, code });
      }
    };

    workspace.addChangeListener(handleChange);

    return () => {
      workspace.removeChangeListener(handleChange);
      workspace.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', height: '600px', gap: '1rem' }}>
      <div ref={blocklyDivRef} style={{ flex: 2, height: '100%' }} />
      <pre
        style={{
          flex: 1,
          height: '100%',
          margin: 0,
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          overflow: 'auto',
          fontSize: '13px',
          borderRadius: '8px',
        }}
      >
        {pythonCode || '# Drag blocks in to generate Python code'}
      </pre>
    </div>
  );
}
