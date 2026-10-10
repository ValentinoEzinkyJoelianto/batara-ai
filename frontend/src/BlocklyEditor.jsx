import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { pythonGenerator } from 'blockly/python';
import * as en from 'blockly/msg/en';
import { toolboxXml } from './toolbox';
import { bataraTheme } from './theme';
import './blocks/arduinoBlocks';
import './generators/arduinoGenerators';

Blockly.setLocale(en);

export default function BlocklyEditor({ initialState, onChange }) {
  const blocklyDivRef = useRef(null);
  const workspaceRef = useRef(null);
  const [pythonCode, setPythonCode] = useState('');
  const [copied, setCopied] = useState(false);

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

    if (initialState && Object.keys(initialState).length > 0) {
      Blockly.serialization.workspaces.load(initialState, workspace);
    }

    const handleChange = () => {
      const code = pythonGenerator.workspaceToCode(workspace);
      setPythonCode(code);

      if (onChange) {
        const state = Blockly.serialization.workspaces.save(workspace);
        onChange({ state, code });
      }
    };

    workspace.addChangeListener(handleChange);

    return () => {
      workspace.removeChangeListener(handleChange);
      workspace.dispose();
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pythonCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  }

  return (
    <div style={{ display: 'flex', height: '600px', gap: '1rem' }}>
      <div ref={blocklyDivRef} style={{ flex: 2, height: '100%' }} />
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
        <pre
          style={{
            flex: 1,
            minHeight: 0,
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
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleCopy}
          disabled={!pythonCode}
        >
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
    </div>
  );
}