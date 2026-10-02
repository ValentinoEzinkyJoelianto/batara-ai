import { useEffect, useRef, useState } from 'react';
import { runPythonCode } from './simulator/pythonRuntime';

const LED_PIN = 13;

export default function ArduinoSimulator({ code, runTrigger }) {
  const [ledOn, setLedOn] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(0);

  const [servoAngle, setServoAngle] = useState(90);

  const [ultrasonicDistance, setUltrasonicDistance] = useState(50);
  const ultrasonicDistanceRef = useRef(50);
  useEffect(() => {
    ultrasonicDistanceRef.current = ultrasonicDistance;
  }, [ultrasonicDistance]);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (runTrigger === 0) return;

    const thisRunId = ++runIdRef.current;
    setError('');
    setOutput('');
    setLedOn(false);
    setServoAngle(90);
    setRunning(true);

    runPythonCode(code, {
      onPinChange: (pin, value) => {
        if (runIdRef.current !== thisRunId) return;
        if (pin === LED_PIN) setLedOn(value > 0);
      },
      onServoChange: (pin, angle) => {
        if (runIdRef.current !== thisRunId) return;
        setServoAngle(Math.max(0, Math.min(180, angle)));
      },
      onUltrasonicPing: () => {
        if (runIdRef.current !== thisRunId) return;
        setPinging(true);
        setTimeout(() => {
          if (runIdRef.current === thisRunId) setPinging(false);
        }, 150);
      },
      getUltrasonicDistance: () => ultrasonicDistanceRef.current,
      onOutput: (text) => {
        if (runIdRef.current !== thisRunId) return;
        setOutput((prev) => prev + text);
      },
      onError: (err) => {
        if (runIdRef.current !== thisRunId) return;
        setError(err);
      },
    })
      .catch(() => {})
      .finally(() => {
        if (runIdRef.current === thisRunId) setRunning(false);
      });
  }, [runTrigger]);

  const needleRotation = servoAngle - 90;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start', marginTop: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: ledOn ? '#ff3b30' : '#3a3a3a',
            boxShadow: ledOn ? '0 0 20px 6px rgba(255,59,48,0.7)' : 'none',
            transition: 'all 100ms linear',
            margin: '0 auto',
          }}
        />
        <p style={{ fontSize: '12px', marginTop: '0.5rem' }}>
          Pin {LED_PIN} LED{running ? ' (running...)' : ''}
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <svg width="100" height="62" viewBox="0 0 100 62">
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#444" strokeWidth="4" />
          <line
            x1="50"
            y1="55"
            x2="50"
            y2="16"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ transition: 'transform 150ms ease' }}
            transform={`rotate(${needleRotation} 50 55)`}
          />
          <circle cx="50" cy="55" r="4" fill="#2563EB" />
        </svg>
        <p style={{ fontSize: '12px', margin: 0 }}>Servo — {servoAngle}°</p>
      </div>

      <div style={{ textAlign: 'center', minWidth: '160px' }}>
        <div
          style={{
            width: '56px',
            height: '36px',
            margin: '0 auto',
            borderRadius: '6px',
            background: '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            position: 'relative',
          }}
        >
          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#888' }} />
          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#888' }} />
          {pinging && (
            <span
              style={{
                position: 'absolute',
                inset: '-6px',
                border: '2px solid #2563EB',
                borderRadius: '10px',
                opacity: 0.7,
              }}
            />
          )}
        </div>
        <p style={{ fontSize: '12px', margin: '0.4rem 0 0.2rem' }}>Ultrasonic — {ultrasonicDistance} cm</p>
        <input
          type="range"
          min="2"
          max="400"
          value={ultrasonicDistance}
          onChange={(e) => setUltrasonicDistance(Number(e.target.value))}
          style={{ width: '140px' }}
        />
        <p style={{ fontSize: '10px', color: '#888', margin: '0.2rem 0 0' }}>
          Drag to simulate object distance
        </p>
      </div>

      <div style={{ flex: 1, minWidth: '200px' }}>
        {error && (
          <pre style={{ color: '#ff6b6b', background: '#2a1414', padding: '0.5rem', borderRadius: '6px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {error}
          </pre>
        )}
        {output && (
          <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '0.5rem', borderRadius: '6px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}