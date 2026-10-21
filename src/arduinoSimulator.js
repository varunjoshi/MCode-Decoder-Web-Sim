// Accurate Arduino UNO & script.ino Simulation Engine
// Simulates hardware pins, I2C LiquidCrystal 16x2, debouncing, and Morse decoding logic

import { MORSE_LOOKUP } from './morseData.js';
import { soundEngine } from './audio.js';

export class ArduinoSimulator {
  constructor() {
    // Pin definitions from script.ino
    this.PIN_CARKA = 12; // Dash '-'
    this.PIN_TECKA = 8;  // Dot '.'
    this.PIN_ODDEL = 10; // Separator / Space ' '
    this.DISPLAY_COLUMNS = 16;
    this.DISPLAY_ROWS = 2;

    // Registers and States
    this.carkaButtonState = 0;
    this.carkaButtonLastState = 0;
    this.teckaButtonState = 0;
    this.teckaButtonLastState = 0;
    this.oddelButtonState = 0;
    this.oddelButtonLastState = 0;

    // Buffers from script.ino
    this.tonesBuffer = "";
    this.text = "";

    // LCD display memory
    this.lcdLines = ["", ""];
    this.lcdBacklight = true;
    this.lcdContrast = 85; // 0-100%
    this.isBooting = true;

    // Status & Telemetry
    this.lastAction = "RESET";
    this.lastDecodedChar = null;
    this.history = [];
    this.activeCodeLine = 110; // setup()

    // Event listeners
    this.onStateChangeCallbacks = [];
  }

  // Register listener for UI updates
  subscribe(callback) {
    this.onStateChangeCallbacks.push(callback);
    callback(this.getStateSnapshot());
  }

  notify() {
    const snapshot = this.getStateSnapshot();
    for (const cb of this.onStateChangeCallbacks) {
      cb(snapshot);
    }
  }

  getStateSnapshot() {
    return {
      pins: {
        pin8: this.teckaButtonState,
        pin10: this.oddelButtonState,
        pin12: this.carkaButtonState,
        pin13Led: (this.teckaButtonState || this.carkaButtonState || this.oddelButtonState) ? 1 : 0
      },
      lastPins: {
        pin8: this.teckaButtonLastState,
        pin10: this.oddelButtonLastState,
        pin12: this.carkaButtonLastState
      },
      tonesBuffer: this.tonesBuffer,
      text: this.text,
      lcd: {
        line0: this.lcdLines[0].padEnd(16, ' ').slice(0, 16),
        line1: this.lcdLines[1].padEnd(16, ' ').slice(0, 16),
        backlight: this.lcdBacklight,
        contrast: this.lcdContrast
      },
      lastAction: this.lastAction,
      lastDecodedChar: this.lastDecodedChar,
      activeCodeLine: this.activeCodeLine,
      historyCount: this.history.length
    };
  }

  // Simulate Arduino setup()
  setup() {
    this.isBooting = true;
    this.tonesBuffer = "";
    this.text = "";
    this.carkaButtonState = 0;
    this.carkaButtonLastState = 0;
    this.teckaButtonState = 0;
    this.teckaButtonLastState = 0;
    this.oddelButtonState = 0;
    this.oddelButtonLastState = 0;

    // script.ino boot screen
    this.lcdLines[0] = "Morseovkovnitko";
    this.lcdLines[1] = "6x.Smaze1 6x-Vse";
    this.lastAction = "BOOT";
    this.activeCodeLine = 114;

    this.logHistory("SYSTEM", "Arduino UNO Booted: Morseovkovnitko v1.0 initialized.");
    this.notify();

    setTimeout(() => {
      this.isBooting = false;
      this.notify();
    }, 1200);
  }

  // Reset Arduino (like pushing the hardware reset switch)
  reset() {
    soundEngine.playChime('clear');
    this.setup();
  }

  // Press down a button (sets pin HIGH)
  pressButton(buttonName) {
    soundEngine.playMechanicalClick(false);

    if (buttonName === 'tecka') {
      this.teckaButtonState = 1;
      soundEngine.startTone();
      this.activeCodeLine = 127;
    } else if (buttonName === 'carka') {
      this.carkaButtonState = 1;
      soundEngine.startTone();
      this.activeCodeLine = 126;
    } else if (buttonName === 'oddel') {
      this.oddelButtonState = 1;
      this.activeCodeLine = 128;
    }

    this.notify();
  }

  // Release button (sets pin LOW and triggers Arduino logic on falling edge)
  releaseButton(buttonName) {
    soundEngine.playMechanicalClick(true);
    soundEngine.stopTone();

    if (buttonName === 'tecka') {
      this.teckaButtonState = 0;
    } else if (buttonName === 'carka') {
      this.carkaButtonState = 0;
    } else if (buttonName === 'oddel') {
      this.oddelButtonState = 0;
    }

    // Run Arduino loop logic
    this.executeArduinoLoop();
  }

  // Exact reproduction of getToneFromButtonStates() in script.ino
  getToneFromButtonStates() {
    // vrátí v případě uvolnění tlačítka
    // tedy když nynější stav je 0, předchozí 1 (falling edge)
    if (!this.carkaButtonState && this.carkaButtonLastState) {
      return '-';
    }
    if (!this.teckaButtonState && this.teckaButtonLastState) {
      return '.';
    }
    if (!this.oddelButtonState && this.oddelButtonLastState) {
      return ' ';
    }
    return null;
  }

  // Exact reproduction of getSymbolFromBuffer() in script.ino
  getSymbolFromBuffer() {
    if (this.tonesBuffer === "") {
      return ' '; // udělá mezeru, pokud předtím nejsou žádné znaky
    }

    const symbol = MORSE_LOOKUP.get(this.tonesBuffer);
    if (symbol !== undefined) {
      return symbol;
    }

    return null; // Buffer neodpovídá žádnému symbolu
  }

  // Exact reproduction of extractActionFromTonesBuffer() in script.ino
  extractActionFromTonesBuffer() {
    if (this.tonesBuffer === "......") {
      // 6x tečka: umaže jedno písmeno (backspace)
      if (this.text.length > 0) {
        this.text = this.text.substring(0, this.text.length - 1);
        this.lastAction = "DELETED_ONE_CHAR";
        soundEngine.playChime('delete');
        this.logHistory("ACTION", "Special Code (......): Deleted last character.");
      }
    } else if (this.tonesBuffer === "------") {
      // 6x čárka: smaže celý text
      this.text = "";
      this.lastAction = "CLEARED_ALL";
      soundEngine.playChime('clear');
      this.logHistory("ACTION", "Special Code (------): Cleared all text.");
    } else {
      this.lastAction = "UNKNOWN_CODE";
      this.logHistory("WARN", `Unrecognized sequence: "${this.tonesBuffer}"`);
    }
  }

  // Execute one iteration of void loop() from script.ino
  executeArduinoLoop() {
    const tone = this.getToneFromButtonStates();

    if (tone !== null) {
      if (tone === ' ') {
        this.activeCodeLine = 134; // if (tone == ' ')
        const symbol = this.getSymbolFromBuffer();

        if (symbol !== null) {
          this.activeCodeLine = 138; // if (symbol != (char)0)
          this.text += symbol;
          this.lastDecodedChar = symbol;

          // Pokud přesáhne počet znaků velikost displaye, napíše se nový znak na první místo
          if (this.text.length > this.DISPLAY_COLUMNS) {
            this.text = symbol;
          }

          this.lastAction = `DECODED_${symbol === ' ' ? 'SPACE' : symbol}`;
          soundEngine.playChime('success');
          this.logHistory("DECODE", `Sequence "${this.tonesBuffer || 'EMPTY'}" decoded as '${symbol === ' ' ? '␣ [SPACE]' : symbol}'`);
        } else {
          this.activeCodeLine = 148; // extractActionFromTonesBuffer()
          this.extractActionFromTonesBuffer();
        }

        this.tonesBuffer = ""; // vymaže se buffer (čárky a tečky)
      } else {
        // čárka nebo tečka
        this.activeCodeLine = 155; // tonesBuffer += tone;
        this.tonesBuffer += tone;
        this.lastAction = `APPEND_${tone === '.' ? 'DOT' : 'DASH'}`;

        if (this.tonesBuffer.length > this.DISPLAY_COLUMNS) {
          this.tonesBuffer = tone;
        }

        this.logHistory("INPUT", `Received tone '${tone}', buffer is now: "${this.tonesBuffer}"`);
      }

      // psaní na display se provádí pouze v případě, že bylo zmačknuté nějaké tlačítko
      this.lcdLines[0] = this.text;
      this.lcdLines[1] = this.tonesBuffer;
      this.activeCodeLine = 164;
    }

    // aktualizuje se předchozí stav
    this.carkaButtonLastState = this.carkaButtonState;
    this.teckaButtonLastState = this.teckaButtonState;
    this.oddelButtonLastState = this.oddelButtonState;

    this.notify();
  }

  // Programmatic input: simulate a complete pulse (press & release)
  async pulseButton(buttonName, durationMs = 100) {
    this.pressButton(buttonName);
    await new Promise(resolve => setTimeout(resolve, durationMs));
    this.releaseButton(buttonName);
    await new Promise(resolve => setTimeout(resolve, 60)); // Inter-element debounce
  }

  // Type a raw Morse sequence programmatically (e.g. "... --- ...")
  async transmitMorseSequence(sequence) {
    for (let i = 0; i < sequence.length; i++) {
      const char = sequence[i];
      if (char === '.') {
        await this.pulseButton('tecka', 90);
      } else if (char === '-') {
        await this.pulseButton('carka', 270);
      } else if (char === ' ') {
        await this.pulseButton('oddel', 120);
        await new Promise(resolve => setTimeout(resolve, 150));
      } else if (char === '/') {
        // Word boundary: pulse space twice to generate space
        await this.pulseButton('oddel', 120);
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    // Final delimiter if buffer not empty
    if (this.tonesBuffer.length > 0) {
      await this.pulseButton('oddel', 120);
    }
  }

  logHistory(type, message) {
    const time = new Date().toLocaleTimeString();
    this.history.unshift({ time, type, message });
    if (this.history.length > 50) {
      this.history.pop();
    }
  }

  setBacklight(enabled) {
    this.lcdBacklight = enabled;
    this.notify();
  }

  setContrast(val) {
    this.lcdContrast = Math.max(0, Math.min(100, val));
    this.notify();
  }
}

export const simulator = new ArduinoSimulator();
