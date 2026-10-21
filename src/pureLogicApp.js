// Master Controller for Pure-Logic Morse Decoder Simulation
// Integrates Simulator, BreadboardRenderer, SchematicView, LogicAnalyzer, Audio, and UI

import { PureLogicSimulator } from './pureLogicSimulator.js';
import { BreadboardRenderer } from './breadboardRenderer.js';
import { SchematicView } from './schematicView.js';
import { LogicAnalyzer } from './logicAnalyzer.js';
import { pureLogicAudio } from './pureLogicAudio.js';

export class PureLogicApp {
  constructor() {
    this.sim = new PureLogicSimulator();
    this.activeView = 'breadboard'; // 'breadboard' | 'schematic' | 'analyzer'
    this.autoKeyerQueue = [];
    this.isAutoKeying = false;
    this.keyPressStartTime = 0;
    this.animFrameId = null;
    this.lastFrameTime = performance.now();
  }

  init() {
    // Canvas setup
    this.canvas = document.getElementById('pure-logic-canvas');
    if (!this.canvas) return;

    // Initialize sub-renderers
    this.breadboardRenderer = new BreadboardRenderer(this.canvas, this.sim);
    this.schematicView = new SchematicView(this.canvas, this.sim);
    this.logicAnalyzer = new LogicAnalyzer(this.canvas);

    // Audio setup
    pureLogicAudio.init();

    // Cache DOM Elements
    this.cacheDom();

    // Bind Event Listeners
    this.bindEvents();

    // Subscribe to simulator events
    this.subscribeSimEvents();

    // Start 60 FPS Simulation & Animation Loop
    this.lastFrameTime = performance.now();
    this.loop = (now) => {
      this.tick(now);
      this.animFrameId = requestAnimationFrame(this.loop);
    };
    this.animFrameId = requestAnimationFrame(this.loop);

    // Initial LED and UI refresh
    this.updateUI();

    // Initialize Theme (Defaults to Light Mode)
    this.initTheme();
  }

  cacheDom() {
    // View Switcher Buttons
    this.btnViewBreadboard = document.getElementById('btn-view-breadboard');
    this.btnViewSchematic = document.getElementById('btn-view-schematic');
    this.btnViewAnalyzer = document.getElementById('btn-view-analyzer');

    // Simulation Controls
    this.btnSimPlay = document.getElementById('btn-sim-play');
    this.btnSimPause = document.getElementById('btn-sim-pause');
    this.btnSimSpeed1x = document.getElementById('btn-sim-speed-1x');
    this.btnSimSpeed05x = document.getElementById('btn-sim-speed-05x');
    this.btnSimSpeed02x = document.getElementById('btn-sim-speed-02x');
    this.btnSimStep = document.getElementById('btn-sim-step');
    this.btnSimReset = document.getElementById('btn-sim-reset');

    // Trimmers
    this.sliderRv1 = document.getElementById('slider-rv1');
    this.valRv1 = document.getElementById('val-rv1');
    this.sliderRv2 = document.getElementById('slider-rv2');
    this.valRv2 = document.getElementById('val-rv2');

    // Hardware Straight Key
    this.telegraphKey = document.getElementById('telegraph-key-lever');
    this.keyContactSpark = document.getElementById('key-contact-spark');
    this.keyTimerDisplay = document.getElementById('key-press-timer');
    this.keyTypeIndicator = document.getElementById('key-type-indicator');
    this.keyProgressFill = document.getElementById('key-progress-fill');

    // Latched Letter Display Banner
    this.bannerLetter = document.getElementById('banner-latched-letter');
    this.bannerMorse = document.getElementById('banner-latched-morse');
    this.bannerBinary = document.getElementById('banner-latched-binary');
    this.bannerChip = document.getElementById('banner-latched-chip');
    this.bannerCount = document.getElementById('banner-latched-count');

    // Decoded Message Tape
    this.tapeOutput = document.getElementById('decoded-tape-text');
    this.btnCopyTape = document.getElementById('btn-copy-tape');
    this.btnClearTape = document.getElementById('btn-clear-tape');

    // Signal Bus Readouts
    this.busNodeX = document.getElementById('bus-node-x');
    this.busNotKey = document.getElementById('bus-not-key');
    this.busKey = document.getElementById('bus-key');
    this.busU2Pin3 = document.getElementById('bus-u2-pin3');
    this.busData = document.getElementById('bus-data');
    this.busShiftReg = document.getElementById('bus-shift-reg');
    this.busCounter = document.getElementById('bus-counter');
    this.busPauseCap = document.getElementById('bus-pause-cap');
    this.busEnd = document.getElementById('bus-end');
    this.busLatch = document.getElementById('bus-latch');
    this.busClear = document.getElementById('bus-clear');

    // 27 LEDs
    this.ledElements = {};
    for (let i = 65; i <= 90; i++) {
      const char = String.fromCharCode(i);
      this.ledElements[char] = document.getElementById(`led-${char}`);
    }
    this.ledElements['ERR'] = document.getElementById('led-ERR');

    // Quick A-Z Buttons Container
    this.quickAlphabetDeck = document.getElementById('quick-alphabet-deck');

    // Audio Controls
    this.btnMute = document.getElementById('btn-pure-audio-mute');
    this.volSlider = document.getElementById('pure-audio-volume');

    // Presentation Mode & Tools Tabs
    this.btnPresentationMode = document.getElementById('btn-presentation-mode');
    this.presBtnLabel = document.getElementById('pres-btn-label');
    this.toolDeckTabs = document.querySelectorAll('.tool-deck-tab');
    this.toolPanes = document.querySelectorAll('.tool-pane');

    // Theme Switcher Option
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.themeIcon = document.getElementById('theme-icon');
    this.themeBtnLabel = document.getElementById('theme-btn-label');
  }

  bindEvents() {
    // View Switchers
    const setView = (v) => {
      this.activeView = v;
      [this.btnViewBreadboard, this.btnViewSchematic, this.btnViewAnalyzer].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (v === 'breadboard' && this.btnViewBreadboard) this.btnViewBreadboard.classList.add('active');
      if (v === 'schematic' && this.btnViewSchematic) this.btnViewSchematic.classList.add('active');
      if (v === 'analyzer' && this.btnViewAnalyzer) this.btnViewAnalyzer.classList.add('active');
    };

    if (this.btnViewBreadboard) this.btnViewBreadboard.addEventListener('click', () => setView('breadboard'));
    if (this.btnViewSchematic) this.btnViewSchematic.addEventListener('click', () => setView('schematic'));
    if (this.btnViewAnalyzer) this.btnViewAnalyzer.addEventListener('click', () => setView('analyzer'));

    // Simulation Speed Controls
    if (this.btnSimPlay) {
      this.btnSimPlay.addEventListener('click', () => {
        this.sim.setPaused(false);
        this.btnSimPlay.classList.add('active');
        if (this.btnSimPause) this.btnSimPause.classList.remove('active');
      });
    }

    if (this.btnSimPause) {
      this.btnSimPause.addEventListener('click', () => {
        this.sim.setPaused(true);
        this.btnSimPause.classList.add('active');
        if (this.btnSimPlay) this.btnSimPlay.classList.remove('active');
      });
    }

    const setSpeedBtn = (btn, speed) => {
      [this.btnSimSpeed1x, this.btnSimSpeed05x, this.btnSimSpeed02x].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (btn) btn.classList.add('active');
      this.sim.setSimulationSpeed(speed);
    };

    if (this.btnSimSpeed1x) this.btnSimSpeed1x.addEventListener('click', () => setSpeedBtn(this.btnSimSpeed1x, 1.0));
    if (this.btnSimSpeed05x) this.btnSimSpeed05x.addEventListener('click', () => setSpeedBtn(this.btnSimSpeed05x, 0.5));
    if (this.btnSimSpeed02x) this.btnSimSpeed02x.addEventListener('click', () => setSpeedBtn(this.btnSimSpeed02x, 0.2));

    if (this.btnSimStep) {
      this.btnSimStep.addEventListener('click', () => {
        this.sim.setPaused(true);
        this.sim.step(10); // step forward 10ms
        this.logicAnalyzer.recordSample(this.sim);
      });
    }

    if (this.btnSimReset) {
      this.btnSimReset.addEventListener('click', () => {
        this.sim.reset();
        this.logicAnalyzer.clear();
        this.updateUI();
      });
    }

    // Trimmers RV1 & RV2
    if (this.sliderRv1) {
      this.sliderRv1.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.sim.setDashThreshold(val);
        if (this.valRv1) this.valRv1.textContent = `${val} ms`;
      });
    }

    if (this.sliderRv2) {
      this.sliderRv2.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.sim.setPauseTimeout(val);
        if (this.valRv2) this.valRv2.textContent = `${(val / 1000).toFixed(2)} s`;
      });
    }

    // Physical Telegraph Straight Key Events
    const onKeyDown = () => {
      if (this.sim.rawKeyActive) return;
      pureLogicAudio.ensureContext();
      pureLogicAudio.startTone();
      pureLogicAudio.playKeyClick(true);

      this.sim.setKey(true);
      this.keyPressStartTime = performance.now();

      if (this.telegraphKey) this.telegraphKey.classList.add('pressed');
      if (this.keyContactSpark) this.keyContactSpark.classList.add('sparking');
    };

    const onKeyUp = () => {
      if (!this.sim.rawKeyActive) return;
      pureLogicAudio.stopTone();
      pureLogicAudio.playKeyClick(false);

      this.sim.setKey(false);

      if (this.telegraphKey) this.telegraphKey.classList.remove('pressed');
      if (this.keyContactSpark) this.keyContactSpark.classList.remove('sparking');
    };

    if (this.telegraphKey) {
      this.telegraphKey.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onKeyDown();
      });
      window.addEventListener('mouseup', () => {
        if (this.sim.rawKeyActive) onKeyUp();
      });

      // Touch events for mobile/tablet
      this.telegraphKey.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onKeyDown();
      });
      this.telegraphKey.addEventListener('touchend', (e) => {
        e.preventDefault();
        onKeyUp();
      });
    }

    // Spacebar Keybind
    window.addEventListener('keydown', (e) => {
      // Don't capture space if typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        onKeyDown();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        onKeyUp();
      }
    });

    // Message Tape Controls
    if (this.btnCopyTape) {
      this.btnCopyTape.addEventListener('click', () => {
        if (!this.tapeOutput) return;
        navigator.clipboard.writeText(this.tapeOutput.textContent).then(() => {
          const orig = this.btnCopyTape.textContent;
          this.btnCopyTape.textContent = 'Copied!';
          setTimeout(() => { this.btnCopyTape.textContent = orig; }, 1500);
        });
      });
    }

    if (this.btnClearTape) {
      this.btnClearTape.addEventListener('click', () => {
        if (this.tapeOutput) this.tapeOutput.textContent = '';
        this.sim.decodedHistory = [];
      });
    }

    // Audio Controls
    if (this.btnMute) {
      this.btnMute.addEventListener('click', () => {
        const isMuted = !pureLogicAudio.isMuted;
        pureLogicAudio.setMuted(isMuted);
        this.btnMute.classList.toggle('muted', isMuted);
      });
    }

    if (this.volSlider) {
      this.volSlider.addEventListener('input', (e) => {
        pureLogicAudio.setVolume(parseFloat(e.target.value));
      });
    }

    // Alphabet Quick Keyer Buttons
    if (this.quickAlphabetDeck) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      this.quickAlphabetDeck.innerHTML = '';
      for (const char of letters) {
        const btn = document.createElement('button');
        btn.className = 'quick-letter-btn';
        btn.innerHTML = `<span class="ql-char">${char}</span><span class="ql-code">${this.getMorsePattern(char)}</span>`;
        btn.addEventListener('click', () => {
          this.queueAutoKeyMorse(this.getMorsePattern(char), char);
        });
        this.quickAlphabetDeck.appendChild(btn);
      }
    }

    // Spec Test Suite Buttons
    this.bindSpecTests();

    // Presentation Mode Toggle
    if (this.btnPresentationMode) {
      this.btnPresentationMode.addEventListener('click', () => {
        this.togglePresentationMode();
      });
    }

    // Keyboard shortcut: 'P' to toggle presentation mode
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'p' || e.key === 'P') {
        this.togglePresentationMode();
      }
    });

    // Tool Deck Tabs (Spec Tests / Quick Keyer / Bus Probes)
    if (this.toolDeckTabs && this.toolDeckTabs.length > 0) {
      this.toolDeckTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetId = tab.dataset.tab;
          this.toolDeckTabs.forEach(t => t.classList.remove('active'));
          this.toolPanes.forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          const targetPane = document.getElementById(targetId);
          if (targetPane) targetPane.classList.add('active');
        });
      });
    }

    // Theme Switcher Click Handler
    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(nextTheme);
      });
    }

    // Keyboard shortcut: 'T' to toggle Theme
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 't' || e.key === 'T') {
        const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        this.setTheme(currentTheme === 'light' ? 'dark' : 'light');
      }
    });
  }

  initTheme() {
    // Defaults to Light Mode as requested
    const savedTheme = localStorage.getItem('circuit-theme') || 'light';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('theme-light', isLight);
    document.body.classList.toggle('theme-dark', !isLight);

    if (this.themeIcon) {
      this.themeIcon.textContent = isLight ? '☀️' : '🌙';
    }
    if (this.themeBtnLabel) {
      this.themeBtnLabel.textContent = isLight ? 'Light Mode' : 'Dark Mode';
    }
    if (this.btnThemeToggle) {
      this.btnThemeToggle.title = `Switch Theme: Currently ${isLight ? 'Light' : 'Dark'} Mode (Shortcut: T)`;
      this.btnThemeToggle.classList.toggle('active-light', isLight);
    }

    try {
      localStorage.setItem('circuit-theme', theme);
    } catch (_) {}
  }

  togglePresentationMode() {
    const isPres = document.body.classList.toggle('presentation-mode');
    if (this.presBtnLabel) {
      this.presBtnLabel.textContent = isPres ? 'Exit Presentation' : 'Presentation Mode';
    }
    if (this.btnPresentationMode) {
      this.btnPresentationMode.classList.toggle('active-pres', isPres);
    }
    // Attempt browser Fullscreen API
    if (isPres) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  subscribeSimEvents() {
    this.sim.subscribe((ev, data) => {
      if (ev === 'symbolClocked') {
        const label = data.bit === 0 ? '· (DOT)' : '– (DASH)';
        this.logicAnalyzer.recordEvent(label, data.bit === 0 ? '#00e5ff' : '#ff00ff');
      } else if (ev === 'latchEvent') {
        pureLogicAudio.playLatchClick();
        if (data.letter === 'ERR') {
          pureLogicAudio.playErrorBuzz();
          this.logicAnalyzer.recordEvent('ERR!', '#ef4444');
        } else {
          pureLogicAudio.playDecodeChime(data.letter);
          this.logicAnalyzer.recordEvent(`'${data.letter}'`, '#22c55e');
        }
        this.appendTape(data.letter, data.letter === 'ERR');
      }
    });
  }

  bindSpecTests() {
    const btnTest1 = document.getElementById('btn-spec-test-1');
    const btnTest2 = document.getElementById('btn-spec-test-2');
    const btnTest3 = document.getElementById('btn-spec-test-3');
    const btnTest4 = document.getElementById('btn-spec-test-4');
    const btnTest5 = document.getElementById('btn-spec-test-5');

    // Test 1: Calibrate (200ms press = dot, 300ms press = dash)
    if (btnTest1) {
      btnTest1.addEventListener('click', () => {
        this.runSequence([
          { type: 'down', dur: 180 }, // dot (<250ms)
          { type: 'up', dur: 200 },
          { type: 'down', dur: 320 }, // dash (>250ms)
          { type: 'up', dur: 1100 }   // pause -> latches 'A' (· –)
        ]);
      });
    }

    // Test 2: Key sequence E, T, A, B, S, O, H, Z, Q
    if (btnTest2) {
      btnTest2.addEventListener('click', () => {
        const testLetters = ['E', 'T', 'A', 'B', 'S', 'O', 'H', 'Z', 'Q'];
        this.autoKeyLetters(testLetters);
      });
    }

    // Test 3: Fast Dot-Dot with 100ms gap to verify U2 reset
    if (btnTest3) {
      btnTest3.addEventListener('click', () => {
        this.runSequence([
          { type: 'down', dur: 120 }, // dot
          { type: 'up', dur: 100 },   // 100ms gap (tests D2/R5/C4 reset)
          { type: 'down', dur: 120 }, // dot
          { type: 'up', dur: 1100 }   // pause -> latches 'I' (··)
        ]);
      });
    }

    // Test 4: 0.9s pause keeps letter, 1.1s splits letter
    if (btnTest4) {
      btnTest4.addEventListener('click', () => {
        this.runSequence([
          { type: 'down', dur: 120 }, // dot
          { type: 'up', dur: 900 },   // 0.9s pause: does NOT time out!
          { type: 'down', dur: 320 }, // dash: joins same letter -> 'A'
          { type: 'up', dur: 1200 }   // 1.2s pause: times out and latches!
        ]);
      });
    }

    // Test 5: 5 symbols lights ERR LED
    if (btnTest5) {
      btnTest5.addEventListener('click', () => {
        this.runSequence([
          { type: 'down', dur: 120 }, { type: 'up', dur: 150 }, // 1
          { type: 'down', dur: 120 }, { type: 'up', dur: 150 }, // 2
          { type: 'down', dur: 120 }, { type: 'up', dur: 150 }, // 3
          { type: 'down', dur: 120 }, { type: 'up', dur: 150 }, // 4
          { type: 'down', dur: 120 }, { type: 'up', dur: 1100 } // 5th symbol -> triggers overflow ERR!
        ]);
      });
    }
  }

  getMorsePattern(letter) {
    const table = {
      'A': '· –', 'B': '– · · ·', 'C': '– · – ·', 'D': '– · ·', 'E': '·',
      'F': '· · – ·', 'G': '– – ·', 'H': '· · · ·', 'I': '· ·', 'J': '· – – –',
      'K': '– · –', 'L': '· – · ·', 'M': '– –', 'N': '– ·', 'O': '– – –',
      'P': '· – – ·', 'Q': '– – · –', 'R': '· – ·', 'S': '· · ·', 'T': '–',
      'U': '· · –', 'V': '· · · –', 'W': '· – –', 'X': '– · · –', 'Y': '– · – –',
      'Z': '– – · ·'
    };
    return table[letter] || '';
  }

  queueAutoKeyMorse(pattern, char) {
    const symbols = pattern.replace(/\s+/g, '').split('');
    const seq = [];
    symbols.forEach((sym, idx) => {
      const isDash = sym === '–' || sym === '-';
      seq.push({ type: 'down', dur: isDash ? 320 : 120 });
      // Intra-character gap or letter gap
      const isLast = idx === symbols.length - 1;
      seq.push({ type: 'up', dur: isLast ? 1100 : 180 });
    });
    this.runSequence(seq);
  }

  autoKeyLetters(letters) {
    let combinedSeq = [];
    letters.forEach((char) => {
      const pattern = this.getMorsePattern(char);
      const symbols = pattern.replace(/\s+/g, '').split('');
      symbols.forEach((sym, idx) => {
        const isDash = sym === '–' || sym === '-';
        combinedSeq.push({ type: 'down', dur: isDash ? 320 : 120 });
        const isLast = idx === symbols.length - 1;
        combinedSeq.push({ type: 'up', dur: isLast ? 1150 : 180 });
      });
    });
    this.runSequence(combinedSeq);
  }

  runSequence(seq) {
    this.autoKeyerQueue = [...seq];
    if (this.isAutoKeying) return;
    this.isAutoKeying = true;
    this.executeNextAutoStep();
  }

  executeNextAutoStep() {
    if (this.autoKeyerQueue.length === 0) {
      this.isAutoKeying = false;
      return;
    }

    const step = this.autoKeyerQueue.shift();
    if (step.type === 'down') {
      pureLogicAudio.ensureContext();
      pureLogicAudio.startTone();
      pureLogicAudio.playKeyClick(true);
      this.sim.setKey(true);
      if (this.telegraphKey) this.telegraphKey.classList.add('pressed');
    } else {
      pureLogicAudio.stopTone();
      pureLogicAudio.playKeyClick(false);
      this.sim.setKey(false);
      if (this.telegraphKey) this.telegraphKey.classList.remove('pressed');
    }

    setTimeout(() => {
      this.executeNextAutoStep();
    }, step.dur / this.sim.simSpeed);
  }

  appendTape(letter, isError) {
    if (!this.tapeOutput) return;
    const span = document.createElement('span');
    span.className = isError ? 'tape-char tape-error' : 'tape-char';
    span.textContent = letter;
    this.tapeOutput.appendChild(span);
    this.tapeOutput.scrollLeft = this.tapeOutput.scrollWidth;
  }

  // 60 FPS animation & physics tick
  tick(now) {
    const realDt = Math.min(50, now - this.lastFrameTime);
    this.lastFrameTime = now;

    // Simulate forward if not paused
    if (!this.sim.isPaused) {
      const simDt = realDt * this.sim.simSpeed;
      // Multi-step micro-integration for precision RC curves
      const substeps = 4;
      const subDt = simDt / substeps;
      for (let i = 0; i < substeps; i++) {
        this.sim.step(subDt);
      }
      this.logicAnalyzer.recordSample(this.sim);
    }

    // Render active visual canvas
    if (this.activeView === 'breadboard') {
      this.breadboardRenderer.render();
    } else if (this.activeView === 'schematic') {
      this.schematicView.render();
    } else if (this.activeView === 'analyzer') {
      this.logicAnalyzer.render();
    }

    // Update Live UI elements
    this.updateUI();
  }

  updateUI() {
    const s = this.sim;

    // 1. Live Key Duration and Progress Bar
    if (s.rawKeyActive) {
      const elapsed = performance.now() - this.keyPressStartTime;
      const thresh = s.dashThresholdMs;
      if (this.keyTimerDisplay) this.keyTimerDisplay.textContent = `${elapsed.toFixed(0)} ms`;
      if (this.keyTypeIndicator) {
        if (elapsed < thresh) {
          this.keyTypeIndicator.textContent = 'DOT (·) < 250ms';
          this.keyTypeIndicator.className = 'key-type dot';
        } else {
          this.keyTypeIndicator.textContent = 'DASH (–) ≥ 250ms';
          this.keyTypeIndicator.className = 'key-type dash';
        }
      }
      if (this.keyProgressFill) {
        const pct = Math.min(100, (elapsed / thresh) * 100);
        this.keyProgressFill.style.width = `${pct}%`;
      }
    } else {
      if (this.keyTimerDisplay) this.keyTimerDisplay.textContent = '0 ms';
      if (this.keyProgressFill) this.keyProgressFill.style.width = '0%';
      if (this.keyTypeIndicator) {
        this.keyTypeIndicator.textContent = 'KEY IDLE';
        this.keyTypeIndicator.className = 'key-type idle';
      }
    }

    // 2. Latched Letter Banner
    if (s.latchedLetter) {
      if (this.bannerLetter) this.bannerLetter.textContent = s.latchedLetter;
      if (this.bannerMorse) this.bannerMorse.textContent = s.getMorseStringForLatched();
      if (this.bannerBinary) this.bannerBinary.textContent = `Bits: ${s.getBinaryStringForLatched()}`;
      if (this.bannerChip) this.bannerChip.textContent = `${s.activeDecoderLines.activeDecoderChip || '---'} (${s.activeDecoderLines.activeDecoderPin || ''})`;
      if (this.bannerCount) this.bannerCount.textContent = `Count: ${s.latchedCount}`;
    }

    // 3. 27 LED states
    for (const char in this.ledElements) {
      const el = this.ledElements[char];
      if (el) {
        const isLit = s.ledStates[char];
        if (isLit) {
          el.classList.add('lit');
        } else {
          el.classList.remove('lit');
        }
      }
    }

    // 4. Live Signal Bus Readouts
    if (this.busNodeX) this.busNodeX.textContent = `${s.nodeX_voltage.toFixed(2)}V`;
    if (this.busNotKey) this.busNotKey.textContent = s.not_key;
    if (this.busKey) this.busKey.textContent = s.key;
    if (this.busU2Pin3) this.busU2Pin3.textContent = `${s.width_counter_7490 || 0} (${s.u2_capVoltage.toFixed(2)}V)`;
    if (this.busData) this.busData.textContent = s.data === 1 ? '1 [DASH]' : '0 [DOT]';
    if (this.busShiftReg) this.busShiftReg.textContent = (s.jkff_symbols || s.shiftRegisterBits.slice(0, 5)).slice(0, 5).join('');
    if (this.busCounter) this.busCounter.textContent = `${s.counter} / 5`;
    if (this.busPauseCap) this.busPauseCap.textContent = `${s.gap_counter_7490 || 0} (${s.u5_capVoltage.toFixed(2)}V)`;
    if (this.busEnd) this.busEnd.textContent = s.endSignal;
    if (this.busLatch) this.busLatch.textContent = s.latchedLetter || 'NONE';
    if (this.busClear) this.busClear.textContent = s.clearPulseActive ? 'CLR' : 'OK';
  }
}

export const pureLogicApp = new PureLogicApp();
