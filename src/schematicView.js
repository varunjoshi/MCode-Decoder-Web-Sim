// Interactive Schematic & Logic Flow Diagram
// Dynamically animates the signal paths according to Section 2 & 3 of the design specification

export class SchematicView {
  constructor(canvasElement, simulator) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.sim = simulator;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = this.sim;
    const isLight = document.body.classList.contains('theme-light');

    // Technical drawing schematic background
    ctx.fillStyle = isLight ? '#f8fafc' : '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Subtle schematic grid
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Top Title
    ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MDIT221 PURE-LOGIC MORSE DECODER • SYLLABUS IC & FLIP-FLOP HARDWARE ARCHITECTURE', 20, 24);

    // 1. SW1 Key Block
    const swActive = s.key === 1;
    this.drawBlock(ctx, 25, 55, 115, 60, 'SW1 KEY', swActive ? 'PRESSED (+5V)' : 'OPEN (0V)', swActive ? '#22c55e' : '#64748b');

    // 2. U1: 7404 NOT Gates & Dual D-FF Synchroniser
    this.drawBlock(ctx, 165, 55, 135, 60, 'U1: 7404 + D-FF', `SYNC D-FF: ${s.key}\nPRESS / RELEASE`, s.key ? '#00f0ff' : '#475569');

    // 3. U2: 7490 Decade Width Counter
    const wCount = s.width_counter_7490 !== undefined ? s.width_counter_7490 : 0;
    this.drawBlock(ctx, 325, 45, 135, 70, 'U2: 7490 WIDTH CTR', `Counts clk in KEY\nCount: ${wCount} / 15`, s.key ? '#f59e0b' : '#64748b');

    // 4. U3: 7485 Magnitude Comparator + SR Sticky Dash Latch
    const dashFlag = s.data === 1;
    this.drawBlock(ctx, 485, 45, 145, 70, 'U3: 7485 + SR-LATCH', `A>=7 Dash Comp: ${s.cmp_dash_7485 || (dashFlag ? 1:0)}\nDATA: ${dashFlag ? '1 [DASH]' : '0 [DOT]'}`, dashFlag ? '#d946ef' : '#06b6d4');

    // 5. U4: JK-FF 5-Bit SIPO Shift Register
    const qBits = (s.jkff_symbols || s.shiftRegisterBits.slice(0, 5)).slice(0, 5).join('');
    this.drawBlock(ctx, 655, 45, 155, 70, 'U4: JK-FF SHIFT REG', `Q4..Q0: [${qBits}]\nShift on RELEASE ↑`, '#06b6d4');

    // 6. U5: T-FF 3-Bit Binary Ripple Length Counter
    const lenCount = s.tff_length !== undefined ? s.tff_length : s.counter;
    this.drawBlock(ctx, 655, 140, 155, 70, 'U5: T-FF LENGTH CTR', `3-bit Ripple Counter\nLength n: ${lenCount} / 5`, '#10b981');

    // 7. U6 & U7: 7490 Decade Gap Counter & 7485 Gap Comparator
    const gapCount = s.gap_counter_7490 !== undefined ? s.gap_counter_7490 : 0;
    this.drawBlock(ctx, 325, 140, 140, 70, 'U6: 7490 GAP CTR', `Counts idle clk\nGap Count: ${gapCount}`, s.key === 0 && lenCount > 0 ? '#f59e0b' : '#64748b');
    this.drawBlock(ctx, 485, 140, 145, 70, 'U7: 7485 GAP COMP', `Letter End: ${s.endSignal}\nWord Space: ${s.cmp_word_space_7485 || 0}`, s.endSignal ? '#a855f7' : '#64748b');

    // 8. U9: 74153 Dual 4:1 Multiplexer (FSM Controller)
    const fsmStr = s.fsm_state || (s.endSignal ? '10 [DEC]' : (s.key ? '01 [MEAS]' : (lenCount > 0 ? '11 [GAP]' : '00 [IDLE]')));
    this.drawBlock(ctx, 835, 45, 150, 70, 'U9: 74153 FSM MUX', `4-State Gray FSM\nState: ${fsmStr}`, '#38bdf8');

    // 9. U10: 7483 4-Bit Binary Full Adder
    const adderSum = s.adder_7483_sum !== undefined ? s.adder_7483_sum : (lenCount & 7);
    this.drawBlock(ctx, 835, 140, 150, 70, 'U10: 7483 4-BIT ADDER', `A+B Address Offset\nSum: ${adderSum} Cout: ${s.adder_7483_cout || 0}`, '#eab308');

    // 10. U8: D-FF Output Character Latch Register
    const latchColor = s.latchedValid ? '#8b5cf6' : '#475569';
    const latchedCode = s.latchedLetter ? `${s.latchedLetter} (n=${s.latchedCount})` : 'IDLE';
    this.drawBlock(ctx, 835, 235, 150, 85, 'U8: D-FF OUTPUT REG', `Clock: DECODE Strobe\nLATCHED: ${latchedCode}`, latchColor);

    // 11. Decoders Matrix (6x 74138 ICs + 7408 / 7432 Gates)
    const dec = s.activeDecoderLines;
    this.drawBlock(ctx, 1020, 35, 230, 48, 'U12: 74138 LENGTH DEC', `/L1..5: ${dec.not_L1 ? '1':'0'}${dec.not_L2 ? '1':'0'}${dec.not_L3 ? '1':'0'}${dec.not_L4 ? '1':'0'}${dec.not_L5 !== undefined ? (dec.not_L5 ? '1':'0') : '1'}`, dec.not_L1 === 0 || dec.not_L2 === 0 || dec.not_L3 === 0 || dec.not_L4 === 0 ? '#84cc16' : '#475569');
    this.drawBlock(ctx, 1020, 92, 230, 45, 'U13: 74138 1 & 2 SYMBOL', `E, T / I, A, N, M`, dec.activeDecoderChip && dec.activeDecoderChip.includes('U13') ? '#22c55e' : '#475569');
    this.drawBlock(ctx, 1020, 146, 230, 45, 'U14: 74138 3-SYMBOL BANK', `S, U, R, W, D, K, G, O`, dec.activeDecoderChip && dec.activeDecoderChip.includes('U14') ? '#22c55e' : '#475569');
    this.drawBlock(ctx, 1020, 200, 230, 45, 'U15/16: 2x 74138 4-SYMBOL', `H, V, F, L, P, J, B, X, C, Y, Z, Q`, dec.activeDecoderChip && (dec.activeDecoderChip.includes('U15') || dec.activeDecoderChip.includes('U16')) ? '#22c55e' : '#475569');
    this.drawBlock(ctx, 1020, 254, 230, 45, 'U17/18: 7408/7432 ERR GATES', `OVERFLOW >= 5 / UNUSED CODES`, dec.isError ? '#ef4444' : '#475569');

    // Draw active signal bus arrows
    this.drawSignalArrow(ctx, 140, 85, 165, 85, s.key ? '#00f0ff' : '#475569', 'SW1');
    this.drawSignalArrow(ctx, 300, 75, 325, 75, s.key ? '#f59e0b' : '#475569', 'KEY_SYNC');
    this.drawSignalArrow(ctx, 460, 75, 485, 75, s.cmp_dash_7485 ? '#d946ef' : '#475569', 'WIDTH>=7');
    this.drawSignalArrow(ctx, 630, 75, 655, 75, s.data ? '#d946ef' : '#06b6d4', 'DATA');
    this.drawSignalArrow(ctx, 230, 115, 655, 175, s.key ? '#38bdf8' : '#475569', 'RELEASE');
    this.drawSignalArrow(ctx, 300, 175, 325, 175, s.key === 0 && lenCount > 0 ? '#f59e0b' : '#475569', 'GAP_CLK');
    this.drawSignalArrow(ctx, 465, 175, 485, 175, '#475569', 'COUNT');
    this.drawSignalArrow(ctx, 630, 175, 835, 75, s.endSignal ? '#a855f7' : '#475569', 'LETTER_END');
    this.drawSignalArrow(ctx, 810, 75, 835, 75, '#06b6d4', 'Q-bits');
    this.drawSignalArrow(ctx, 810, 175, 835, 175, '#10b981', 'L-bits');
    this.drawSignalArrow(ctx, 985, 75, 1020, 58, '#eab308', 'LENGTH');
    this.drawSignalArrow(ctx, 985, 175, 1020, 168, '#f43f5e', 'SYMBOLS');
    this.drawSignalArrow(ctx, 910, 115, 910, 235, s.endSignal ? '#8b5cf6' : '#475569', 'STROBE');
  }

  drawBlock(ctx, x, y, w, h, title, text, accentColor) {
    const isLight = document.body.classList.contains('theme-light');
    ctx.save();
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 8, y + 16);

    ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
    ctx.font = '9px "JetBrains Mono", monospace';
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, x + 8, y + 32 + i * 14);
    });
    ctx.restore();
  }

  drawSignalArrow(ctx, x1, y1, x2, y2, color, label) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 7 * Math.cos(angle - Math.PI / 6), y2 - 7 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 7 * Math.cos(angle + Math.PI / 6), y2 - 7 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 4);
    ctx.restore();
  }
}
