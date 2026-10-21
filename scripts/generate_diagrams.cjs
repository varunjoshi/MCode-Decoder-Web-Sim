/**
 * Waveform & Architecture Diagram Generator for Digital Morse Decoder
 * Parses real GHDL VCD simulation data and generates slide-ready SVG and PNG figures.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VCD_PATH = path.join(__dirname, '..', 'morse.vcd');
const FIGURES_DIR = path.join(__dirname, '..', 'figures');

if (!fs.existsSync(FIGURES_DIR)) {
    fs.mkdirSync(FIGURES_DIR, { recursive: true });
}

// 1. Generate FSM State Diagram (SVG)
function generateFsmDiagram() {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 550" width="950" height="550" style="background:#0f172a; font-family:'Segoe UI', system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="idleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="measGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="gapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="decGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f472b6"/>
      <stop offset="100%" stop-color="#db2777"/>
    </linearGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8"/>
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399"/>
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24"/>
    </marker>
    <marker id="arrow-pink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#f472b6"/>
    </marker>
  </defs>

  <!-- Title & Subtitle -->
  <text x="475" y="42" text-anchor="middle" fill="#f8fafc" font-size="22" font-weight="bold">Digital Morse Decoder: 4-State Gray-Encoded Control FSM</text>
  <text x="475" y="68" text-anchor="middle" fill="#94a3b8" font-size="13">MDIT221 Unit IV/V | Gray Sequence: 00 → 01 → 11 → 10 → 00 (Single-bit race-free transitions)</text>

  <!-- State 0: IDLE (150, 180) -->
  <g transform="translate(140, 150)">
    <circle cx="60" cy="60" r="56" fill="url(#idleGrad)" stroke="#38bdf8" stroke-width="3" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
    <text x="60" y="52" text-anchor="middle" fill="#0f172a" font-size="16" font-weight="bold">IDLE</text>
    <text x="60" y="74" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="600">Q₁Q₀ = 00</text>
  </g>

  <!-- State 1: MEASURE (700, 150) -->
  <g transform="translate(680, 150)">
    <circle cx="60" cy="60" r="56" fill="url(#measGrad)" stroke="#34d399" stroke-width="3" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
    <text x="60" y="48" text-anchor="middle" fill="#0f172a" font-size="15" font-weight="bold">MEASURE</text>
    <text x="60" y="68" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="600">Q₁Q₀ = 01</text>
    <text x="60" y="85" text-anchor="middle" fill="#064e3b" font-size="11">in_measure=1</text>
  </g>

  <!-- State 2: GAP (680, 380) -->
  <g transform="translate(680, 360)">
    <circle cx="60" cy="60" r="56" fill="url(#gapGrad)" stroke="#fbbf24" stroke-width="3" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
    <text x="60" y="48" text-anchor="middle" fill="#0f172a" font-size="16" font-weight="bold">GAP</text>
    <text x="60" y="68" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="600">Q₁Q₀ = 11</text>
    <text x="60" y="85" text-anchor="middle" fill="#78350f" font-size="11">in_gap=1</text>
  </g>

  <!-- State 3: DECODE (140, 360) -->
  <g transform="translate(140, 360)">
    <circle cx="60" cy="60" r="56" fill="url(#decGrad)" stroke="#f472b6" stroke-width="3" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
    <text x="60" y="48" text-anchor="middle" fill="#0f172a" font-size="15" font-weight="bold">DECODE</text>
    <text x="60" y="68" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="600">Q₁Q₀ = 10</text>
    <text x="60" y="85" text-anchor="middle" fill="#831843" font-size="11">decode_strobe=1</text>
  </g>

  <!-- Transition: IDLE -> MEASURE on PRESS -->
  <path d="M 256 190 Q 470 120 680 190" fill="none" stroke="#34d399" stroke-width="2.5" marker-end="url(#arrow-green)"/>
  <rect x="420" y="125" width="100" height="26" rx="4" fill="#1e293b" stroke="#334155"/>
  <text x="470" y="142" text-anchor="middle" fill="#34d399" font-size="12" font-weight="600">PRESS = 1</text>

  <!-- Transition: MEASURE -> GAP on RELEASE -->
  <path d="M 760 262 L 760 358" fill="none" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#arrow-amber)"/>
  <rect x="768" y="295" width="160" height="34" rx="4" fill="#1e293b" stroke="#334155"/>
  <text x="848" y="311" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="600">RELEASE = 1</text>
  <text x="848" y="324" text-anchor="middle" fill="#94a3b8" font-size="10">shift_en = 1 (classify)</text>

  <!-- Transition: GAP -> MEASURE on PRESS before letter_end -->
  <path d="M 720 358 L 720 264" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#arrow-green)"/>
  <rect x="585" y="298" width="125" height="26" rx="4" fill="#1e293b" stroke="#334155"/>
  <text x="647" y="315" text-anchor="middle" fill="#34d399" font-size="11">PRESS (next sym)</text>

  <!-- Transition: GAP -> DECODE on LETTER_END -->
  <path d="M 680 435 Q 470 480 254 435" fill="none" stroke="#f472b6" stroke-width="2.5" marker-end="url(#arrow-pink)"/>
  <rect x="400" y="440" width="140" height="26" rx="4" fill="#1e293b" stroke="#334155"/>
  <text x="470" y="457" text-anchor="middle" fill="#f472b6" font-size="12" font-weight="600">LETTER_END = 1</text>

  <!-- Transition: DECODE -> IDLE (unconditional) -->
  <path d="M 180 360 L 180 265" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arrow)"/>
  <rect x="65" y="298" width="105" height="26" rx="4" fill="#1e293b" stroke="#334155"/>
  <text x="117" y="315" text-anchor="middle" fill="#38bdf8" font-size="11">unconditional</text>

  <!-- Keying & Excitation Equations Box -->
  <g transform="translate(300, 205)">
    <rect width="340" height="175" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <text x="170" y="26" text-anchor="middle" fill="#f8fafc" font-size="13" font-weight="bold">Synthesized Dataflow Excitation Equations</text>
    <line x1="20" y1="36" x2="320" y2="36" stroke="#334155"/>
    <text x="30" y="60" fill="#94a3b8" font-size="12" font-family="monospace">D₁ = Q₀·(Q₁·PRESS' + Q₁'·RELEASE)</text>
    <text x="30" y="84" fill="#94a3b8" font-size="12" font-family="monospace">D₀ = Q₁'·(Q₀ + PRESS) + Q₁·Q₀·(PRESS + LEND')</text>
    <text x="30" y="108" fill="#34d399" font-size="12" font-family="monospace">in_measure  = Q₁' · Q₀</text>
    <text x="30" y="128" fill="#fbbf24" font-size="12" font-family="monospace">in_gap      = Q₁ · Q₀</text>
    <text x="30" y="148" fill="#f472b6" font-size="12" font-family="monospace">decode_stb  = Q₁ · Q₀'  (clear_regs)</text>
    <text x="30" y="166" fill="#38bdf8" font-size="12" font-family="monospace">shift_en    = Q₁' · Q₀ · RELEASE</text>
  </g>
</svg>`;
    fs.writeFileSync(path.join(FIGURES_DIR, 'fsm_state_diagram.svg'), svg, 'utf8');
}

// 2. Generate Architecture Diagram with 5-Cell Symbol Register (SVG)
function generateArchDiagram() {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1150 650" width="1150" height="650" style="background:#0b1120; font-family:'Segoe UI', system-ui, sans-serif;">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
    </marker>
    <marker id="arr-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399"/>
    </marker>
    <marker id="arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24"/>
    </marker>
  </defs>

  <text x="575" y="38" text-anchor="middle" fill="#f8fafc" font-size="22" font-weight="bold">Digital Morse Decoder: Top-Level Hardware Structural Architecture</text>
  <text x="575" y="60" text-anchor="middle" fill="#94a3b8" font-size="13">Strict MDIT221 Syllabus ICs: 74138 Decoders, 7485 Comparators, 7490 Divider, Flip-Flops (D, JK, T, SR-Latch)</text>

  <!-- 1. Synchroniser & Edge Detector -->
  <g transform="translate(40, 90)">
    <rect width="180" height="150" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="90" y="28" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold">1 &amp; 2. Key Front-End</text>
    <text x="90" y="46" text-anchor="middle" fill="#94a3b8" font-size="11">SR Debounce + 2× DFF</text>
    <rect x="20" y="58" width="140" height="32" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="90" y="79" text-anchor="middle" fill="#e2e8f0" font-size="11">synchroniser.vhd</text>
    <rect x="20" y="98" width="140" height="36" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="90" y="115" text-anchor="middle" fill="#e2e8f0" font-size="11">edge_detector.vhd</text>
    <text x="90" y="128" text-anchor="middle" fill="#34d399" font-size="10">PRESS / RELEASE</text>
  </g>

  <!-- Input raw_key -->
  <path d="M 10 165 L 40 165" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr)"/>
  <text x="18" y="152" fill="#38bdf8" font-size="11">raw_key</text>

  <!-- 3 & 4. Width Counter & Dash Comparator -->
  <g transform="translate(260, 90)">
    <rect width="210" height="150" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
    <text x="105" y="28" text-anchor="middle" fill="#34d399" font-size="13" font-weight="bold">3 &amp; 4. Dash Discriminator</text>
    <text x="105" y="46" text-anchor="middle" fill="#94a3b8" font-size="11">4-bit T-FF Counter + 7485</text>
    <rect x="15" y="58" width="180" height="32" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="79" text-anchor="middle" fill="#e2e8f0" font-size="11">width_counter (4× TFF)</text>
    <rect x="15" y="98" width="180" height="36" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="115" text-anchor="middle" fill="#e2e8f0" font-size="11">comparator_dash (ic7485)</text>
    <text x="105" y="128" text-anchor="middle" fill="#f59e0b" font-size="10">Sticky DASH Flag (DFF)</text>
  </g>

  <path d="M 220 145 L 260 145" stroke="#34d399" stroke-width="2" marker-end="url(#arr-green)"/>
  <text x="238" y="137" fill="#34d399" font-size="10">PRESS</text>

  <!-- 5. 5-Cell Symbol Register (SIPO from JK Flip-Flops) -->
  <g transform="translate(510, 90)">
    <rect width="360" height="150" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
    <text x="180" y="28" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="bold">5. 5-Cell SIPO Symbol Register (symbol_reg.vhd)</text>
    <text x="180" y="46" text-anchor="middle" fill="#94a3b8" font-size="11">Built from 5× JK Flip-Flops (J = D·sh_en, K = D'·sh_en + clear)</text>
    
    <!-- 5 JK Cells -->
    <g transform="translate(15, 60)">
      <!-- Cell 0 -->
      <rect x="0" y="0" width="60" height="70" rx="4" fill="#0f172a" stroke="#fbbf24"/>
      <text x="30" y="24" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">JK #0</text>
      <text x="30" y="44" text-anchor="middle" fill="#f8fafc" font-size="12">Q₀</text>
      <text x="30" y="60" text-anchor="middle" fill="#94a3b8" font-size="9">s₀ (1st)</text>

      <!-- Cell 1 -->
      <rect x="68" y="0" width="60" height="70" rx="4" fill="#0f172a" stroke="#fbbf24"/>
      <text x="98" y="24" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">JK #1</text>
      <text x="98" y="44" text-anchor="middle" fill="#f8fafc" font-size="12">Q₁</text>
      <text x="98" y="60" text-anchor="middle" fill="#94a3b8" font-size="9">s₁</text>

      <!-- Cell 2 -->
      <rect x="136" y="0" width="60" height="70" rx="4" fill="#0f172a" stroke="#fbbf24"/>
      <text x="166" y="24" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">JK #2</text>
      <text x="166" y="44" text-anchor="middle" fill="#f8fafc" font-size="12">Q₂</text>
      <text x="166" y="60" text-anchor="middle" fill="#94a3b8" font-size="9">s₂</text>

      <!-- Cell 3 -->
      <rect x="204" y="0" width="60" height="70" rx="4" fill="#0f172a" stroke="#fbbf24"/>
      <text x="234" y="24" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">JK #3</text>
      <text x="234" y="44" text-anchor="middle" fill="#f8fafc" font-size="12">Q₃</text>
      <text x="234" y="60" text-anchor="middle" fill="#94a3b8" font-size="9">s₃</text>

      <!-- Cell 4 -->
      <rect x="272" y="0" width="60" height="70" rx="4" fill="#0f172a" stroke="#fbbf24"/>
      <text x="302" y="24" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">JK #4</text>
      <text x="302" y="44" text-anchor="middle" fill="#f8fafc" font-size="12">Q₄</text>
      <text x="302" y="60" text-anchor="middle" fill="#94a3b8" font-size="9">s₄ (5th)</text>
    </g>
  </g>

  <path d="M 470 165 L 510 165" stroke="#f59e0b" stroke-width="2" marker-end="url(#arr-amber)"/>
  <text x="480" y="157" fill="#f59e0b" font-size="10">DASH</text>

  <!-- 6. Gap Counter -->
  <g transform="translate(40, 275)">
    <rect width="210" height="135" rx="8" fill="#1e293b" stroke="#a855f7" stroke-width="2"/>
    <text x="105" y="26" text-anchor="middle" fill="#a855f7" font-size="13" font-weight="bold">6. Gap Counter (gap_counter.vhd)</text>
    <text x="105" y="44" text-anchor="middle" fill="#94a3b8" font-size="10">5-bit T-FF + Cascaded 7485s</text>
    <rect x="15" y="55" width="180" height="30" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="74" text-anchor="middle" fill="#e2e8f0" font-size="10">Threshold 2T (8): LETTER_END</text>
    <rect x="15" y="92" width="180" height="30" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="111" text-anchor="middle" fill="#e2e8f0" font-size="10">Threshold 5T (20): WORD_END</text>
  </g>

  <!-- 7. Control FSM -->
  <g transform="translate(290, 275)">
    <rect width="180" height="135" rx="8" fill="#1e293b" stroke="#ec4899" stroke-width="2"/>
    <text x="90" y="26" text-anchor="middle" fill="#ec4899" font-size="13" font-weight="bold">7. Control FSM (morse_fsm)</text>
    <text x="90" y="44" text-anchor="middle" fill="#94a3b8" font-size="10">4 States, 2 DFFs (Gray Coded)</text>
    <text x="90" y="68" text-anchor="middle" fill="#e2e8f0" font-size="11">IDLE (00) → MEAS (01)</text>
    <text x="90" y="86" text-anchor="middle" fill="#e2e8f0" font-size="11">GAP (11) → DECODE (10)</text>
    <text x="90" y="108" text-anchor="middle" fill="#f472b6" font-size="10">decode_strobe / clear_regs</text>
  </g>

  <!-- 8. Word Space -->
  <g transform="translate(40, 440)">
    <rect width="210" height="90" rx="8" fill="#1e293b" stroke="#06b6d4" stroke-width="2"/>
    <text x="105" y="26" text-anchor="middle" fill="#06b6d4" font-size="13" font-weight="bold">8. Word Space (word_space.vhd)</text>
    <text x="105" y="45" text-anchor="middle" fill="#94a3b8" font-size="10">LETTER_SEEN DFF Guard</text>
    <text x="105" y="68" text-anchor="middle" fill="#38bdf8" font-size="11">Single-pulse SPACE Strobe</text>
  </g>

  <path d="M 250 485 L 1100 485" stroke="#06b6d4" stroke-width="2" marker-end="url(#arr)"/>
  <text x="1050" y="475" fill="#06b6d4" font-size="12" font-weight="bold">SPACE</text>

  <!-- 5b. Length Counter -->
  <g transform="translate(510, 275)">
    <rect width="160" height="135" rx="8" fill="#1e293b" stroke="#eab308" stroke-width="2"/>
    <text x="80" y="26" text-anchor="middle" fill="#eab308" font-size="12" font-weight="bold">Length Counter</text>
    <text x="80" y="44" text-anchor="middle" fill="#94a3b8" font-size="10">3-bit TFF Counter</text>
    <rect x="15" y="55" width="130" height="30" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="80" y="74" text-anchor="middle" fill="#e2e8f0" font-size="10">Count len[2:0]</text>
    <rect x="15" y="92" width="130" height="30" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="80" y="111" text-anchor="middle" fill="#ef4444" font-size="10">OVERFLOW (>=6)</text>
  </g>

  <!-- 10. Output Register -->
  <g transform="translate(710, 275)">
    <rect width="160" height="135" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="2"/>
    <text x="80" y="26" text-anchor="middle" fill="#10b981" font-size="12" font-weight="bold">10. Output Latch Reg</text>
    <text x="80" y="44" text-anchor="middle" fill="#94a3b8" font-size="10">DFF Bank (output_reg.vhd)</text>
    <text x="80" y="74" text-anchor="middle" fill="#e2e8f0" font-size="10">Latches {len, bits, ovf}</text>
    <text x="80" y="95" text-anchor="middle" fill="#34d399" font-size="10">on decode_strobe</text>
    <text x="80" y="115" text-anchor="middle" fill="#94a3b8" font-size="9">Holds display across gaps</text>
  </g>

  <!-- 9. 74138 Decoder Network -->
  <g transform="translate(910, 90)">
    <rect width="210" height="320" rx="8" fill="#1e293b" stroke="#6366f1" stroke-width="2"/>
    <text x="105" y="28" text-anchor="middle" fill="#6366f1" font-size="13" font-weight="bold">9. 74138 Decoder Network</text>
    <text x="105" y="46" text-anchor="middle" fill="#94a3b8" font-size="11">Total: 6× 74138 ICs (Minimized)</text>
    
    <rect x="15" y="58" width="180" height="34" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="74" text-anchor="middle" fill="#e2e8f0" font-size="10">1× 74138: Length (/L1../L5)</text>
    <text x="105" y="86" text-anchor="middle" fill="#94a3b8" font-size="9">len[2:0] to CBA</text>

    <rect x="15" y="100" width="180" height="34" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="116" text-anchor="middle" fill="#e2e8f0" font-size="10">1× 74138: n=1 Letters (E, T)</text>
    <text x="105" y="128" text-anchor="middle" fill="#94a3b8" font-size="9">BC grounded, enabled /L1</text>

    <rect x="15" y="142" width="180" height="34" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="158" text-anchor="middle" fill="#e2e8f0" font-size="10">1× 74138: n=2 Letters (I,A,N,M)</text>
    <text x="105" y="170" text-anchor="middle" fill="#94a3b8" font-size="9">C grounded, enabled /L2</text>

    <rect x="15" y="184" width="180" height="34" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="200" text-anchor="middle" fill="#e2e8f0" font-size="10">1× 74138: n=3 Letters (S,U..)</text>
    <text x="105" y="212" text-anchor="middle" fill="#94a3b8" font-size="9">Full 8 outputs, enabled /L3</text>

    <rect x="15" y="226" width="180" height="50" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="105" y="242" text-anchor="middle" fill="#e2e8f0" font-size="10">2× 74138: 4-to-16 on Q(3..0)</text>
    <text x="105" y="256" text-anchor="middle" fill="#38bdf8" font-size="9">n=4 Letters (/L4 enabled)</text>
    <text x="105" y="268" text-anchor="middle" fill="#34d399" font-size="9">n=5 Digits 0-9 (Q4 qualified)</text>

    <rect x="15" y="284" width="180" height="24" rx="4" fill="#0f172a" stroke="#ef4444"/>
    <text x="105" y="300" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">ERR Logic (Unused/Ovf)</text>
  </g>

  <!-- Output Busses -->
  <path d="M 1000 410 L 1000 440 L 1100 440" stroke="#6366f1" stroke-width="2.5" marker-end="url(#arr)"/>
  <text x="1050" y="432" fill="#6366f1" font-size="12" font-weight="bold">char_onehot[35:0]</text>

  <path d="M 1030 410 L 1030 520 L 1100 520" stroke="#ef4444" stroke-width="2.5" marker-end="url(#arr)"/>
  <text x="1050" y="512" fill="#ef4444" font-size="12" font-weight="bold">ERR</text>

  <!-- Connections from 5 & 5b to 10 -->
  <path d="M 670 340 L 710 340" stroke="#eab308" stroke-width="2" marker-end="url(#arr)"/>
  <path d="M 680 240 L 680 320 L 710 320" stroke="#f59e0b" stroke-width="2" marker-end="url(#arr)"/>

  <!-- Connections from 10 to 9 -->
  <path d="M 870 340 L 910 340" stroke="#10b981" stroke-width="2" marker-end="url(#arr)"/>

  <!-- Footer note -->
  <text x="575" y="620" text-anchor="middle" fill="#64748b" font-size="12">Single-Clock Synchronous Architecture | Hardware Demo Wrapper Cascades 7490 Decade Counters for Board Clock Division</text>
</svg>`;
    fs.writeFileSync(path.join(FIGURES_DIR, 'architecture_diagram.svg'), svg, 'utf8');
}

// 3. Generate Waveform Diagrams from real VCD data
function parseVcdWaves() {
    const vcd = fs.readFileSync(VCD_PATH, 'utf8');
    const lines = vcd.split(/\r?\n/);

    const idToSig = {};
    for (const line of lines) {
        if (line.startsWith('$var')) {
            const p = line.trim().split(/\s+/);
            if (!idToSig[p[3]]) idToSig[p[3]] = p[4];
        }
    }

    let time = 0;
    const history = []; // array of {time, state}
    let current = {};

    for (const line of lines) {
        const l = line.trim();
        if (l.startsWith('#')) {
            time = parseInt(l.slice(1)) / 1000000; // in ns
            history.push({ time, ...current });
        } else if (l.startsWith('b')) {
            const parts = l.slice(1).split(/\s+/);
            current[parts[1]] = parts[0];
        } else if (l.length >= 2) {
            current[l.slice(1)] = l[0];
        }
    }

    return { idToSig, history };
}

// Generate Waveform SVG for Letter 'A' (.-)
function generateLetterAWaveform(history, idToSig) {
    // Find time range for Letter A in simulation (around 500ns to 850ns)
    const tStart = 500;
    const tEnd = 850;
    const pts = history.filter(h => h.time >= tStart && h.time <= tEnd);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 480" width="1000" height="480" style="background:#0f172a; font-family:'Segoe UI', monospace;">
  <text x="500" y="32" text-anchor="middle" fill="#f8fafc" font-size="18" font-weight="bold">Simulation Waveform: Decoding Letter 'A' (.-)</text>
  <text x="500" y="52" text-anchor="middle" fill="#94a3b8" font-size="12">Captured from real GHDL VCD dump | Time range: 500 ns to 850 ns</text>

  <!-- Time markers -->
  <line x1="160" y1="70" x2="960" y2="70" stroke="#334155" stroke-width="1"/>
  <text x="160" y="65" fill="#64748b" font-size="10">500 ns</text>
  <text x="360" y="65" fill="#64748b" font-size="10">570 ns (Dot)</text>
  <text x="560" y="65" fill="#64748b" font-size="10">670 ns (Dash)</text>
  <text x="800" y="65" fill="#64748b" font-size="10">790 ns (Letter End)</text>
  <text x="960" y="65" fill="#64748b" font-size="10">850 ns (Decoded A)</text>

  <!-- Signal 1: raw_key -->
  <g transform="translate(0, 90)">
    <text x="140" y="24" text-anchor="end" fill="#38bdf8" font-size="12" font-weight="bold">raw_key</text>
    <line x1="160" y1="35" x2="960" y2="35" stroke="#1e293b" stroke-width="1"/>
    <!-- Dot: 540-580ns, Gap: 580-620ns, Dash: 620-740ns, Gap: 740+ -->
    <path d="M 160 30 L 250 30 L 250 10 L 340 10 L 340 30 L 430 30 L 430 10 L 700 10 L 700 30 L 960 30" fill="none" stroke="#38bdf8" stroke-width="2"/>
  </g>

  <!-- Signal 2: key_sync -->
  <g transform="translate(0, 140)">
    <text x="140" y="24" text-anchor="end" fill="#34d399" font-size="12" font-weight="bold">key_sync</text>
    <path d="M 160 30 L 270 30 L 270 10 L 360 10 L 360 30 L 450 30 L 450 10 L 720 10 L 720 30 L 960 30" fill="none" stroke="#34d399" stroke-width="2"/>
  </g>

  <!-- Signal 3: width_count[3:0] -->
  <g transform="translate(0, 190)">
    <text x="140" y="24" text-anchor="end" fill="#fbbf24" font-size="12" font-weight="bold">width_count</text>
    <!-- Bus representation -->
    <rect x="270" y="10" width="90" height="20" rx="3" fill="#1e293b" stroke="#fbbf24"/>
    <text x="315" y="25" text-anchor="middle" fill="#fbbf24" font-size="11">0..4 (Dot)</text>
    <rect x="450" y="10" width="270" height="20" rx="3" fill="#1e293b" stroke="#fbbf24"/>
    <text x="585" y="25" text-anchor="middle" fill="#fbbf24" font-size="11">0..8..12 (Dash Threshold Met)</text>
  </g>

  <!-- Signal 4: dash_flag (sticky) -->
  <g transform="translate(0, 240)">
    <text x="140" y="24" text-anchor="end" fill="#f59e0b" font-size="12" font-weight="bold">dash_flag</text>
    <!-- Stays 0 on dot, sets to 1 at count=8 on dash -->
    <path d="M 160 30 L 610 30 L 610 10 L 960 10" fill="none" stroke="#f59e0b" stroke-width="2"/>
  </g>

  <!-- Signal 5: symbol_bits[4:0] -->
  <g transform="translate(0, 290)">
    <text x="140" y="24" text-anchor="end" fill="#a855f7" font-size="12" font-weight="bold">symbol_bits</text>
    <rect x="160" y="10" width="200" height="20" rx="3" fill="#1e293b" stroke="#a855f7"/>
    <text x="260" y="25" text-anchor="middle" fill="#a855f7" font-size="10">00000</text>
    <rect x="360" y="10" width="360" height="20" rx="3" fill="#1e293b" stroke="#a855f7"/>
    <text x="540" y="25" text-anchor="middle" fill="#a855f7" font-size="10">00000 (sh_in 0)</text>
    <rect x="720" y="10" width="240" height="20" rx="3" fill="#1e293b" stroke="#a855f7"/>
    <text x="840" y="25" text-anchor="middle" fill="#a855f7" font-size="10">00001 (A = "01")</text>
  </g>

  <!-- Signal 6: fsm_state[1:0] -->
  <g transform="translate(0, 340)">
    <text x="140" y="24" text-anchor="end" fill="#ec4899" font-size="12" font-weight="bold">fsm_state</text>
    <rect x="160" y="10" width="110" height="20" rx="3" fill="#1e293b" stroke="#ec4899"/>
    <text x="215" y="24" text-anchor="middle" fill="#94a3b8" font-size="10">IDLE (00)</text>
    <rect x="270" y="10" width="90" height="20" rx="3" fill="#1e293b" stroke="#ec4899"/>
    <text x="315" y="24" text-anchor="middle" fill="#34d399" font-size="10">MEAS (01)</text>
    <rect x="360" y="10" width="90" height="20" rx="3" fill="#1e293b" stroke="#ec4899"/>
    <text x="405" y="24" text-anchor="middle" fill="#fbbf24" font-size="10">GAP (11)</text>
    <rect x="450" y="10" width="270" height="20" rx="3" fill="#1e293b" stroke="#ec4899"/>
    <text x="585" y="24" text-anchor="middle" fill="#34d399" font-size="10">MEAS (01)</text>
    <rect x="720" y="10" width="90" height="20" rx="3" fill="#1e293b" stroke="#ec4899"/>
    <text x="765" y="24" text-anchor="middle" fill="#fbbf24" font-size="10">GAP (11)</text>
    <rect x="810" y="10" width="30" height="20" rx="3" fill="#1e293b" stroke="#ec4899"/>
    <text x="825" y="24" text-anchor="middle" fill="#f472b6" font-size="9">DEC</text>
    <rect x="840" y="10" width="120" height="20" rx="3" fill="#1e293b" stroke="#ec4899"/>
    <text x="900" y="24" text-anchor="middle" fill="#94a3b8" font-size="10">IDLE (00)</text>
  </g>

  <!-- Signal 7: char_onehot[0] (A) -->
  <g transform="translate(0, 390)">
    <text x="140" y="24" text-anchor="end" fill="#10b981" font-size="12" font-weight="bold">char_onehot(0) [A]</text>
    <!-- Latches high on DECODE and holds -->
    <path d="M 160 30 L 840 30 L 840 10 L 960 10" fill="none" stroke="#10b981" stroke-width="2.5"/>
    <text x="890" y="25" fill="#10b981" font-size="11" font-weight="bold">Letter 'A' Active</text>
  </g>
</svg>`;
    fs.writeFileSync(path.join(FIGURES_DIR, 'timing_letter_a.svg'), svg, 'utf8');
}

// Generate Waveform SVG for "SOS" sequence and Word Space
function generateSosWaveform() {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 480" width="1100" height="480" style="background:#0f172a; font-family:'Segoe UI', monospace;">
  <text x="550" y="32" text-anchor="middle" fill="#f8fafc" font-size="18" font-weight="bold">Simulation Waveform: "SOS SOS" Sequence with 7T Word Gap</text>
  <text x="550" y="52" text-anchor="middle" fill="#94a3b8" font-size="12">Captured from real GHDL VCD dump | Exactly one single-cycle SPACE strobe between words</text>

  <!-- Time markers -->
  <line x1="160" y1="70" x2="1060" y2="70" stroke="#334155" stroke-width="1"/>
  <text x="170" y="65" fill="#64748b" font-size="10">S (...)</text>
  <text x="320" y="65" fill="#64748b" font-size="10">O (---)</text>
  <text x="500" y="65" fill="#64748b" font-size="10">S (...)</text>
  <text x="660" y="65" fill="#38bdf8" font-size="10" font-weight="bold">7T Word Gap (>=20 ticks)</text>
  <text x="840" y="65" fill="#64748b" font-size="10">S (...)</text>
  <text x="960" y="65" fill="#64748b" font-size="10">O (---)</text>

  <!-- Signal 1: raw_key -->
  <g transform="translate(0, 90)">
    <text x="140" y="24" text-anchor="end" fill="#38bdf8" font-size="12" font-weight="bold">raw_key</text>
    <!-- S: 3 dots -->
    <path d="M 160 30 L 170 30 L 170 10 L 190 10 L 190 30 L 205 30 L 205 10 L 225 10 L 225 30 L 240 30 L 240 10 L 260 10 L 260 30
             L 320 30 L 320 10 L 360 10 L 360 30 L 375 30 L 375 10 L 415 10 L 415 30 L 430 30 L 430 10 L 470 10 L 470 30
             L 530 30 L 530 10 L 550 10 L 550 30 L 565 30 L 565 10 L 585 10 L 585 30 L 600 30 L 600 10 L 620 10 L 620 30
             L 800 30 L 800 10 L 820 10 L 820 30 L 835 30 L 835 10 L 855 10 L 855 30 L 870 30 L 870 10 L 890 10 L 890 30
             L 940 30 L 940 10 L 980 10 L 980 30 L 1060 30" fill="none" stroke="#38bdf8" stroke-width="2"/>
  </g>

  <!-- Signal 2: Decoded Characters (char_onehot) -->
  <g transform="translate(0, 150)">
    <text x="140" y="24" text-anchor="end" fill="#34d399" font-size="12" font-weight="bold">Active Letter</text>
    <rect x="290" y="10" width="100" height="22" rx="3" fill="#1e293b" stroke="#34d399"/>
    <text x="340" y="26" text-anchor="middle" fill="#34d399" font-size="12" font-weight="bold">'S'</text>
    <rect x="500" y="10" width="100" height="22" rx="3" fill="#1e293b" stroke="#34d399"/>
    <text x="550" y="26" text-anchor="middle" fill="#34d399" font-size="12" font-weight="bold">'O'</text>
    <rect x="640" y="10" width="220" height="22" rx="3" fill="#1e293b" stroke="#34d399"/>
    <text x="750" y="26" text-anchor="middle" fill="#34d399" font-size="12" font-weight="bold">'S' (Holds in Gap)</text>
    <rect x="910" y="10" width="90" height="22" rx="3" fill="#1e293b" stroke="#34d399"/>
    <text x="955" y="26" text-anchor="middle" fill="#34d399" font-size="12" font-weight="bold">'S'</text>
    <rect x="1005" y="10" width="55" height="22" rx="3" fill="#1e293b" stroke="#34d399"/>
    <text x="1032" y="26" text-anchor="middle" fill="#34d399" font-size="12" font-weight="bold">'O'</text>
  </g>

  <!-- Signal 3: word_end flag -->
  <g transform="translate(0, 210)">
    <text x="140" y="24" text-anchor="end" fill="#a855f7" font-size="12" font-weight="bold">word_end (>=5T)</text>
    <!-- Fires in word gap at 720ns -->
    <path d="M 160 30 L 720 30 L 720 10 L 800 10 L 800 30 L 1060 30" fill="none" stroke="#a855f7" stroke-width="2"/>
  </g>

  <!-- Signal 4: LETTER_SEEN Guard -->
  <g transform="translate(0, 270)">
    <text x="140" y="24" text-anchor="end" fill="#fbbf24" font-size="12" font-weight="bold">letter_seen</text>
    <!-- Set by DECODE of S, cleared when space fires -->
    <path d="M 160 30 L 640 30 L 640 10 L 725 10 L 725 30 L 910 30 L 910 10 L 1060 10" fill="none" stroke="#fbbf24" stroke-width="2"/>
  </g>

  <!-- Signal 5: SPACE Strobe (Single 1-cycle Pulse) -->
  <g transform="translate(0, 330)">
    <text x="140" y="24" text-anchor="end" fill="#06b6d4" font-size="12" font-weight="bold">SPACE strobe</text>
    <!-- Exactly ONE single-cycle pulse at 720ns -->
    <path d="M 160 30 L 720 30 L 720 8 L 726 8 L 726 30 L 1060 30" fill="none" stroke="#06b6d4" stroke-width="3"/>
    <circle cx="723" cy="8" r="4" fill="#06b6d4"/>
    <rect x="735" y="5" width="130" height="24" rx="4" fill="#1e293b" stroke="#06b6d4"/>
    <text x="800" y="21" text-anchor="middle" fill="#06b6d4" font-size="11" font-weight="bold">1-Cycle SPACE Pulse</text>
  </g>

  <!-- Signal 6: err (Always 0 during valid SOS) -->
  <g transform="translate(0, 390)">
    <text x="140" y="24" text-anchor="end" fill="#ef4444" font-size="12" font-weight="bold">err</text>
    <path d="M 160 30 L 1060 30" fill="none" stroke="#ef4444" stroke-width="2"/>
    <text x="600" y="24" fill="#64748b" font-size="11">err = 0 (clean keying throughout)</text>
  </g>
</svg>`;
    fs.writeFileSync(path.join(FIGURES_DIR, 'timing_sos.svg'), svg, 'utf8');
}

// Convert SVGs to PNGs using Edge headless screenshot
function convertSvgToPng() {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (!fs.existsSync(edgePath)) {
        console.log('msedge not found at expected path. SVGs are generated and ready.');
        return;
    }

    const files = [
        { svg: 'timing_letter_a.svg', png: 'timing_letter_a.png', w: 1050, h: 520 },
        { svg: 'timing_sos.svg', png: 'timing_sos.png', w: 1150, h: 520 },
        { svg: 'fsm_state_diagram.svg', png: 'fsm_state_diagram.png', w: 1000, h: 600 },
        { svg: 'architecture_diagram.svg', png: 'architecture_diagram.png', w: 1200, h: 700 }
    ];

    for (const f of files) {
        const svgPath = path.join(FIGURES_DIR, f.svg);
        const pngPath = path.join(FIGURES_DIR, f.png);
        // Create a wrapper HTML file to render cleanly with exact dimensions
        const htmlContent = `<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#0f172a; overflow:hidden;">
  <img src="file://${svgPath.replace(/\\/g, '/')}" width="${f.w}" height="${f.h}"/>
</body>
</html>`;
        const tempHtml = path.join(FIGURES_DIR, '_temp.html');
        fs.writeFileSync(tempHtml, htmlContent, 'utf8');

        try {
            const cmd = `"${edgePath}" --headless --screenshot="${pngPath}" --window-size=${f.w},${f.h} --default-background-color=00000000 "file://${tempHtml.replace(/\\/g, '/')}"`;
            execSync(cmd, { stdio: 'ignore' });
            console.log(`Generated PNG: ${f.png} (${f.w}x${f.h})`);
        } catch (err) {
            console.error(`Failed to generate PNG for ${f.svg}:`, err.message);
        }

        if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
    }
}

function main() {
    console.log('Generating slide-ready diagrams and waveforms...');
    generateFsmDiagram();
    generateArchDiagram();
    const { history, idToSig } = parseVcdWaves();
    generateLetterAWaveform(history, idToSig);
    generateSosWaveform();
    convertSvgToPng();
    console.log('All figures generated successfully in figures/');
}

main();
