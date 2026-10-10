import { useEffect, useMemo, useRef, useState } from 'react';
import CircuitEditor from './CircuitEditor.jsx';
import { BoardModel } from './circuit/boardModel.js';
import { createRuntime } from './pythonRuntime.js';
import { PRESETS, normalizeCircuit } from './circuit/circuitState.js';

function withPressed(circuit, pressedMap) {
  return {
    ...circuit,
    parts: circuit.parts.map((p) => (p.type === 'button' ? { ...p, props: { ...p.props, pressed: !!pressedMap[p.id] } } : p)),
  };
}

export default function ArduinoSimulator({ code, runTrigger, circuit: circuitProp, onCircuitChange }) {
  const circuit = useMemo(() => normalizeCircuit(circuitProp), [circuitProp]);
  const [pressedMap, setPressedMap] = useState({});
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [serial, setSerial] = useState('');
  const [error, setError] = useState('');

  const frameRef = useRef(0);
  const latestResult = useRef(null);
  const audioRef = useRef({ ctx: null, osc: null, gain: null });
  const boardRef = useRef(null);
  const runtimeRef = useRef(null);

  if (!boardRef.current) {
    boardRef.current = new BoardModel(withPressed(circuit, {}), (r) => {
      latestResult.current = r;
      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(() => { frameRef.current = 0; setResult(latestResult.current); });
      }
    });
    runtimeRef.current = createRuntime({
      board: boardRef.current,
      onOutput: (t) => setSerial((s) => (s + t).slice(-4000)),
      onError: (m) => setError(m),
      onRunningChange: setRunning,
    });
  }

  useEffect(() => { boardRef.current.setCircuit(withPressed(circuit, pressedMap)); }, [circuit, pressedMap]);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSerial(''); setError('');
    ensureAudio();
    runtimeRef.current.run(code || '');
  }, [runTrigger]);

  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      runtimeRef.current.sendKey(e.key);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => () => {
    runtimeRef.current?.stop(true);
    if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = 0; }
    stopTone();
  }, []);

  function handleStop() {
    runtimeRef.current.stop();
    boardRef.current.powerOff();
    setTimeout(() => boardRef.current?.powerOff(), 60);
  }

  function ensureAudio() {
    const a = audioRef.current;
    if (!a.ctx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      a.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (a.ctx?.state === 'suspended') a.ctx.resume();
  }
  function stopTone() {
    const a = audioRef.current;
    if (a.osc) { try { a.osc.stop(); } catch { /* sudah berhenti */ } a.osc.disconnect(); a.osc = null; }
  }
  const soundingFreq = useMemo(() => {
    const b = Object.values(result?.buzzers || {}).find((x) => x.sounding);
    return b ? b.freq : 0;
  }, [result]);
  useEffect(() => {
    const a = audioRef.current;
    if (!soundingFreq || !a.ctx) { stopTone(); return; }
    if (!a.osc) {
      a.osc = a.ctx.createOscillator();
      a.gain = a.ctx.createGain();
      a.gain.gain.value = 0.04;
      a.osc.type = 'square';
      a.osc.connect(a.gain).connect(a.ctx.destination);
      a.osc.start();
    }
    a.osc.frequency.value = soundingFreq;
  }, [soundingFreq]);

  function loadPreset(key) {
    if (!key) return;
    onCircuitChange(PRESETS[key].circuit());
  }

  return (
    <div className="card card-padded" style={{ marginTop: '1rem' }} data-testid="simulator">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Simulator <span className="highlight">Arduino</span></h2>
        <span className={`badge ${running ? '' : 'badge-muted'}`} data-testid="run-state">{running ? 'Berjalan' : 'Berhenti'}</span>
        <div style={{ flex: 1 }} />
        <select className="input" style={{ width: 'auto' }} value="" onChange={(e) => loadPreset(e.target.value)} data-testid="preset-select">
          <option value="">Contoh rangkaian...</option>
          {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
        </select>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { onCircuitChange(null); }} data-testid="clear-circuit">Kosongkan</button>
        <button type="button" className="btn btn-danger-outline btn-sm" onClick={handleStop} data-testid="stop-btn">Stop</button>
      </div>

      <CircuitEditor
        circuit={circuit}
        result={result}
        pressedMap={pressedMap}
        onCircuitChange={onCircuitChange}
        onPressChange={(id, v) => setPressedMap((m) => ({ ...m, [id]: v }))}
      />

      {(serial || error) && (
        <pre data-testid="serial" style={{ margin: '0.75rem 0 0', background: '#111827', color: error ? '#fca5a5' : '#d1d5db', padding: '0.6rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', maxHeight: 140, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {serial}{error ? `\n${error}` : ''}
        </pre>
      )}
    </div>
  );
}
