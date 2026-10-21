// Interactive Breadboard & Realistic Wiring Simulation Renderer
// Renders:
// 1. Photorealistic solderless breadboards with numbered tie points & power rails
// 2. 12 Integrated Circuits with realistic DIP packages, notch, pins, and laser-engraved labels
// 3. Discrete components (capacitors C1-C6, resistors R1-R9, trimmers RV1/RV2, transistor Q1, diodes D1/D2)
// 4. Photorealistic curved jumper wires with realistic shadows & color coding
// 5. LIVE DATA LOGIC GLOW: Wires illuminate when HIGH (+5V), dim when LOW (0V)
// 6. ANIMATED SIGNAL PULSE PARTICLES traveling down wires during clock/data events
// 7. Interactive Logic Probe HUD on hover & click

export class BreadboardRenderer {
  constructor(canvasElement, simulator) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.sim = simulator;

    // Viewport transform
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Hover & probe state
    this.hoverTarget = null;
    this.activeProbePin = null;

    // Animated signal particles [{ wireId, progress, speed, color }]
    this.particles = [];

    // Layout configuration for the 12 ICs across breadboard sections
    this.initLayout();
    this.bindEvents();

    // Listen to simulator events to spawn wire pulse particles
    this.sim.subscribe((ev, data) => this.handleSimEvent(ev, data));
  }

  initLayout() {
    // Breadboard coordinates:
    // We create a dual high-density industrial breadboard workbench (1400 x 820 px base)
    this.boardWidth = 1360;
    this.boardHeight = 780;
    this.boardX = 20;
    this.boardY = 20;

    // Define all 16 IC positions [x, y, pinCount, label, subtext, id]
    // Strictly adhering to MDIT221 syllabus (7490, 7485, 7483, 74151, 74153, 74138, 7404, 7408, 7432, JK-FF, T-FF, D-FF)
    this.chips = [
      // Row 1 (Plate 1): Input, Width Counter, Dash Comparator, Shift Reg, Length Counter, Gap Counter, Gap Comp, Output Latch
      { id: 'U1', part: '74HC04', name: 'HEX INVERTER', x: 55, y: 140, pins: 14, w: 85, h: 170 },
      { id: 'U2', part: '74HC90', name: 'WIDTH COUNTER', x: 175, y: 140, pins: 14, w: 85, h: 170 },
      { id: 'U3', part: '74HC85', name: 'DASH COMPARATOR', x: 295, y: 135, pins: 16, w: 85, h: 180 },
      { id: 'U4', part: 'JK-FF', name: '5-BIT SHIFT REG', x: 415, y: 135, pins: 16, w: 85, h: 180 },
      { id: 'U5', part: 'T-FF', name: '3-BIT LENGTH CTR', x: 535, y: 140, pins: 14, w: 85, h: 170 },
      { id: 'U6', part: '74HC90', name: 'GAP COUNTER', x: 655, y: 140, pins: 14, w: 85, h: 170 },
      { id: 'U7', part: '74HC85', name: 'GAP COMPARATOR', x: 775, y: 135, pins: 16, w: 85, h: 180 },
      { id: 'U8', part: 'D-FF', name: 'OUTPUT LATCH', x: 895, y: 125, pins: 20, w: 90, h: 205 },

      // Row 2 (Plate 2): Multiplexers, Adder, Length Decoder, Character Decoders (74138 array)
      { id: 'U9', part: '74HC153', name: 'DUAL 4:1 MUX (FSM)', x: 55, y: 460, pins: 16, w: 85, h: 180 },
      { id: 'U10', part: '74HC151', name: '8:1 MULTIPLEXER', x: 175, y: 460, pins: 16, w: 85, h: 180 },
      { id: 'U11', part: '74HC83', name: '4-BIT ADDER', x: 295, y: 460, pins: 16, w: 85, h: 180 },
      { id: 'U12', part: '74HC138', name: 'LENGTH DECODER', x: 415, y: 460, pins: 16, w: 85, h: 180 },
      { id: 'U13', part: '74HC138', name: '1 & 2 SYMBOL DEC', x: 535, y: 460, pins: 16, w: 85, h: 180 },
      { id: 'U14', part: '74HC138', name: '3 SYMBOL DEC', x: 655, y: 460, pins: 16, w: 85, h: 180 },
      { id: 'U15', part: '74HC138', name: '4 SYMBOL DEC LO', x: 775, y: 460, pins: 16, w: 85, h: 180 },
      { id: 'U16', part: '74HC138', name: '4 SYMBOL DEC HI', x: 895, y: 460, pins: 16, w: 85, h: 180 }
    ];

    // Compute pin positions for each IC
    this.pinMap = {};
    this.chips.forEach(chip => {
      const pinsPerSide = chip.pins / 2;
      const spacing = (chip.h - 30) / (pinsPerSide - 1);
      
      chip.pinCoords = [];
      // Left side: pin 1 to pinsPerSide (top to bottom)
      for (let i = 0; i < pinsPerSide; i++) {
        const pinNum = i + 1;
        const px = chip.x;
        const py = chip.y + 15 + i * spacing;
        const pinKey = `${chip.id}:${pinNum}`;
        const pinData = { chip: chip.id, pin: pinNum, x: px, y: py, side: 'left' };
        chip.pinCoords.push(pinData);
        this.pinMap[pinKey] = pinData;
      }
      // Right side: pinsPerSide + 1 to chip.pins (bottom to top)
      for (let i = pinsPerSide - 1; i >= 0; i--) {
        const pinNum = chip.pins - i;
        const px = chip.x + chip.w;
        const py = chip.y + 15 + i * spacing;
        const pinKey = `${chip.id}:${pinNum}`;
        const pinData = { chip: chip.id, pin: pinNum, x: px, y: py, side: 'right' };
        chip.pinCoords.push(pinData);
        this.pinMap[pinKey] = pinData;
      }
    });

    // Discrete Component positions
    this.components = [
      { id: 'SW1', type: 'key', name: 'SW1 Telegraph Key', x: 25, y: 40, w: 80, h: 50 },
      { id: 'R1_C1', type: 'debounce', name: 'Debounce R1/R2/C1', x: 115, y: 55, w: 65, h: 35 },
      { id: 'RV1', type: 'pot', name: 'RV1 7485 Dash Calib', x: 285, y: 45, w: 80, h: 50 },
      { id: 'SR_LATCH', type: 'transistor', name: 'SR Sticky Dash', x: 410, y: 65, w: 45, h: 40 },
      { id: 'RV2', type: 'pot', name: 'RV2 7485 Gap Calib', x: 670, y: 45, w: 80, h: 50 },
      { id: 'SYNC_DFF', type: 'delay', name: 'Sync D-FF Stage', x: 800, y: 55, w: 75, h: 35 }
    ];

    // Define Master Jumper Wire Netlist connecting syllabus ICs
    this.wires = [
      // 1. SW1 to Node X & Debounce to U1 (74HC04)
      { id: 'w_key_in', from: { x: 85, y: 65 }, to: 'U1:1', color: '#ffaa00', label: 'Node X (Key Input)', getSignal: (s) => s.nodeX_voltage > 2.5 ? 1 : 0 },
      { id: 'w_not_key', from: 'U1:2', to: 'U1:3', color: '#00f0ff', label: '/KEY (U1A out to U1B in)', getSignal: (s) => s.not_key },
      { id: 'w_key_u2', from: 'U1:4', to: 'U2:1', color: '#38bdf8', label: 'KEY to U2 7490 Ctr Clk', getSignal: (s) => s.key },
      { id: 'w_release_u4', from: 'U1:2', to: 'U4:1', color: '#00f0ff', label: '/KEY to U4 JK-FF Shift Clk', getSignal: (s) => s.not_key },
      { id: 'w_release_u5', from: 'U1:4', to: 'U5:1', color: '#10b981', label: 'KEY to U5 T-FF Length Clk', getSignal: (s) => s.key },

      // 2. Pulse Width Counter U2 (7490) -> U3 (7485 Dash Comparator)
      { id: 'w_u2_qa', from: 'U2:12', to: 'U3:10', color: '#f59e0b', label: 'U2 QA to U3 A0', getSignal: (s) => (s.width_counter_7490 & 1) },
      { id: 'w_u2_qb', from: 'U2:9', to: 'U3:12', color: '#f59e0b', label: 'U2 QB to U3 A1', getSignal: (s) => (s.width_counter_7490 >> 1) & 1 },
      { id: 'w_u2_qc', from: 'U2:8', to: 'U3:13', color: '#f59e0b', label: 'U2 QC to U3 A2', getSignal: (s) => (s.width_counter_7490 >> 2) & 1 },
      { id: 'w_dash_out', from: 'U3:6', to: 'U4:2', color: '#d946ef', label: 'DATA (7485 A>=B to U4 J/K)', getSignal: (s) => s.data },

      // 3. Gap Counter U6 (7490) -> U7 (7485 Gap Comparator)
      { id: 'w_idle_u6', from: 'U1:2', to: 'U6:1', color: '#f59e0b', label: '/KEY to U6 7490 Gap Clk', getSignal: (s) => (s.key === 0 && s.counter > 0) ? 1 : 0 },
      { id: 'w_u6_qa', from: 'U6:12', to: 'U7:10', color: '#a855f7', label: 'U6 QA to U7 A0', getSignal: (s) => (s.gap_counter_7490 & 1) },
      { id: 'w_u6_qb', from: 'U6:9', to: 'U7:12', color: '#a855f7', label: 'U6 QB to U7 A1', getSignal: (s) => (s.gap_counter_7490 >> 1) & 1 },
      { id: 'w_end_latch', from: 'U7:6', to: 'U8:11', color: '#8b5cf6', label: 'LETTER_END to U8 D-FF Strobe', getSignal: (s) => s.endSignal },
      { id: 'w_end_fsm', from: 'U7:6', to: 'U9:1', color: '#8b5cf6', label: 'LETTER_END to U9 74153 FSM Mux', getSignal: (s) => s.endSignal },

      // 4. Length Counter U5 (T-FF) -> U8 Latch (D4..D7) & U11 Adder
      { id: 'w_len0', from: 'U5:3', to: 'U8:13', color: '#10b981', label: 'L0 to U8 D4', getSignal: (s) => (s.counter >> 0) & 1 },
      { id: 'w_len1', from: 'U5:4', to: 'U8:14', color: '#10b981', label: 'L1 to U8 D5', getSignal: (s) => (s.counter >> 1) & 1 },
      { id: 'w_len2', from: 'U5:5', to: 'U8:17', color: '#10b981', label: 'L2 to U8 D6', getSignal: (s) => (s.counter >> 2) & 1 },

      // 5. Shift Register U4 (JK-FF) -> U8 Latch (D0..D3)
      { id: 'w_q0', from: 'U4:3', to: 'U8:3', color: '#06b6d4', label: 'Q0 to U8 D0', getSignal: (s) => s.shiftRegisterBits[0] },
      { id: 'w_q1', from: 'U4:4', to: 'U8:4', color: '#06b6d4', label: 'Q1 to U8 D1', getSignal: (s) => s.shiftRegisterBits[1] },
      { id: 'w_q2', from: 'U4:5', to: 'U8:7', color: '#06b6d4', label: 'Q2 to U8 D2', getSignal: (s) => s.shiftRegisterBits[2] },
      { id: 'w_q3', from: 'U4:6', to: 'U8:8', color: '#06b6d4', label: 'Q3 to U8 D3', getSignal: (s) => s.shiftRegisterBits[3] },

      // 6. U11 7483 4-Bit Binary Adder Bus
      { id: 'w_adder_bus', from: 'U8:13', to: 'U11:1', color: '#eab308', label: 'Length to U11 7483 Adder A', getSignal: (s) => (s.counter >> 0) & 1 },

      // 7. Latched Length to U12 74138 Length Decoder
      { id: 'w_l0_u12', from: 'U8:12', to: 'U12:1', color: '#eab308', label: 'Latched L0 to U12 A', getSignal: (s) => (s.latchedCount >> 0) & 1 },
      { id: 'w_l1_u12', from: 'U8:15', to: 'U12:2', color: '#eab308', label: 'Latched L1 to U12 B', getSignal: (s) => (s.latchedCount >> 1) & 1 },
      { id: 'w_l2_u12', from: 'U8:16', to: 'U12:3', color: '#eab308', label: 'Latched L2 to U12 C', getSignal: (s) => (s.latchedCount >> 2) & 1 },

      // 8. Length Decoder /L1../L4 to 74138 Character Decoders
      { id: 'w_l1_u13', from: 'U12:14', to: 'U13:4', color: '#84cc16', label: '/L1 to U13 74138 Bank 1 Enable', getSignal: (s) => s.activeDecoderLines.not_L1 === 0 ? 1 : 0 },
      { id: 'w_l2_u13', from: 'U12:13', to: 'U13:5', color: '#84cc16', label: '/L2 to U13 74138 Bank 2 Enable', getSignal: (s) => s.activeDecoderLines.not_L2 === 0 ? 1 : 0 },
      { id: 'w_l3_u14', from: 'U12:12', to: 'U14:4', color: '#84cc16', label: '/L3 to U14 74138 Bank 3 Enable', getSignal: (s) => s.activeDecoderLines.not_L3 === 0 ? 1 : 0 },
      { id: 'w_l4_u15', from: 'U12:11', to: 'U15:4', color: '#84cc16', label: '/L4 to U15/16 74138 Bank 4 Enable', getSignal: (s) => s.activeDecoderLines.not_L4 === 0 ? 1 : 0 },

      // 9. Latched Data Bits (LQ0..LQ3) to 74138 Character Decoders
      { id: 'w_lq0_u13', from: 'U8:2', to: 'U13:1', color: '#f43f5e', label: 'LQ0 to U13 Address A', getSignal: (s) => s.latchedBits[0] },
      { id: 'w_lq1_u13', from: 'U8:5', to: 'U13:2', color: '#f43f5e', label: 'LQ1 to U13 Address B', getSignal: (s) => s.latchedBits[1] },
      { id: 'w_lq_u14', from: 'U8:6', to: 'U14:1', color: '#f43f5e', label: 'LQ0..LQ2 to U14 Address', getSignal: (s) => s.latchedBits[0] },
      { id: 'w_lq_u15', from: 'U8:9', to: 'U15:1', color: '#f43f5e', label: 'LQ0..LQ3 to U15/U16 4-to-16', getSignal: (s) => s.latchedBits[0] }
    ];
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => { this.hoverTarget = null; });
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  handleSimEvent(ev, data) {
    // When a symbol is clocked or latch occurs, spawn animated pulse particles on active wires!
    if (ev === 'symbolClocked') {
      ['w_not_key_u3', 'w_key_clock_u4', 'w_data_line'].forEach(wid => {
        this.spawnParticle(wid, '#00f0ff');
      });
    } else if (ev === 'latchEvent') {
      ['w_end_latch', 'w_c0', 'w_c1', 'w_c2', 'w_c3', 'w_q0', 'w_q1', 'w_q2', 'w_q3'].forEach(wid => {
        this.spawnParticle(wid, '#a855f7');
      });
    }
  }

  spawnParticle(wireId, color) {
    const wire = this.wires.find(w => w.id === wireId);
    if (!wire) return;
    this.particles.push({
      wireId,
      wire,
      progress: 0.0,
      speed: 0.05 + Math.random() * 0.03,
      color: color || '#ffffff'
    });
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    return { x, y };
  }

  handleMouseMove(e) {
    const { x, y } = this.getCanvasCoords(e);
    this.hoverTarget = this.hitTest(x, y);
  }

  handleClick(e) {
    const { x, y } = this.getCanvasCoords(e);
    const hit = this.hitTest(x, y);
    if (hit && hit.type === 'pin') {
      this.activeProbePin = hit;
    }
  }

  hitTest(x, y) {
    // Check pins
    for (const key in this.pinMap) {
      const pin = this.pinMap[key];
      const dist = Math.hypot(pin.x - x, pin.y - y);
      if (dist < 10) {
        return { type: 'pin', ...pin, key };
      }
    }
    // Check chips
    for (const chip of this.chips) {
      if (x >= chip.x && x <= chip.x + chip.w && y >= chip.y && y <= chip.y + chip.h) {
        return { type: 'chip', ...chip };
      }
    }
    // Check discrete components
    for (const comp of this.components) {
      if (x >= comp.x && x <= comp.x + comp.w && y >= comp.y && y <= comp.y + comp.h) {
        return { type: 'component', ...comp };
      }
    }
    return null;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const isLight = document.body.classList.contains('theme-light');

    // Workbench background (dark industrial antistatic workbench mat or crisp light laboratory workbench)
    ctx.fillStyle = isLight ? '#d9e2ec' : '#0b0f19';
    ctx.fillRect(0, 0, w, h);

    // Subtle workbench grid
    this.drawWorkbenchGrid(ctx, w, h, isLight);

    // 1. Draw Solderless Breadboards (Plate 1: Logic & Timing, Plate 2: Latch & Decoders)
    this.drawBreadboard(ctx, 40, 20, 960, 360, 'SECTION 1: TIMING, DISCRIMINATOR, SHIFT REGISTER & COUNTER', isLight);
    this.drawBreadboard(ctx, 40, 400, 960, 360, 'SECTION 2: LATCH & DECODER MATRIX (138 / 139 / 154 / ERR)', isLight);

    // 2. Draw Integrated Circuits (DIP packages, notch, pins, markings)
    this.chips.forEach(chip => this.drawChip(ctx, chip));

    // 3. Draw Discrete Components (Capacitors, Resistors, Trimmers, Q1, Diodes)
    this.components.forEach(comp => this.drawComponent(ctx, comp));

    // 4. Draw Jumper Wires with Realistic Shadows & Live Glowing States
    this.drawWires(ctx);

    // 5. Update & Draw Animated Signal Pulse Particles
    this.updateAndDrawParticles(ctx);

    // 6. Draw Virtual Logic Probe Indicator (if pinned)
    if (this.activeProbePin) {
      this.drawProbeIndicator(ctx, this.activeProbePin);
    }

    // 7. Draw Live Interactive HUD Tooltip on Hover
    if (this.hoverTarget) {
      this.drawHoverHUD(ctx, this.hoverTarget);
    }
  }

  drawWorkbenchGrid(ctx, w, h, isLight) {
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawBreadboard(ctx, x, y, width, height, title, isLight) {
    // ABS White / Off-white plastic base with beveled border
    ctx.save();
    ctx.shadowColor = isLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = isLight ? '#fbfcfe' : '#1e2430';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title banner on breadboard
    ctx.fillStyle = isLight ? '#475569' : '#64748b';
    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 20, y + 22);

    // Power Bus Rails (+5V Red, GND Blue)
    // Top Power Rail
    this.drawPowerRail(ctx, x + 20, y + 32, width - 40, true);
    // Center divider ravine
    ctx.fillStyle = isLight ? '#e2e8f0' : '#0f172a';
    ctx.fillRect(x + 20, y + height / 2 - 8, width - 40, 16);

    // Bottom Power Rail
    this.drawPowerRail(ctx, x + 20, y + height - 32, width - 40, false);

    // Socket Tie Points (Rows of holes)
    ctx.fillStyle = isLight ? '#94a3b8' : '#0d1117';
    const holeRadius = 2.2;
    const cols = 58;
    const startX = x + 30;
    const colSpacing = (width - 60) / cols;

    for (let c = 0; c < cols; c++) {
      const hx = startX + c * colSpacing;
      // Top row bank (5 holes high)
      for (let r = 0; r < 5; r++) {
        const hy = y + 55 + r * 16;
        ctx.beginPath();
        ctx.arc(hx, hy, holeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bottom row bank (5 holes high)
      for (let r = 0; r < 5; r++) {
        const hy = y + height / 2 + 18 + r * 16;
        ctx.beginPath();
        ctx.arc(hx, hy, holeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPowerRail(ctx, rx, ry, rw, isTop) {
    // Red +5V line
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rw, ry);
    ctx.stroke();

    // Blue GND line
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 12);
    ctx.lineTo(rx + rw, ry + 12);
    ctx.stroke();

    // Plus and Minus labels
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('+5V', rx - 5, ry + 4);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('GND', rx - 5, ry + 16);
  }

  drawChip(ctx, chip) {
    const { x, y, w, h, part, name, id } = chip;

    // DIP Package Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    // Epoxy Package Body
    ctx.fillStyle = '#11151c';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.restore();

    // Package Border & Bevel
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top orientation notch (U-shaped cutout)
    ctx.fillStyle = '#0a0d13';
    ctx.beginPath();
    ctx.arc(x + w / 2, y, 9, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // Pin 1 Indicator Dimple
    ctx.beginPath();
    ctx.arc(x + 14, y + 16, 3, 0, Math.PI * 2);
    ctx.fill();

    // Laser-Engraved Markings
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(part, x + w / 2, y + h / 2 - 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 9px "Outfit", sans-serif';
    ctx.fillText(id, x + w / 2, y + h / 2 + 8);

    ctx.fillStyle = '#64748b';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(name, x + w / 2, y + h / 2 + 20);

    // Draw Lead-frame pins
    chip.pinCoords.forEach(p => {
      ctx.fillStyle = '#cbd5e1'; // Silver/tinned copper lead
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;

      const px = p.side === 'left' ? p.x - 7 : p.x;
      const py = p.y - 3;
      ctx.fillRect(px, py, 7, 6);
      ctx.strokeRect(px, py, 7, 6);

      // Pin number inside IC body
      ctx.fillStyle = '#64748b';
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.textAlign = p.side === 'left' ? 'left' : 'right';
      const tx = p.side === 'left' ? p.x + 4 : p.x - 4;
      ctx.fillText(p.pin, tx, p.y + 3);
    });
  }

  drawComponent(ctx, comp) {
    const { x, y, w, h, type, name, id } = comp;

    if (type === 'pot') {
      // Blue square cermet trimmer potentiometer (Bourns style)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      // Brass adjustment screw center
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Screw slot
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 7, y + h / 2);
      ctx.lineTo(x + w / 2 + 7, y + h / 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(id, x + w / 2, y + 12);
      ctx.fillText(id === 'RV1' ? `${this.sim.dashThresholdMs}ms` : `${(this.sim.pauseTimeoutMs / 1000).toFixed(1)}s`, x + w / 2, y + h - 5);
    } else if (type === 'cap_can') {
      // Cylindrical aluminum electrolytic capacitor can
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(x + 15, y + 20, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Negative polarity white stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 2, y + 10, 5, 20);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillText('–', x + 5, y + 22);
    } else if (type === 'transistor') {
      // TO-92 transistor package (flat face, curved back)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x + 20, y + 20, 14, Math.PI * 0.2, Math.PI * 0.8, true);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('2N3904', x + 20, y + 22);
    } else {
      // Discrete network box
      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(id, x + w / 2, y + h / 2 + 3);
    }
  }

  drawWires(ctx) {
    this.wires.forEach(wire => {
      const p1 = this.resolveEndpoint(wire.from);
      const p2 = this.resolveEndpoint(wire.to);
      if (!p1 || !p2) return;

      const isHigh = wire.getSignal(this.sim) === 1;

      // Realistic Bezier curve control points
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const arch = Math.min(70, Math.max(25, dist * 0.22));

      // Control points
      const cp1x = p1.x + (dx > 0 ? 30 : -30);
      const cp1y = p1.y - arch;
      const cp2x = p2.x - (dx > 0 ? 30 : -30);
      const cp2y = p2.y - arch;

      // Save curve for particle animation
      wire.cachedCurve = { p1, p2, cp1x, cp1y, cp2x, cp2y };

      // 1. Wire Cast Shadow
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y + 6);
      ctx.bezierCurveTo(cp1x, cp1y + 10, cp2x, cp2y + 10, p2.x, p2.y + 6);
      ctx.stroke();
      ctx.restore();

      // 2. Wire Outer Insulation Jacket
      ctx.strokeStyle = isHigh ? wire.color : this.dimColor(wire.color);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      ctx.stroke();

      // 3. Live High-Logic Neon Glow Core
      if (isHigh) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = wire.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }

      // Endpoint solder eyelets
      ctx.fillStyle = isHigh ? '#ffffff' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  resolveEndpoint(ep) {
    if (typeof ep === 'string') {
      return this.pinMap[ep] || null;
    }
    return ep;
  }

  dimColor(hex) {
    // Return dim version of color when LOW (0V)
    return 'rgba(71, 85, 105, 0.6)';
  }

  updateAndDrawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.progress += p.speed;

      if (p.progress >= 1.0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (!p.wire.cachedCurve) continue;
      const { p1, p2, cp1x, cp1y, cp2x, cp2y } = p.wire.cachedCurve;

      // Cubic Bezier interpolation
      const t = p.progress;
      const mt = 1 - t;
      const x = mt*mt*mt*p1.x + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*p2.x;
      const y = mt*mt*mt*p1.y + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*p2.y;

      // Draw glowing particle
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawProbeIndicator(ctx, pin) {
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PROBE', pin.x, pin.y - 12);
    ctx.restore();
  }

  drawHoverHUD(ctx, target) {
    const mx = target.x || 100;
    const my = target.y || 100;

    let title = '';
    let sub = '';
    let voltage = '0.00 V';
    let logic = 'LOW [0]';
    let desc = '';

    if (target.type === 'pin') {
      title = `${target.chip} - Pin ${target.pin}`;
      const status = this.getPinStatus(target.chip, target.pin);
      voltage = status.voltage;
      logic = status.logic;
      desc = status.desc;
    } else if (target.type === 'chip') {
      title = `${target.id}: ${target.part}`;
      sub = target.name;
      desc = `${target.pins}-pin DIP Package`;
      logic = 'ACTIVE';
      voltage = '+5.00 V';
    } else if (target.type === 'component') {
      title = target.name;
      desc = target.id;
      logic = 'PASSIVE';
      voltage = 'CIRCUIT';
    }

    // Render HUD Box
    const boxW = 240;
    const boxH = 95;
    const bx = Math.min(this.canvas.width - boxW - 15, Math.max(15, mx + 15));
    const by = Math.min(this.canvas.height - boxH - 15, Math.max(15, my - 45));

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // HUD Header
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(title, bx + 12, by + 18);

    // Logic State Pill
    const isHigh = logic.includes('HIGH') || logic.includes('1');
    ctx.fillStyle = isHigh ? '#22c55e' : '#64748b';
    ctx.fillRect(bx + boxW - 68, by + 8, 56, 16);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isHigh ? 'LOGIC 1' : 'LOGIC 0', bx + boxW - 40, by + 19);

    // Voltage Readout
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`V: ${voltage}`, bx + 12, by + 40);

    // Description text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Outfit", sans-serif';
    ctx.fillText(desc, bx + 12, by + 60);

    ctx.fillStyle = '#64748b';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('Click pin to attach virtual logic probe', bx + 12, by + 78);
  }

  getPinStatus(chipId, pinNum) {
    const s = this.sim;
    if (chipId === 'U1') {
      if (pinNum === 1) return { voltage: `${s.nodeX_voltage.toFixed(2)} V`, logic: s.nodeX_voltage > 2.5 ? 'HIGH [1]' : 'LOW [0]', desc: '7404 1A Input: Node X (Debounced Key)' };
      if (pinNum === 2) return { voltage: s.not_key ? '4.98 V' : '0.02 V', logic: s.not_key ? 'HIGH [1]' : 'LOW [0]', desc: '7404 1Y Output: /KEY (Active Low Key)' };
      if (pinNum === 3) return { voltage: s.not_key ? '4.98 V' : '0.02 V', logic: s.not_key ? 'HIGH [1]' : 'LOW [0]', desc: '7404 2A Input: /KEY' };
      if (pinNum === 4) return { voltage: s.key ? '4.98 V' : '0.02 V', logic: s.key ? 'HIGH [1]' : 'LOW [0]', desc: '7404 2Y Output: KEY (Active High Key)' };
      return { voltage: '4.98 V', logic: 'HIGH [1]', desc: '7404 Hex Inverter Pin' };
    } else if (chipId === 'U2') {
      // 7490 Decade Width Counter
      if (pinNum === 1) return { voltage: s.key ? '4.98 V' : '0.02 V', logic: s.key ? 'HIGH [CLK]' : 'LOW', desc: '7490 CKB Clock Input (Counts key pulse)' };
      if (pinNum === 12) return { voltage: (s.width_counter_7490 & 1) ? '4.98 V' : '0.02 V', logic: `${s.width_counter_7490 & 1}`, desc: '7490 QA (Bit 0 of Width Count)' };
      if (pinNum === 9) return { voltage: ((s.width_counter_7490 >> 1) & 1) ? '4.98 V' : '0.02 V', logic: `${(s.width_counter_7490 >> 1) & 1}`, desc: '7490 QB (Bit 1 of Width Count)' };
      if (pinNum === 8) return { voltage: ((s.width_counter_7490 >> 2) & 1) ? '4.98 V' : '0.02 V', logic: `${(s.width_counter_7490 >> 2) & 1}`, desc: '7490 QC (Bit 2 of Width Count)' };
      return { voltage: `${s.u2_capVoltage.toFixed(2)} V`, logic: 'COUNT', desc: `7490 Width Counter: ${s.width_counter_7490 || 0} / 15` };
    } else if (chipId === 'U3') {
      // 7485 Magnitude Dash Comparator
      if (pinNum === 6) return { voltage: s.data ? '4.98 V' : '0.02 V', logic: s.data ? 'HIGH [1] (DASH)' : 'LOW [0] (DOT)', desc: '7485 A>=B Output + SR Sticky Dash Latch' };
      return { voltage: s.cmp_dash_7485 ? '4.98 V' : '0.02 V', logic: s.cmp_dash_7485 ? 'A>=7 (DASH)' : 'A<7 (DOT)', desc: `7485 Dash Comparator (Thresh B=7)` };
    } else if (chipId === 'U4') {
      // JK-FF 5-bit SIPO Shift Register
      if (pinNum === 1) return { voltage: s.not_key ? '4.98 V' : '0.02 V', logic: s.not_key ? 'HIGH [1]' : 'LOW [0]', desc: 'JK-FF Clock: shifts on key release' };
      if (pinNum === 2) return { voltage: s.data ? '4.98 V' : '0.02 V', logic: s.data ? '1 (DASH)' : '0 (DOT)', desc: 'JK-FF J/K Serial Data Input' };
      if (pinNum === 3) return { voltage: s.shiftRegisterBits[0] ? '4.98 V' : '0.02 V', logic: `${s.shiftRegisterBits[0]}`, desc: 'JK-FF Q0: newest received symbol' };
      return { voltage: '4.98 V', logic: 'SHIFT_REG', desc: `5-bit JK-FF Shift Register: [${s.shiftRegisterBits.slice(0,5).join('')}]` };
    } else if (chipId === 'U5') {
      // T-FF 3-bit Binary Ripple Length Counter
      if (pinNum === 1) return { voltage: s.key ? '4.98 V' : '0.02 V', logic: s.key ? 'HIGH [1]' : 'LOW [0]', desc: 'T-FF Clock: increments on key release' };
      if (pinNum === 3) return { voltage: (s.counter & 1) ? '4.98 V' : '0.02 V', logic: `${s.counter & 1}`, desc: 'T-FF L0 (Bit 0 of Length Count)' };
      return { voltage: '4.98 V', logic: 'COUNT', desc: `3-bit T-FF Length Counter: ${s.counter} / 5` };
    } else if (chipId === 'U6') {
      // 7490 Decade Gap Counter
      return { voltage: `${s.u5_capVoltage.toFixed(2)} V`, logic: 'GAP_CTR', desc: `7490 Gap Counter: ${s.gap_counter_7490 || 0}` };
    } else if (chipId === 'U7') {
      // 7485 Gap Magnitude Comparator
      if (pinNum === 6) return { voltage: s.endSignal ? '4.98 V' : '0.02 V', logic: s.endSignal ? 'HIGH [TIMEOUT]' : 'LOW', desc: '7485 A>=B Output: LETTER_END trigger' };
      return { voltage: s.endSignal ? '4.98 V' : '0.02 V', logic: 'GAP_COMP', desc: `7485 Gap Timeout Comparator` };
    } else if (chipId === 'U8') {
      // D-FF Output Character Latch Register
      if (pinNum === 11) return { voltage: s.endSignal ? '4.98 V' : '0.02 V', logic: s.endSignal ? 'STROBE' : 'HOLD', desc: 'D-FF CP: Latches decoded letter on LETTER_END' };
      return { voltage: '4.98 V', logic: 'LATCH', desc: `D-FF Output Latch: ${s.latchedLetter || 'NONE'} (n=${s.latchedCount})` };
    } else if (chipId === 'U9') {
      // 74153 Dual 4:1 Multiplexer
      return { voltage: '4.98 V', logic: 'FSM_MUX', desc: `74153 Dual 4:1 MUX (Gray FSM State: ${s.fsm_state || '00'})` };
    } else if (chipId === 'U11') {
      // 7483 4-bit Binary Full Adder
      return { voltage: '4.98 V', logic: 'ADDER', desc: `7483 4-bit Binary Adder: Sum=${s.adder_7483_sum || 0} Cout=${s.adder_7483_cout || 0}` };
    }
    return { voltage: '4.98 V', logic: 'HIGH [1]', desc: 'Digital logic tie-point' };
  }
}

