import { useRef, useState, useEffect, useCallback } from 'react';
import { PART_TYPES, LED_COLORS } from './circuit/parts.js';
import {
  WORLD, addPart, movePart, removePart, setProp, addWire, removeWire, pinPosition,
} from './circuit/circuitState.js';
import './CircuitEditor.css';

const RES_VALUES = [100, 220, 330, 470, 1000, 2200, 4700, 10000];
const BAND_COLORS = ['#111', '#7c3f00', '#dc2626', '#f97316', '#facc15', '#16a34a', '#2563eb', '#7c3aed', '#6b7280', '#f8fafc'];
const fmtOhms = (o) => (o >= 1000 ? `${o / 1000}k` : `${o}`) + ' Ω';

export function resistorBands(ohms) {
  const o = Math.max(0.1, Number(ohms) || 0);
  let d1, d2, m;
  if (o < 10) { d1 = Math.floor(o); d2 = Math.round((o - d1) * 10); m = -1; }
  else { const s = String(Math.round(o)); d1 = Number(s[0]); d2 = Number(s[1] || 0); m = s.length - 2; }
  const mult = m === -1 ? '#c9a227' : m === -2 ? '#c0c0c0' : BAND_COLORS[Math.min(9, m)];
  return [BAND_COLORS[d1], BAND_COLORS[d2], mult, '#c9a227'];
}

function PartBody({ part, result, pressed, onPress, onRelease }) {
  const p = part.props || {};
  switch (part.type) {
    case 'arduino': {
      const pin13 = (result?.pinVoltage?.['13'] ?? 0) > 2.5;
      return (
        <g>
          <rect x="0" y="0" width="300" height="160" rx="10" fill="#0b7f89" stroke="#075e66" strokeWidth="2" />
          <rect x="-8" y="52" width="46" height="46" rx="3" fill="#cbd5e1" stroke="#64748b" />
          <rect x="44" y="0" width="236" height="20" rx="2" fill="#111827" />
          <rect x="92" y="140" width="204" height="20" rx="2" fill="#111827" />
          <rect x="120" y="58" width="70" height="40" rx="3" fill="#111827" />
          <text x="155" y="82" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="system-ui">ATmega328P</text>
          <text x="165" y="125" fontSize="13" fontWeight="800" fill="#e6fbfd" fontFamily="system-ui" letterSpacing="1">ARDUINO UNO</text>
          <circle cx="232" cy="48" r="3.5" fill={pin13 ? '#fde047' : '#4b5563'} />
          {pin13 && <circle cx="232" cy="48" r="9" fill="#fde047" opacity="0.35" />}
          <text x="240" y="51" fontSize="7" fill="#e6fbfd" fontFamily="system-ui">L</text>
        </g>
      );
    }
    case 'led': {
      const st = result?.leds?.[part.id];
      const base = (LED_COLORS[p.color] || LED_COLORS.red).hex;
      const b = st?.brightness || 0;
      const burned = st?.burned;
      return (
        <g data-led-on={b > 0.02 && !burned ? '1' : '0'} data-led-burned={burned ? '1' : '0'}>
          <line x1="8" y1="24" x2="8" y2="44" stroke="#9ca3af" strokeWidth="2" />
          <line x1="22" y1="24" x2="22" y2="44" stroke="#9ca3af" strokeWidth="2" />
          {b > 0.02 && !burned && <circle cx="15" cy="13" r={15 + b * 8} fill={base} opacity={0.18 + b * 0.35} />}
          <path d="M3 24 V13 a12 12 0 0 1 24 0 V24 Z" fill={burned ? '#1f2937' : base} opacity={burned ? 1 : 0.35 + 0.65 * Math.max(b, 0.0)} stroke={burned ? '#000' : base} strokeWidth="1.2" />
          {!burned && <ellipse cx="10" cy="9" rx="2.5" ry="4.5" fill="#fff" opacity="0.5" />}
          {burned && <text x="15" y="18" textAnchor="middle" fontSize="12" fill="#f87171" fontWeight="800">{'✕'}</text>}
        </g>
      );
    }
    case 'resistor': {
      const bands = resistorBands(p.ohms);
      return (
        <g>
          <line x1="2" y1="7" x2="58" y2="7" stroke="#9ca3af" strokeWidth="2" />
          <rect x="12" y="1" width="36" height="12" rx="5" fill="#e8d3a2" stroke="#b79a5b" />
          {bands.map((c, i) => <rect key={i} x={17 + i * 7.5} y="1.5" width="3.2" height="11" fill={c} />)}
        </g>
      );
    }
    case 'button':
      return (
        <g>
          <rect x="6" y="6" width="28" height="28" rx="3" fill="#374151" stroke="#111827" />
          <circle cx="20" cy="20" r={pressed ? 8 : 10} fill={pressed ? '#991b1b' : '#dc2626'} stroke="#7f1d1d" strokeWidth="1.5"
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); onPress(); }}
            onPointerUp={(e) => { e.stopPropagation(); onRelease(); }}
            onPointerCancel={onRelease} />
          <line x1="3" y1="7" x2="8" y2="7" stroke="#9ca3af" strokeWidth="2" />
          <line x1="32" y1="33" x2="37" y2="33" stroke="#9ca3af" strokeWidth="2" />
        </g>
      );
    case 'buzzer': {
      const on = result?.buzzers?.[part.id]?.sounding;
      return (
        <g>
          <line x1="12" y1="34" x2="12" y2="46" stroke="#9ca3af" strokeWidth="2" />
          <line x1="28" y1="34" x2="28" y2="46" stroke="#9ca3af" strokeWidth="2" />
          <circle cx="20" cy="20" r="17" fill="#1f2937" stroke="#030712" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="3.5" fill="#6b7280" />
          <text x="9" y="14" fontSize="8" fill="#e5e7eb" fontWeight="700">+</text>
          {[0, 1, 2].map((i) => <path key={i} className={`ce-wave ${on ? 'ce-wave-on' : ''}`} d={`M${34 + i * 3} ${10} q6 10 0 20`} />)}
        </g>
      );
    }
    case 'servo': {
      const st = result?.servos?.[part.id];
      const ang = st?.angle ?? 90;
      return (
        <g>
          <line x1="60" y1="12" x2="78" y2="12" stroke="#f59e0b" strokeWidth="3" />
          <line x1="60" y1="26" x2="78" y2="26" stroke="#dc2626" strokeWidth="3" />
          <line x1="60" y1="40" x2="78" y2="40" stroke="#78350f" strokeWidth="3" />
          <rect x="0" y="4" width="60" height="44" rx="4" fill="#1e3a8a" stroke="#172554" strokeWidth="1.5" />
          <rect x="6" y="10" width="22" height="32" rx="2" fill="#172554" />
          <circle cx="17" cy="26" r="9" fill="#e5e7eb" stroke="#6b7280" />
          <g transform={`rotate(${ang - 90} 17 26)`} style={{ transition: 'transform 0.35s ease' }}>
            <rect x="15" y="4" width="4" height="22" rx="2" fill="#f8fafc" stroke="#6b7280" />
          </g>
          <text x="44" y="30" textAnchor="middle" fontSize="8" fill="#bfdbfe" fontWeight="700">{st?.powered ? `${Math.round(st.angle ?? 90)}°` : 'off'}</text>
        </g>
      );
    }
    case 'ultrasonic': {
      const st = result?.ultrasonics?.[part.id];
      return (
        <g>
          {[22, 45, 68, 91].map((x) => <line key={x} x1={x} y1="38" x2={x} y2="54" stroke="#9ca3af" strokeWidth="2" />)}
          <rect x="0" y="0" width="110" height="38" rx="4" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.5" />
          {[28, 82].map((cx) => (
            <g key={cx}><circle cx={cx} cy="19" r="14" fill="#cbd5e1" stroke="#475569" strokeWidth="2" /><circle cx={cx} cy="19" r="8" fill="#94a3b8" /></g>
          ))}
          <text x="55" y="22" textAnchor="middle" fontSize="7" fill="#dbeafe" fontWeight="700">HC-SR04</text>
          <text x="55" y="-4" textAnchor="middle" fontSize="8" fill={st?.powered ? '#166534' : '#6b7280'} fontWeight="700">{p.distance} cm</text>
        </g>
      );
    }
    case 'pot': {
      const v = Math.min(1, Math.max(0, Number(p.value ?? 0.5)));
      const ang = -135 + v * 270;
      return (
        <g>
          {[10, 30, 50].map((x) => <line key={x} x1={x} y1="44" x2={x} y2="58" stroke="#9ca3af" strokeWidth="2" />)}
          <rect x="4" y="2" width="52" height="46" rx="6" fill="#1e40af" stroke="#172554" strokeWidth="1.5" />
          <circle cx="30" cy="25" r="17" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1.5" />
          <g transform={`rotate(${ang} 30 25)`}><line x1="30" y1="25" x2="30" y2="12" stroke="#111827" strokeWidth="3" strokeLinecap="round" /></g>
        </g>
      );
    }
    default:
      return null;
  }
}

function wirePath(a, b, aDown, bDown) {
  const d = 36 + Math.min(80, Math.abs(a.x - b.x) * 0.15 + Math.abs(a.y - b.y) * 0.1);
  const c1 = { x: a.x, y: a.y + (aDown ? d : -d) };
  const c2 = { x: b.x, y: b.y + (bDown ? d : -d) };
  return `M${a.x} ${a.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
}

export default function CircuitEditor({ circuit, result, pressedMap, onCircuitChange, onPressChange }) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const wiringRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [wiring, setWiring] = useState(null);

  const toWorld = useCallback((e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }, []);

  const change = (c) => onCircuitChange(c);

  function handleSvgPointerMove(e) {
    const w = toWorld(e);
    if (dragRef.current) {
      const d = dragRef.current;
      change(movePart(circuit, d.id, w.x - d.dx, w.y - d.dy));
    }
    if (wiringRef.current) {
      const ref = wiringRef.current;
      if (Math.hypot(e.clientX - ref.sx, e.clientY - ref.sy) > 5) ref.moved = true;
      setWiring({ from: ref.from, x: w.x, y: w.y });
    }
  }
  function endInteractions() {
    dragRef.current = null;
    if (wiringRef.current && wiringRef.current.moved) { wiringRef.current = null; setWiring(null); }
  }

  function startPartDrag(e, part) {
    e.stopPropagation();
    setSelected({ kind: 'part', id: part.id });
    svgRef.current?.focus();
    if (part.id === 'uno') return;
    const w = toWorld(e);
    dragRef.current = { id: part.id, dx: w.x - part.x, dy: w.y - part.y };
  }

  function pinDown(e, part, pinName) {
    e.stopPropagation();
    const end = { part: part.id, pin: pinName };
    if (wiringRef.current) {
      change(addWire(circuit, wiringRef.current.from, end));
      wiringRef.current = null; setWiring(null);
      return;
    }
    const w = toWorld(e);
    wiringRef.current = { from: end, sx: e.clientX, sy: e.clientY, moved: false };
    setWiring({ from: end, x: w.x, y: w.y });
  }
  function pinUp(e, part, pinName) {
    const ref = wiringRef.current;
    if (!ref) return;
    const end = { part: part.id, pin: pinName };
    const same = ref.from.part === end.part && ref.from.pin === end.pin;
    if (ref.moved && !same) {
      e.stopPropagation();
      change(addWire(circuit, ref.from, end));
      wiringRef.current = null; setWiring(null);
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { wiringRef.current = null; setWiring(null); setSelected(null); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSvgKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      e.preventDefault();
      deleteSelected();
    }
  }
  function deleteSelected() {
    if (!selected) return;
    if (selected.kind === 'wire') change(removeWire(circuit, selected.id));
    else change(removePart(circuit, selected.id));
    setSelected(null);
  }

  const selPart = selected?.kind === 'part' ? circuit.parts.find((p) => p.id === selected.id) : null;
  const pinIsDown = (part, pinName) => PART_TYPES[part.type].pins[pinName].y > PART_TYPES[part.type].h / 2;

  return (
    <div className="ce-wrap">
      <div className="ce-palette">
        <h4>Komponen</h4>
        {Object.entries(PART_TYPES).filter(([, d]) => !d.fixed).map(([type, def]) => (
          <button key={type} type="button" className="ce-pal-btn" data-testid={`add-${type}`} onClick={() => change(addPart(circuit, type))}>
            <svg width="26" height="22" viewBox={`0 0 ${def.w} ${def.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <PartBody part={{ id: '_', type, props: def.defaults || {} }} result={null} />
            </svg>
            {def.label}
          </button>
        ))}
      </div>

      <div className="ce-stage">
        <svg
          ref={svgRef} className="ce-canvas" viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} tabIndex={0}
          data-testid="circuit-canvas"
          onPointerMove={handleSvgPointerMove} onPointerUp={endInteractions} onPointerLeave={endInteractions}
          onPointerDown={() => { setSelected(null); svgRef.current?.focus(); if (wiringRef.current && !wiringRef.current.moved) { wiringRef.current = null; setWiring(null); } }}
          onKeyDown={onSvgKeyDown}
        >
          <defs>
            <pattern id="ce-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#e2e8f0" /></pattern>
          </defs>
          <rect width={WORLD.w} height={WORLD.h} fill="url(#ce-grid)" />

          {circuit.parts.map((part) => {
            const def = PART_TYPES[part.type];
            const isSel = selected?.kind === 'part' && selected.id === part.id;
            return (
              <g key={part.id} transform={`translate(${part.x} ${part.y})`} data-part={part.id}
                className={isSel ? 'ce-selected' : ''}
                style={{ cursor: part.id === 'uno' ? 'default' : 'grab' }}
                onPointerDown={(e) => startPartDrag(e, part)}>
                <PartBody part={part} result={result} pressed={!!pressedMap?.[part.id]}
                  onPress={() => onPressChange(part.id, true)} onRelease={() => onPressChange(part.id, false)} />
                {part.id !== 'uno' && <text className="ce-partlabel" x={def.w / 2} y={-8} textAnchor="middle" style={{ display: part.type === 'ultrasonic' ? 'none' : undefined }}>{part.id}</text>}
                {part.type === 'resistor' && <text className="ce-partlabel" x={30} y={26} textAnchor="middle">{fmtOhms(Number(part.props.ohms))}</text>}
              </g>
            );
          })}

          {circuit.wires.map((w) => {
            const a = pinPosition(circuit, w.from);
            const b = pinPosition(circuit, w.to);
            if (!a || !b) return null;
            const pa = circuit.parts.find((p) => p.id === w.from.part);
            const pb = circuit.parts.find((p) => p.id === w.to.part);
            const d = wirePath(a, b, pinIsDown(pa, w.from.pin), pinIsDown(pb, w.to.pin));
            const sel = selected?.kind === 'wire' && selected.id === w.id;
            return (
              <g key={w.id} data-wire={w.id}>
                <path className="ce-wire-hit" d={d} onPointerDown={(e) => { e.stopPropagation(); setSelected({ kind: 'wire', id: w.id }); svgRef.current?.focus(); }} />
                <path className={`ce-wire ${sel ? 'ce-wire-selected' : ''}`} d={d} stroke={w.color || '#2563eb'} strokeWidth={sel ? 5 : 3.2} />
              </g>
            );
          })}

          {circuit.parts.map((part) => {
            const def = PART_TYPES[part.type];
            return (
              <g key={`pins-${part.id}`} transform={`translate(${part.x} ${part.y})`}>
                {Object.entries(def.pins).map(([name, pin]) => {
                  const armed = wiring && wiring.from.part === part.id && wiring.from.pin === name;
                  const showLabel = part.id === 'uno' && pin.label;
                  return (
                    <g key={name}>
                      <circle cx={pin.x} cy={pin.y} r={part.id === 'uno' ? 4.5 : 5} data-pin={`${part.id}.${name}`}
                        className={armed ? 'ce-pin ce-pin-armed' : 'ce-pin'}
                        onPointerDown={(e) => pinDown(e, part, name)} onPointerUp={(e) => pinUp(e, part, name)} />
                      {showLabel && (
                        <text className="ce-pinlabel" x={pin.x} y={pin.y < 80 ? pin.y + 14 : pin.y - 8} textAnchor="middle">{pin.label}</text>
                      )}
                      {part.id !== 'uno' && pin.label && <text className="ce-partlabel" x={pin.x} y={pin.y + (pin.y > def.h / 2 ? 14 : -8)} textAnchor="middle" style={{ fontSize: 6 }}>{pin.label}</text>}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {wiring && (() => {
            const a = pinPosition(circuit, wiring.from);
            if (!a) return null;
            const pa = circuit.parts.find((p) => p.id === wiring.from.part);
            return <path className="ce-wire" d={wirePath(a, { x: wiring.x, y: wiring.y }, pinIsDown(pa, wiring.from.pin), true)} stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" />;
          })()}
        </svg>

        <div className="ce-props" data-testid="props-panel">
          {!selected && <span className="ce-hint">Tarik dari satu pin ke pin lain untuk membuat kabel. Klik komponen atau kabel untuk mengubah atau menghapusnya.</span>}
          {selected?.kind === 'wire' && (
            <>
              <span>Kabel dipilih</span>
              <button type="button" className="btn btn-danger-outline btn-sm" onClick={deleteSelected}>Hapus kabel</button>
            </>
          )}
          {selPart && (
            <>
              <strong>{PART_TYPES[selPart.type].label} ({selPart.id})</strong>
              {selPart.type === 'led' && (
                <label>Warna
                  <select value={selPart.props.color} onChange={(e) => change(setProp(circuit, selPart.id, 'color', e.target.value))}>
                    {Object.keys(LED_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}
              {selPart.type === 'resistor' && (
                <label>Nilai
                  <select value={selPart.props.ohms} onChange={(e) => change(setProp(circuit, selPart.id, 'ohms', Number(e.target.value)))}>
                    {(RES_VALUES.includes(Number(selPart.props.ohms)) ? RES_VALUES : [...RES_VALUES, Number(selPart.props.ohms)]).map((o) => <option key={o} value={o}>{fmtOhms(o)}</option>)}
                  </select>
                </label>
              )}
              {selPart.type === 'pot' && (
                <label>Posisi {Math.round(selPart.props.value * 100)}%
                  <input type="range" min="0" max="100" value={Math.round(selPart.props.value * 100)} onChange={(e) => change(setProp(circuit, selPart.id, 'value', Number(e.target.value) / 100))} />
                </label>
              )}
              {selPart.type === 'ultrasonic' && (
                <label>Jarak objek {selPart.props.distance} cm
                  <input type="range" min="2" max="400" value={selPart.props.distance} onChange={(e) => change(setProp(circuit, selPart.id, 'distance', Number(e.target.value)))} />
                </label>
              )}
              {selPart.type === 'button' && <span className="ce-hint">Tahan tombol merah pada kanvas untuk menekan.</span>}
              {selPart.id !== 'uno' && <button type="button" className="btn btn-danger-outline btn-sm" onClick={deleteSelected}>Hapus</button>}
            </>
          )}
        </div>

        {result?.warnings?.length > 0 && (
          <ul className="ce-warn" data-testid="warnings">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
