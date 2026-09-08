import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as en from 'blockly/msg/en';
import { bataraTheme } from './theme';
import './blocks/arduinoBlocks';

Blockly.setLocale(en);

export default function BlocklyViewer({ workspaceState }) {
  const divRef = useRef(null);

  useEffect(() => {
    const workspace = Blockly.inject(divRef.current, {
      readOnly: true,
      trashcan: false,
      zoom: { controls: true, wheel: true },
      renderer: 'zelos',
      theme: bataraTheme,
    });

    if (workspaceState && Object.keys(workspaceState).length > 0) {
      Blockly.serialization.workspaces.load(workspaceState, workspace);
      workspace.zoomToFit();
      workspace.scrollCenter();
    }

    return () => {
      workspace.dispose();
    };
  }, [workspaceState]);

  return (
    <div
      ref={divRef}
      style={{ height: '400px', width: '100%', border: '1px solid #ccc', borderRadius: '8px' }}
    />
  );
}