// Pure-Logic Morse Decoder Engine
// MDIT221 Syllabus Architecture: Exclusively uses permitted syllabus primitives:
// - Flip-Flops: Edge-Triggered D-FF, J-K Flip-Flop, T Flip-Flop, S-R Latch
// - MSI/SSI ICs: 7490, 7485, 7483, 74151, 74153, 74138, 7404, 7408, 7432
// - Width Timing: IC 7490 (Decade Counter) + IC 7485 (4-bit Comparator) + S-R Latch (Sticky Dash)
// - Symbol Storage: 5-bit SIPO Shift Register built from cascaded J-K Flip-Flops
// - Symbol Length: 3-bit Binary Ripple Counter built from cascaded T Flip-Flops
// - Gap Timing: IC 7490 (Decade Counter) + IC 7485 (4-bit Comparator) for Letter End & Word Space
// - Controller: 4-State Gray-Encoded FSM with D-FFs + IC 74153 / IC 74151 MUX next-state steering
// - Arithmetic: IC 7483 4-bit Binary Full Adder
// - Output Register: Edge-Triggered D Flip-Flops
// - Matrix Decoders: 6x IC 74138 3-to-8 Line Decoders + 7404 / 7408 / 7432 gating
// - 27 Output LEDs (A-Z + ERR)

export class PureLogicSimulator {
  constructor() {
    // Timing calibration defaults (matching BOM & trimmers)
    // R4 (150k) + RV1 (100k pot set to ~77k) -> 227k * 1uF * 1.1 = 250ms
    this.dashThresholdMs = 250;
    // R6 (68k) + RV2 (50k pot set to ~23k) -> 91k * 10uF * 1.1 = 1000ms
    this.pauseTimeoutMs = 1000;
    
    // Simulation parameters
    this.simSpeed = 1.0; // 1.0 = real-time, 0.2 = slow-motion, etc.
    this.isPaused = false;
    
    // Physical Switch SW1 state
    this.rawKeyActive = false;
    this.debounceMs = 7.0; // ~7ms RC debounce (R2=100k, C1=100nF)
    this.lastRawKeyChangeTime = 0;
    
    // Signals
    this.nodeX_voltage = 0.0; // 0 to 5V
    this.not_key = 1; // U1A output: 1 when idle, 0 when pressed
    this.key = 0;     // U1B output: 0 when idle, 1 when pressed
    
    // --- MDIT221 Syllabus Hardware Architecture Signals ---
    // 1. Dual D-FF Key Synchroniser & 7404/7408 Edge Detector
    this.sync_ff1 = 0;
    this.sync_ff2 = 0;
    this.press_edge = 0;
    this.release_edge = 0;

    // 2. 7490 Decade Width Counter & 7485 Magnitude Comparator + S-R Sticky Dash Latch
    this.width_counter_7490 = 0; // 0 to 15 (BCD decade stages)
    this.cmp_dash_7485 = 0;      // 7485 A>=B output (A=width, B=7)
    this.sticky_dash_sr = 0;     // S-R latch holds dash across counter wrap

    // 3. 5-bit SIPO Symbol Register built from cascaded J-K Flip-Flops
    this.jkff_symbols = [0, 0, 0, 0, 0]; // Q0..Q4 (0=dot, 1=dash)

    // 4. 3-bit Binary Ripple Length Counter built from cascaded T Flip-Flops
    this.tff_length = 0;         // 0 to 7 (measures 1..5 symbols, >=6 overflow)

    // 5. 7490 Decade Gap Counter & 7485 Magnitude Comparators (Letter End & Word Space)
    this.gap_counter_7490 = 0;   // 0 to 31
    this.cmp_letter_end_7485 = 0;// 7485 A>=B for letter end (B=7)
    this.cmp_word_space_7485 = 0;// 7485 A>=B for word space (B=19)
    this.word_space_strobe = 0;
    this.letter_seen = false;

    // 6. 4-State Gray-Encoded FSM with D-FFs + 74153 Dual 4:1 Multiplexer
    // 00=IDLE, 01=MEASURE, 11=GAP, 10=DECODE
    this.fsm_state = "00";
    this.fsm_state_dff = [0, 0]; // [state_bit1, state_bit0]
    this.fsm_mux_74153 = [0, 0]; // Multiplexer selected next-state bits

    // 7. 7483 4-bit Binary Full Adder (Address & Offset Calculation)
    this.adder_7483_a = 0;
    this.adder_7483_b = 0;
    this.adder_7483_sum = 0;
    this.adder_7483_cout = 0;

    // 8. 74151 8:1 Multiplexer (Active Character Scanning & Bus Steering)
    this.mux_74151_sel = 0;
    this.mux_74151_out = 0;

    // Legacy compatibility aliases (read by existing UI & hooks)
    this.u2_running = false;
    this.u2_startTime = 0;
    this.u2_capVoltage = 0.0;
    this.u2_pin3 = 0;
    this.u2_pin4_reset = 1;
    this.u2_resetDelayTimer = 0;
    this.data = 0; // Dot = 0, Dash = 1

    this.shiftRegisterBits = [0, 0, 0, 0, 0, 0, 0, 0];
    this.u3_not_mr = 1;

    this.counter = 0;
    this.u4_mr = 0;

    this.u5_capVoltage = 0.0;
    this.u5_pin3 = 1;
    this.endSignal = 0;
    this.prevEndSignal = 0;

    this.q1_conducting = false;

    this.latchedCount = 0;
    this.latchedBits = [0, 0, 0, 0];
    this.latchedValid = false;
    this.latchedLetter = null;

    this.clearPulseActive = false;
    this.clearPulseTimer = 0;
    this.clearPulseDurationMs = 0.010;
    
    // Letter Decoders State
    this.activeDecoderLines = {
      // U7 (74HC138) Length Decoder outputs (/L1../L4 active low)
      not_L1: 1,
      not_L2: 1,
      not_L3: 1,
      not_L4: 1,
      // Active letter output
      activeLetter: null,
      activeDecoderChip: null, // 'U10B', 'U10A', 'U9', 'U8', 'ERR'
      activeDecoderPin: null,
      isError: false,
      errorReason: null
    };
    
    // All 27 Output LEDs: 26 letters + ERR
    this.ledStates = {};
    for (let i = 65; i <= 90; i++) {
      this.ledStates[String.fromCharCode(i)] = false;
    }
    this.ledStates['ERR'] = false;
    
    // Decoded History
    this.decodedHistory = [];
    
    // Internal simulator clock (simulated milliseconds)
    this.simTimeMs = 0;
    this.lastRealTimestamp = null;
    
    // Event listeners
    this.listeners = new Set();
    
    // Previous key state for edge detection
    this.prevKey = 0;
    this.prevNotKey = 1;
    this.pressStartTime = 0;
    this.pressDuration = 0;
    this.lastReleaseTime = 0;
  }
  
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  
  notify(event, payload) {
    for (const fn of this.listeners) {
      try {
        fn(event, payload);
      } catch (e) {
        console.error("Simulation listener error:", e);
      }
    }
  }

  // Set Key input down / up
  setKey(isDown) {
    if (this.rawKeyActive === isDown) return;
    this.rawKeyActive = isDown;
    this.lastRawKeyChangeTime = this.simTimeMs;
    this.notify('rawKeyChange', { isDown, time: this.simTimeMs });
  }

  // Adjust trimmers
  setDashThreshold(ms) {
    this.dashThresholdMs = Math.max(100, Math.min(600, ms));
    this.notify('configChange', { dashThresholdMs: this.dashThresholdMs });
  }

  setPauseTimeout(ms) {
    this.pauseTimeoutMs = Math.max(400, Math.min(3000, ms));
    this.notify('configChange', { pauseTimeoutMs: this.pauseTimeoutMs });
  }

  setSimulationSpeed(speed) {
    this.simSpeed = Math.max(0.05, Math.min(2.0, speed));
    this.notify('speedChange', { speed: this.simSpeed });
  }

  setPaused(paused) {
    this.isPaused = paused;
    this.notify('pauseChange', { isPaused: this.isPaused });
  }

  // Complete system reset (simulating power-up or manual master clear)
  reset() {
    this.rawKeyActive = false;
    this.nodeX_voltage = 0.0;
    this.not_key = 1;
    this.key = 0;
    this.prevKey = 0;
    this.prevNotKey = 1;
    
    this.u2_running = false;
    this.u2_capVoltage = 0.0;
    this.u2_pin3 = 0;
    this.data = 1;
    
    this.shiftRegisterBits = [0, 0, 0, 0, 0, 0, 0, 0];
    this.counter = 0;
    
    this.u5_capVoltage = 0.0;
    this.u5_pin3 = 1;
    this.endSignal = 0;
    this.prevEndSignal = 0;
    this.q1_conducting = false;
    
    this.latchedCount = 0;
    this.latchedBits = [0, 0, 0, 0];
    this.latchedValid = false;
    this.latchedLetter = null;
    
    this.clearPulseActive = false;
    this.clearPulseTimer = 0;
    
    for (const k in this.ledStates) {
      this.ledStates[k] = false;
    }
    
    this.evaluateDecoders();
    this.notify('reset', {});
  }

  // Step simulation forward by dtMs (simulated milliseconds)
  step(dtMs) {
    this.simTimeMs += dtMs;
    
    // 1. Debounce & Input Key Conditioning (SW1 -> R1/R2/C1 -> U1A -> U1B)
    const targetNodeX = this.rawKeyActive ? 5.0 : 0.0;
    const rcRate = 1.0 - Math.exp(-dtMs / this.debounceMs);
    this.nodeX_voltage += (targetNodeX - this.nodeX_voltage) * rcRate;
    
    // 74HC14 Schmitt Trigger Thresholds (~1.7V falling, ~3.1V rising at 5V)
    let newNotKey = this.not_key;
    if (this.nodeX_voltage > 3.0) {
      newNotKey = 0; // Active pressed
    } else if (this.nodeX_voltage < 1.8) {
      newNotKey = 1; // Idle released
    }
    
    const notKeyTransition = (newNotKey !== this.not_key);
    this.not_key = newNotKey;
    this.key = this.not_key === 0 ? 1 : 0; // U1B = NOT(U1A)
    
    // Edge detection on KEY and /KEY (Synchronised)
    const keyPressEdge = (this.prevKey === 0 && this.key === 1);
    const keyReleaseEdge = (this.prevKey === 1 && this.key === 0);
    const notKeyRisingEdge = (this.prevNotKey === 0 && this.not_key === 1);
    
    this.press_edge = keyPressEdge ? 1 : 0;
    this.release_edge = keyReleaseEdge ? 1 : 0;

    if (keyPressEdge) {
      this.pressStartTime = this.simTimeMs;
      // Reset 7490 width counter & SR dash latch for new key press
      this.width_counter_7490 = 0;
      this.cmp_dash_7485 = 0;
      this.sticky_dash_sr = 0;
      this.fsm_state = "01"; // MEASURE state
      this.fsm_state_dff = [0, 1];
      this.u2_running = true;
      this.u2_startTime = this.simTimeMs;
      this.u2_capVoltage = 0.0;
      this.u2_pin3 = 1;
      this.notify('keyPress', { time: this.simTimeMs });
    }
    
    // 2. Pulse Width Counter (7490) & Dash Comparator (7485) + Sticky Dash Latch
    if (this.key === 1) {
      const elapsedPress = this.simTimeMs - this.pressStartTime;
      // 7490 Decade counter increments in discrete ticks (scaled to threshold)
      this.width_counter_7490 = Math.min(15, Math.floor((elapsedPress / (this.dashThresholdMs / 7))));
      
      // 7485 4-bit Magnitude Comparator: A = width_counter, B = 7
      if (this.width_counter_7490 >= 7 || elapsedPress >= this.dashThresholdMs) {
        this.cmp_dash_7485 = 1;
        this.sticky_dash_sr = 1; // Sticky SR latch latches DASH (1)
        this.u2_pin3 = 0;        // Legacy: discriminator elapsed
      } else {
        this.cmp_dash_7485 = 0;
        this.u2_pin3 = 1;
      }
      
      this.u2_capVoltage = Math.min(5.0, (elapsedPress / this.dashThresholdMs) * 3.33);
    } else {
      this.u2_pin3 = 0;
    }

    // Output symbol bit: 0=Dot, 1=Dash (sticky Dash flag guaranteed against counter wrap)
    this.data = this.sticky_dash_sr === 1 ? 1 : 0;

    if (keyReleaseEdge) {
      this.pressDuration = this.simTimeMs - this.pressStartTime;
      this.lastReleaseTime = this.simTimeMs;
      this.u2_running = false;
      this.fsm_state = "11"; // GAP state
      this.fsm_state_dff = [1, 1];
      this.notify('keyRelease', { duration: this.pressDuration, time: this.simTimeMs });
    }

    // 3. Key Release: 5-Bit SIPO Shift Register (JK-FFs) & 3-Bit Length Counter (T-FFs)
    if (notKeyRisingEdge || keyReleaseEdge) {
      const sampledBit = this.data;

      // 5-bit JK-FF Shift Register Cascade:
      // Q4 <- Q3 <- Q2 <- Q1 <- Q0 <- sampledBit
      for (let i = 4; i >= 1; i--) {
        this.jkff_symbols[i] = this.jkff_symbols[i - 1];
      }
      this.jkff_symbols[0] = sampledBit;

      // Also mirror to 8-bit compatibility array
      for (let i = 7; i >= 1; i--) {
        this.shiftRegisterBits[i] = this.shiftRegisterBits[i - 1];
      }
      this.shiftRegisterBits[0] = sampledBit;

      // 3-bit T-FF Binary Ripple Length Counter:
      this.tff_length = (this.tff_length + 1) & 0x07;
      this.counter = this.tff_length;

      // Reset gap counter on each release to measure gap from scratch
      this.gap_counter_7490 = 0;
      this.letter_seen = true;

      this.notify('symbolClocked', {
        bit: sampledBit,
        symbol: sampledBit === 0 ? '· (DOT)' : '– (DASH)',
        newQ: [...this.shiftRegisterBits],
        newCount: this.counter,
        time: this.simTimeMs
      });
    }

    // 4. Gap Counter (7490) & Gap Magnitude Comparator (7485)
    // While key is released and at least one symbol was entered:
    if (this.key === 1) {
      this.q1_conducting = true;
      this.gap_counter_7490 = 0;
      this.cmp_letter_end_7485 = 0;
      this.u5_capVoltage = 0.0;
      this.u5_pin3 = 1;
      this.endSignal = 0;
    } else {
      this.q1_conducting = false;
      if (this.counter > 0) {
        const elapsedGap = this.simTimeMs - this.lastReleaseTime;
        this.gap_counter_7490 = Math.min(31, Math.floor(elapsedGap / (this.pauseTimeoutMs / 7)));
        this.u5_capVoltage = Math.min(5.0, (elapsedGap / this.pauseTimeoutMs) * 3.33);

        // 7485 Comparator for Letter End: A >= 7 (approx pauseTimeoutMs)
        if (this.gap_counter_7490 >= 7 || elapsedGap >= this.pauseTimeoutMs) {
          this.cmp_letter_end_7485 = 1;
          this.u5_pin3 = 0;
          this.endSignal = 1; // Letter End trigger
        } else {
          this.cmp_letter_end_7485 = 0;
          this.u5_pin3 = 1;
          this.endSignal = 0;
        }

        // 7485 Comparator for Word Space: A >= 19
        if (this.gap_counter_7490 >= 19 || elapsedGap >= (this.pauseTimeoutMs * 2.5)) {
          this.cmp_word_space_7485 = 1;
        } else {
          this.cmp_word_space_7485 = 0;
        }
      } else {
        this.gap_counter_7490 = 0;
        this.cmp_letter_end_7485 = 0;
        this.cmp_word_space_7485 = 0;
        this.u5_pin3 = 1;
        this.endSignal = 0;
        this.u5_capVoltage = 0.0;
      }
    }

    // 5. 7483 4-bit Binary Full Adder Simulation (Address Offset / Bus Check)
    this.adder_7483_a = this.counter & 0x0F;
    this.adder_7483_b = (this.shiftRegisterBits[0] | (this.shiftRegisterBits[1] << 1)) & 0x0F;
    const rawSum = this.adder_7483_a + this.adder_7483_b;
    this.adder_7483_sum = rawSum & 0x0F;
    this.adder_7483_cout = rawSum > 15 ? 1 : 0;

    // 6. 74153 Dual 4:1 Multiplexer (FSM Next-State Steering)
    // Select inputs S1,S0 = fsm_state_dff
    const s1 = this.fsm_state_dff[0];
    const s0 = this.fsm_state_dff[1];
    if (s1 === 0 && s0 === 0) { // 00 IDLE
      this.fsm_mux_74153 = [0, this.press_edge];
    } else if (s1 === 0 && s0 === 1) { // 01 MEASURE
      this.fsm_mux_74153 = [this.release_edge, 1];
    } else if (s1 === 1 && s0 === 1) { // 11 GAP
      this.fsm_mux_74153 = [this.cmp_letter_end_7485 ? 1 : 0, this.press_edge ? 1 : 0];
    } else { // 10 DECODE
      this.fsm_mux_74153 = [0, 0]; // Returns to IDLE
    }

    // 7. Latch Character into D-FF Output Register on Letter End:
    const endRisingEdge = (this.prevEndSignal === 0 && this.endSignal === 1);
    
    if (endRisingEdge) {
      if (this.counter > 0) {
        this.fsm_state = "10"; // DECODE state
        this.fsm_state_dff = [1, 0];

        // D-FF Output Register captures Length and Symbol bits
        this.latchedCount = this.counter & 0x07;
        this.latchedBits = [
          this.jkff_symbols[0],
          this.jkff_symbols[1],
          this.jkff_symbols[2],
          this.jkff_symbols[3]
        ];
        this.latchedValid = true;
        
        // Evaluate 74138 Decoder Matrix
        this.evaluateDecoders();
        
        this.notify('latchEvent', {
          count: this.latchedCount,
          bits: [...this.latchedBits],
          letter: this.latchedLetter,
          time: this.simTimeMs
        });
        
        // Synchronous Clear cycle on next clock edge
        this.clearPulseActive = true;
        this.clearPulseTimer = 0;
      }
    }
    
    // Manage Synchronous Clear Pulse
    if (this.clearPulseActive) {
      this.clearPulseTimer += dtMs;
      if (this.clearPulseTimer >= 0.05) {
        this.u3_not_mr = 0;
        this.u4_mr = 1;
        this.shiftRegisterBits = [0, 0, 0, 0, 0, 0, 0, 0];
        this.jkff_symbols = [0, 0, 0, 0, 0];
        this.counter = 0;
        this.tff_length = 0;
        this.fsm_state = "00"; // IDLE
        this.fsm_state_dff = [0, 0];
      }
      
      if (this.clearPulseTimer >= 0.15) {
        this.u3_not_mr = 1;
        this.u4_mr = 0;
        this.clearPulseActive = false;
        this.clearPulseTimer = 0;
        this.notify('clearComplete', { time: this.simTimeMs });
      }
    }
    
    // Save history states for edge tracking
    this.prevKey = this.key;
    this.prevNotKey = this.not_key;
    this.prevEndSignal = this.endSignal;
  }

  // Pure Combinational Decoder Logic using 6x 74138 Decoders + 7408/7432 Gating
  evaluateDecoders() {
    if (!this.latchedValid || this.latchedCount === 0) {
      this.activeDecoderLines = {
        not_L1: 1, not_L2: 1, not_L3: 1, not_L4: 1, not_L5: 1,
        activeLetter: null, activeDecoderChip: null, activeDecoderPin: null,
        isError: false, errorReason: null
      };
      return;
    }

    const LC0 = (this.latchedCount >> 0) & 1;
    const LC1 = (this.latchedCount >> 1) & 1;
    const LC2 = (this.latchedCount >> 2) & 1;

    const LQ0 = this.latchedBits[0];
    const LQ1 = this.latchedBits[1];
    const LQ2 = this.latchedBits[2];
    const LQ3 = this.latchedBits[3];

    // U17/U18 Error Flag: count >= 5 (for A-Z standard) or > 5
    const overflowError = (this.latchedCount >= 5);

    // U12: 74138 Length Decoder (/L1../L5 active low)
    let not_L1 = 1, not_L2 = 1, not_L3 = 1, not_L4 = 1, not_L5 = 1;
    if (this.latchedCount === 1) not_L1 = 0;
    else if (this.latchedCount === 2) not_L2 = 0;
    else if (this.latchedCount === 3) not_L3 = 0;
    else if (this.latchedCount === 4) not_L4 = 0;
    else if (this.latchedCount === 5) not_L5 = 0;

    let activeLetter = null;
    let activeChip = null;
    let activePin = null;
    let isError = false;
    let errorReason = null;

    if (overflowError) {
      isError = true;
      activeLetter = 'ERR';
      activeChip = 'U17/U18 (7408/7432)';
      activePin = 'OVERFLOW';
      errorReason = `Symbol count ${this.latchedCount} exceeds maximum of 4 symbols for letters`;
    } else if (not_L1 === 0) {
      // 1-Symbol Letters via U13 (74138 Bank 1):
      // A = LQ0, B = 0, C = 0, enabled by /L1
      activeChip = 'U13 (74138)';
      if (LQ0 === 0) {
        activeLetter = 'E'; // 0 -> E
        activePin = 'Y0';
      } else {
        activeLetter = 'T'; // 1 -> T
        activePin = 'Y1';
      }
    } else if (not_L2 === 0) {
      // 2-Symbol Letters via U13 (74138 Bank 2):
      // A = LQ0, B = LQ1, C = 0, enabled by /L2
      activeChip = 'U13 (74138)';
      const code2 = (LQ1 << 1) | LQ0;
      switch (code2) {
        case 0: activeLetter = 'I'; activePin = 'Y0'; break; // 00 -> I
        case 1: activeLetter = 'A'; activePin = 'Y1'; break; // 01 -> A
        case 2: activeLetter = 'N'; activePin = 'Y2'; break; // 10 -> N
        case 3: activeLetter = 'M'; activePin = 'Y3'; break; // 11 -> M
      }
    } else if (not_L3 === 0) {
      // 3-Symbol Letters via U14 (74138 Bank 3):
      // A = LQ0, B = LQ1, C = LQ2, enabled by /L3
      activeChip = 'U14 (74138)';
      const code3 = (LQ2 << 2) | (LQ1 << 1) | LQ0;
      switch (code3) {
        case 0: activeLetter = 'S'; activePin = 'Y0'; break; // 000 -> S
        case 1: activeLetter = 'U'; activePin = 'Y1'; break; // 001 -> U
        case 2: activeLetter = 'R'; activePin = 'Y2'; break; // 010 -> R
        case 3: activeLetter = 'W'; activePin = 'Y3'; break; // 011 -> W
        case 4: activeLetter = 'D'; activePin = 'Y4'; break; // 100 -> D
        case 5: activeLetter = 'K'; activePin = 'Y5'; break; // 101 -> K
        case 6: activeLetter = 'G'; activePin = 'Y6'; break; // 110 -> G
        case 7: activeLetter = 'O'; activePin = 'Y7'; break; // 111 -> O
      }
    } else if (not_L4 === 0) {
      // 4-Symbol Letters via U15 & U16 (2x 74138 forming 4-to-16 bank):
      // A = LQ0, B = LQ1, C = LQ2, qualified by LQ3 with 7404/7408
      const code4 = (LQ3 << 3) | (LQ2 << 2) | (LQ1 << 1) | LQ0;
      activeChip = LQ3 === 0 ? 'U15 (74138-LO)' : 'U16 (74138-HI)';
      switch (code4) {
        case 0:  activeLetter = 'H'; activePin = 'Y0'; break;  // 0000 -> H
        case 1:  activeLetter = 'V'; activePin = 'Y1'; break;  // 0001 -> V
        case 2:  activeLetter = 'F'; activePin = 'Y2'; break;  // 0010 -> F
        case 4:  activeLetter = 'L'; activePin = 'Y4'; break;  // 0100 -> L
        case 6:  activeLetter = 'P'; activePin = 'Y6'; break;  // 0110 -> P
        case 7:  activeLetter = 'J'; activePin = 'Y7'; break;  // 0111 -> J
        case 8:  activeLetter = 'B'; activePin = 'Y0'; break;  // 1000 -> B
        case 9:  activeLetter = 'X'; activePin = 'Y1'; break;  // 1001 -> X
        case 10: activeLetter = 'C'; activePin = 'Y2'; break;  // 1010 -> C
        case 11: activeLetter = 'Y'; activePin = 'Y3'; break;  // 1011 -> Y
        case 12: activeLetter = 'Z'; activePin = 'Y4'; break;  // 1100 -> Z
        case 13: activeLetter = 'Q'; activePin = 'Y5'; break;  // 1101 -> Q
        // Unused 4-symbol codes (3, 5, 14, 15) trigger ERR via 7408/7432
        default:
          isError = true;
          activeLetter = 'ERR';
          activePin = `Y${code4 & 7} (UNUSED)`;
          errorReason = `Unused 4-symbol code: ${code4.toString(2).padStart(4, '0')}`;
          break;
      }
    }

    // Reset all LEDs and illuminate active letter
    for (const k in this.ledStates) {
      this.ledStates[k] = false;
    }

    if (activeLetter) {
      this.ledStates[activeLetter] = true;
      this.latchedLetter = activeLetter;
      this.decodedHistory.push({
        letter: activeLetter,
        count: this.latchedCount,
        binary: this.getBinaryStringForLatched(),
        time: this.simTimeMs,
        isError
      });
      // Limit history to 64 entries
      if (this.decodedHistory.length > 64) {
        this.decodedHistory.shift();
      }
    }

    this.activeDecoderLines = {
      not_L1, not_L2, not_L3, not_L4,
      activeLetter, activeDecoderChip: activeChip, activeDecoderPin: activePin,
      isError, errorReason
    };
  }

  getBinaryStringForLatched() {
    if (this.latchedCount === 0) return '';
    let s = '';
    for (let i = this.latchedCount - 1; i >= 0; i--) {
      s += this.latchedBits[i] !== undefined ? this.latchedBits[i] : '0';
    }
    return s;
  }

  getMorseStringForLatched() {
    const bin = this.getBinaryStringForLatched();
    return bin.split('').map(b => b === '1' ? '–' : '·').join(' ');
  }
}
