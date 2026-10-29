# Digital Morse Decoder 
A complete, fully verified, and synthesizable **Digital Morse Decoder**.

This repository contains both the **IEEE VHDL-93 hardware core** (verified 100% in GHDL and ModelSim across 8 test suites) and an interactive web visualization workbench.

---

## 🏛️ Syllabus-Compliant Architecture ( )

The hardware architecture uses **ONLY** primitives explicitly covered in  :
- **Sequential Primitives (Unit IV Behavioral)**: S-R latch (`srlatch`), edge-triggered D flip-flop (`dff`), J-K flip-flop (`jkff`), T flip-flop (`tff`), 7490 decade counter (`ic7490`).
- **MSI Combinational ICs (Unit V Dataflow)**: 74138 (3-to-8 decoder), 7485 (4-bit magnitude comparator), 7483 (4-bit full adder), 74151 (8:1 mux), 74153 (dual 4:1 mux), 7404 (NOT), 7408 (AND), 7432 (OR).
- **Subsystems & Integration (Unit V Structural)**:
  - 2-Stage DFF Metastability Synchroniser (`synchroniser.vhd`)
  - Single-cycle Edge Detector (`edge_detector.vhd`)
  - Pulse Width Counter (`width_counter.vhd`) & Sticky Dash Discriminator (`comparator_dash.vhd`)
  - 5-bit SIPO Symbol Register from cascaded J-K flip-flops (`symbol_reg.vhd`)
  - 3-bit T-FF Character Length Counter (`length_counter.vhd`)
  - Inter-Element Gap Counter & Letter End Detector (`gap_counter.vhd`)
  - 4-State Gray-Coded FSM Controller (`morse_fsm.vhd` & `fsm_comb.vhd`)
  - Word Space Generator with single-shot pulse guard (`word_space.vhd`)
  - 36-bit DFF Output Latch with display hold persistence (`output_reg.vhd`)
  - 36-Character Decoder Matrix from 6x 74138 decoders & 74xx gates (`morse_decoder_74138.vhd`)
  - Integrated Top System (`morse_top.vhd`) and FPGA Wrapper (`morse_demo_wrapper.vhd`)

> [!IMPORTANT]
> **Zero Forbidden Primitives**: No 7474, 7475, 74161, 74164, 74175, 74194, 74139, 74154, 555 timers, Verilog code, ROM/RAM lookup tables, microcontrollers/CPUs, behavioral FSMs, or case-statement character tables are used anywhere in the design.

---

## 📊 Visual Artifacts & Slide-Ready Diagrams

All figures are pre-rendered in high resolution in [`figures/`](file:///d:/DL/figures):

| Diagram | Description | PNG Preview |
| :--- | :--- | :---: |
| **System Architecture** | Structural hierarchy, 74xx IC interconnection, and signal paths | [`figures/architecture_diagram.png`](file:///d:/DL/figures/architecture_diagram.png) |
| **FSM State Diagram** | 4-state Gray-coded controller (`IDLE`, `MEASURE`, `GAP`, `DECODE`) | [`figures/fsm_state_diagram.png`](file:///d:/DL/figures/fsm_state_diagram.png) |
| **Letter 'A' Timing** | Waveform showing dot (4T), gap (1T), dash (12T), and decode latch | [`figures/timing_letter_a.png`](file:///d:/DL/figures/timing_letter_a.png) |
| **'SOS' Sequence Timing** | Full message sequence with 3T inter-letter gaps and space detection | [`figures/timing_sos.png`](file:///d:/DL/figures/timing_sos.png) |

---

## 🚀 Quick Start & Simulation

### 1. Verification with GHDL and Make
```bash
# Run top-level system testbench with all 8 test suites:
make test

# Run individual unit testbenches (DFF, JKFF, TFF, 74138, 7485, 7490):
make test-units

# Regenerate all diagrams and waveforms:
make diagrams

# Launch simulation waveforms in GTKWave:
make wave
```

### 2. ModelSim / QuestaSim
In ModelSim transcript window:
```tcl
do run.do
```

### 3. Comprehensive Test Results
All 8 test suites in [`tb/tb_morse.vhd`](file:///d:/DL/tb/tb_morse.vhd) pass with zero assertion errors:
1. **Test 1**: All 36 characters (A-Z, 0-9) decoded with exact one-hot match.
2. **Test 2**: Precise boundary tests (7 vs 8 ticks ON, 7 vs 8 ticks OFF, 19 vs 20 ticks gap).
3. **Test 3**: "SOS" and "SOS SOS" with 3T letter gaps and 7T word gap (exactly 1 space pulse).
4. **Test 4**: Nominal keying for A, 5, 0, E, T, H, I.
5. **Test 5**: Error detection (6 symbols, 9+ symbols, invalid 4/5-symbol codes).
6. **Test 6**: Counter wrap-around immunity (100-tick hold and 100-tick gap).
7. **Test 7**: Power-up safety & display hold persistence.
8. **Test 8**: FSM state transition sequence logging during SOS.

---

## 💻 Web Visualization Workbench

To launch the interactive visual circuit workbench in your browser:

```bash
npm install
npm run dev
```
Open `http://localhost:5173/` to interact with the virtual straight key, logic analyzer, and breadboard.

---

## 📜 License
MIT License.
