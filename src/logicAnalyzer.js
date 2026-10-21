// High-Resolution Multi-Channel Digital & Analog Logic Analyzer Canvas
// MDIT221 Syllabus Pure-Logic Morse Decoder Traces:
// CH1: KEY (Synchronised D-FF & 7404 Gate)
// CH2: 7490 Width Counter & 7485 Magnitude Comparator
// CH3: DATA Signal (7485 + SR-Latch: 0=·, 1=–)
// CH4: JK-FF 5-bit Shift Register Bus (Q3..Q0)
// CH5: T-FF 3-bit Binary Ripple Counter (L2..L0)
// CH6: 7490 Gap Counter & 7485 Gap Comparator
// CH7: FSM Decode Strobe & D-FF Output Latch
// CH8: Synchronous Clear Strobe

export class LogicAnalyzer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    // Buffer parameters
    this.maxSamples = 1200;
    this.samples = [];
    this.events = [];
    
    // Display parameters
    this.timeWindowMs = 3500; // default 3.5 seconds visible window
    this.autoScroll = true;
    this.hoverTime = null;
    this.hoverX = null;
    
    // Channel definitions
    this.channels = [
      { id: 'key', label: 'CH1: KEY (Sync D-FF)', color: '#00f0ff', type: 'digital' },
      { id: 'u2_cap', label: 'CH2: 7490 Width / 7485 Cmp', color: '#ffaa00', type: 'analog', min: 0, max: 5.0, threshold: 3.33 },
      { id: 'data', label: 'CH3: DATA (7485+SR: 0=· 1=–)', color: '#ff00ff', type: 'digital' },
      { id: 'u3_bus', label: 'CH4: JK-FF Shift Reg (Q3..Q0)', color: '#00ff88', type: 'bus' },
      { id: 'u4_count', label: 'CH5: T-FF Length Ctr (L2..L0)', color: '#38bdf8', type: 'bus' },
      { id: 'u5_cap', label: 'CH6: 7490 Gap / 7485 Cmp', color: '#f59e0b', type: 'analog', min: 0, max: 5.0, threshold: 3.33 },
      { id: 'end_latch', label: 'CH7: D-FF Latch / Decode Strobe', color: '#a855f7', type: 'digital' },
      { id: 'clear_pulse', label: 'CH8: Synchronous Clear Strobe', color: '#ef4444', type: 'digital' }
    ];

    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.hoverX = x;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverX = null;
    });
  }

  // Push a simulation snapshot into the buffer
  recordSample(sim) {
    const sample = {
      time: sim.simTimeMs,
      key: sim.key,
      u2_cap: sim.u2_capVoltage,
      u2_pin3: sim.u2_pin3,
      data: sim.data,
      u3_bus: [...sim.shiftRegisterBits.slice(0, 4)],
      u4_count: sim.counter,
      u5_cap: sim.u5_capVoltage,
      end_latch: sim.endSignal,
      clear_pulse: sim.clearPulseActive ? 1 : 0,
      activeLetter: sim.latchedLetter
    };

    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  recordEvent(text, color = '#22c55e', time = null) {
    this.events.push({
      text,
      color,
      time: time || (this.samples.length ? this.samples[this.samples.length - 1].time : 0)
    });
    if (this.events.length > 50) {
      this.events.shift();
    }
  }

  clear() {
    this.samples = [];
    this.events = [];
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    const isLight = document.body.classList.contains('theme-light');

    // Background
    ctx.fillStyle = isLight ? '#f8fafc' : '#080c14';
    ctx.fillRect(0, 0, w, h);

    if (this.samples.length < 2) {
      // Draw grid when idle
      this.drawGrid(w, h);
      ctx.fillStyle = isLight ? '#64748b' : '#475569';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting Morse key input... Press Telegraph Key or Spacebar', w / 2, h / 2);
      return;
    }

    const latestTime = this.samples[this.samples.length - 1].time;
    const startTime = latestTime - this.timeWindowMs;

    this.drawGrid(w, h, startTime, latestTime);

    // Channel layout
    const labelWidth = 190;
    const traceWidth = w - labelWidth - 20;
    const chCount = this.channels.length;
    const channelHeight = (h - 26) / chCount;

    // Render each channel
    this.channels.forEach((ch, idx) => {
      const topY = 24 + idx * channelHeight;
      const midY = topY + channelHeight * 0.5;
      const botY = topY + channelHeight - 4;
      const highY = topY + 6;

      // Channel Row separator line
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, topY + channelHeight);
      ctx.lineTo(w, topY + channelHeight);
      ctx.stroke();

      // Channel Label
      ctx.fillStyle = ch.color;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ch.label, 12, topY + channelHeight * 0.65);

      // Latest value readout pill
      const latestVal = this.getLatestChannelValueText(ch, this.samples[this.samples.length - 1]);
      ctx.fillStyle = isLight ? '#334155' : 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(latestVal, labelWidth - 8, topY + channelHeight * 0.65);

      // Draw Trace Waveform
      ctx.save();
      ctx.beginPath();
      ctx.rect(labelWidth, topY, traceWidth, channelHeight);
      ctx.clip();

      if (ch.type === 'digital') {
        this.renderDigitalTrace(ctx, ch, labelWidth, traceWidth, startTime, latestTime, highY, botY);
      } else if (ch.type === 'analog') {
        this.renderAnalogTrace(ctx, ch, labelWidth, traceWidth, startTime, latestTime, topY, botY, channelHeight);
      } else if (ch.type === 'bus') {
        this.renderBusTrace(ctx, ch, labelWidth, traceWidth, startTime, latestTime, topY, botY, channelHeight);
      }

      ctx.restore();
    });

    // Render Event Markers (letter decode banners)
    this.renderEventMarkers(ctx, labelWidth, traceWidth, startTime, latestTime, h);

    // Render Interactive Hover Cursor
    if (this.hoverX && this.hoverX >= labelWidth && this.hoverX <= labelWidth + traceWidth) {
      const hoverRatio = (this.hoverX - labelWidth) / traceWidth;
      const cursorTime = startTime + hoverRatio * this.timeWindowMs;
      this.renderCursor(ctx, this.hoverX, cursorTime, labelWidth, h);
    }
  }

  drawGrid(w, h, startTime = 0, endTime = 3500) {
    const ctx = this.ctx;
    const isLight = document.body.classList.contains('theme-light');
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;

    // Time division lines (every 500ms)
    const labelWidth = 190;
    const traceWidth = w - labelWidth - 20;
    const intervalMs = 500;
    const firstDivision = Math.ceil(startTime / intervalMs) * intervalMs;

    for (let t = firstDivision; t <= endTime; t += intervalMs) {
      const x = labelWidth + ((t - startTime) / (endTime - startTime)) * traceWidth;
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Time tag at top
      ctx.fillStyle = isLight ? '#475569' : '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`+${(t % 10000)}ms`, x, 14);
    }

    // Top Header Banner
    ctx.fillStyle = isLight ? '#e2e8f0' : '#0f172a';
    ctx.fillRect(0, 0, w, 22);
    ctx.fillStyle = isLight ? '#334155' : '#94a3b8';
    ctx.font = '600 10px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PURE-LOGIC REAL-TIME OSCILLOSCOPE & LOGIC ANALYZER (5V HC LOGIC)', 12, 15);
  }

  renderDigitalTrace(ctx, ch, x0, width, startTime, endTime, highY, lowY) {
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i];
      if (s.time < startTime) continue;

      const x = x0 + ((s.time - startTime) / (endTime - startTime)) * width;
      const val = s[ch.id];
      const y = val ? highY : lowY;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        // Vertical step transition, then horizontal
        const prevS = this.samples[i - 1];
        if (prevS && prevS[ch.id] !== val) {
          ctx.lineTo(x, prevS[ch.id] ? highY : lowY);
        }
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  renderAnalogTrace(ctx, ch, x0, width, startTime, endTime, topY, botY, chHeight) {
    // Draw 2/3 Vcc threshold dotted line (3.33V)
    const threshY = botY - (ch.threshold / 5.0) * (chHeight - 10);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, threshY);
    ctx.lineTo(x0 + width, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Trace
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i];
      if (s.time < startTime) continue;

      const x = x0 + ((s.time - startTime) / (endTime - startTime)) * width;
      const v = Math.min(5.0, Math.max(0, s[ch.id]));
      const y = botY - (v / 5.0) * (chHeight - 10);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  renderBusTrace(ctx, ch, x0, width, startTime, endTime, topY, botY, chHeight) {
    ctx.strokeStyle = ch.color;
    ctx.fillStyle = ch.color;
    ctx.lineWidth = 1.5;

    const midY = topY + chHeight / 2;
    const halfH = (chHeight - 10) / 2;

    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i];
      if (s.time < startTime) continue;

      const nextS = this.samples[i + 1];
      const x1 = x0 + ((s.time - startTime) / (endTime - startTime)) * width;
      const x2 = nextS ? x0 + ((nextS.time - startTime) / (endTime - startTime)) * width : x0 + width;

      // Hex / text value
      let label = '';
      if (ch.id === 'u3_bus') {
        label = s.u3_bus.slice(0, 4).join('');
      } else if (ch.id === 'u4_count') {
        label = `C=${s.u4_count}`;
      }

      // Draw diamond / hexagonal bus cell
      ctx.beginPath();
      ctx.moveTo(x1, midY);
      ctx.lineTo(x1 + 3, midY - halfH);
      ctx.lineTo(x2 - 3, midY - halfH);
      ctx.lineTo(x2, midY);
      ctx.lineTo(x2 - 3, midY + halfH);
      ctx.lineTo(x1 + 3, midY + halfH);
      ctx.closePath();
      ctx.stroke();

      if (x2 - x1 > 28) {
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, (x1 + x2) / 2, midY + 3);
      }
    }
  }

  renderEventMarkers(ctx, x0, width, startTime, endTime, h) {
    for (const ev of this.events) {
      if (ev.time < startTime || ev.time > endTime) continue;
      const x = x0 + ((ev.time - startTime) / (endTime - startTime)) * width;

      ctx.strokeStyle = ev.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge at top
      ctx.fillStyle = ev.color;
      ctx.fillRect(x - 16, 24, 32, 16);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ev.text, x, 36);
    }
  }

  renderCursor(ctx, x, time, labelWidth, h) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Time readout pill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 28, h - 20, 56, 16);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${time.toFixed(0)}ms`, x, h - 8);
  }

  getLatestChannelValueText(ch, s) {
    if (!s) return '---';
    if (ch.id === 'key') return s.key ? 'HIGH [1]' : 'LOW [0]';
    if (ch.id === 'u2_cap') return `${s.u2_cap.toFixed(2)}V (${s.u2_pin3 ? 'PULSE' : 'IDLE'})`;
    if (ch.id === 'data') return s.data === 1 ? '1 [DASH]' : '0 [DOT]';
    if (ch.id === 'u3_bus') return s.u3_bus.slice(0, 4).join('');
    if (ch.id === 'u4_count') return `n=${s.u4_count}`;
    if (ch.id === 'u5_cap') return `${s.u5_cap.toFixed(2)}V`;
    if (ch.id === 'end_latch') return s.end_latch ? 'HIGH [END]' : 'LOW';
    if (ch.id === 'clear_pulse') return s.clear_pulse ? 'CLR (~10µs)' : 'IDLE';
    return '';
  }
}
