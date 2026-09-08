import { useEffect, useRef, useState } from 'react';
import { runPythonCode } from './simulator/pythonRuntime';

const LED_PIN = 13;

export default function ArduinoSimulator({ code, runTrigger }) {
  const [ledOn, setLedOn] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (runTrigger === 0) return;

    const thisRunId = ++runIdRef.current;
    setError('');
    setOutput('');
    setLedOn(false);
    setRunning(true);

    runPythonCode(code, {
      onPinChange: (pin, value) => {
        if (runIdRef.current !== thisRunId) return;
        if (pin === LED_PIN) setLedOn(value > 0);
      },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runTrigger]);

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginTop: '1rem' }}>
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
      <div style={{ flex: 1 }}>
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