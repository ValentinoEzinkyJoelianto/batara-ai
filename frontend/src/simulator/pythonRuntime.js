function toJs(pyValue) {
  try {
    if (Sk.ffi && typeof Sk.ffi.remapToJs === 'function') {
      return Sk.ffi.remapToJs(pyValue);
    }
  } catch {
    // fall through to the .v fallback below
  }
  return pyValue && pyValue.v !== undefined ? pyValue.v : pyValue;
}

export function runPythonCode(code, { onPinChange, onOutput, onError }) {
  const pinState = {};
  let audioCtx = null;
  let oscillator = null;

  function setPin(pin, value) {
    pinState[pin] = value;
    if (onPinChange) onPinChange(pin, value);
  }

  function stopTone() {
    if (oscillator) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch {
        // already stopped — ignore
      }
      oscillator = null;
    }
  }

  Sk.configure({
    output: (text) => {
      if (onOutput) onOutput(text);
    },
    read: (filename) => {
      if (
        Sk.builtinFiles === undefined ||
        Sk.builtinFiles.files[filename] === undefined
      ) {
        throw new Error(`File not found: '${filename}'`);
      }
      return Sk.builtinFiles.files[filename];
    },
    __future__: Sk.python3,
  });

  Sk.builtins.pinMode = new Sk.builtin.func((pin, mode) => {
    return Sk.builtin.none.none$;
  });

  Sk.builtins.digitalWrite = new Sk.builtin.func((pin, state) => {
    const pinNum = toJs(pin);
    const stateStr = toJs(state);
    setPin(pinNum, stateStr === 'HIGH' ? 1 : 0);
    return Sk.builtin.none.none$;
  });

  Sk.builtins.digitalRead = new Sk.builtin.func((pin) => {
    const pinNum = toJs(pin);
    return new Sk.builtin.int_(pinState[pinNum] || 0);
  });

  Sk.builtins.analogRead = new Sk.builtin.func((pin) => {
    return new Sk.builtin.int_(0);
  });

  Sk.builtins.analogWrite = new Sk.builtin.func((pin, value) => {
    const pinNum = toJs(pin);
    const val = toJs(value);
    setPin(pinNum, val);
    return Sk.builtin.none.none$;
  });

  Sk.builtins.delay = new Sk.builtin.func((ms) => {
    const msValue = toJs(ms);
    const susp = new Sk.misceval.Suspension();
    susp.resume = () => Sk.builtin.none.none$;
    susp.data = {
      type: 'Sk.promise',
      promise: new Promise((resolve) => setTimeout(resolve, msValue)),
    };
    return susp;
  });

  Sk.builtins.tone = new Sk.builtin.func((pin, frequency) => {
    const freqValue = toJs(frequency);
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    stopTone();
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = freqValue;
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    return Sk.builtin.none.none$;
  });

  Sk.builtins.noTone = new Sk.builtin.func(() => {
    stopTone();
    return Sk.builtin.none.none$;
  });

  Sk.builtins.readUltrasonicDistance = new Sk.builtin.func(() => {
    return new Sk.builtin.int_(50);
  });

  Sk.builtins.servoWrite = new Sk.builtin.func((pin, angle) => {
    const pinNum = toJs(pin);
    const angleValue = toJs(angle);
    setPin(pinNum, angleValue);
    return Sk.builtin.none.none$;
  });

  return Sk.misceval
    .asyncToPromise(() => Sk.importMainWithBody('<student_code>', false, code, true))
    .catch((err) => {
      if (onError) onError(err.toString());
      throw err;
    })
    .finally(() => {
      stopTone();
    });
}