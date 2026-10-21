# MDIT221 Syllabus Coverage & Entity Mapping

This document provides a comprehensive mapping of every VHDL entity in the **Digital Morse Decoder** design to the **MDIT221 Digital Logic Design** syllabus (Units IV and V: Behavioral, Dataflow, and Structural modeling styles).

---

## 1. Summary of Modeling Styles

| Modeling Style | MDIT221 Syllabus Reference | Primary Constructs Used | Number of Entities |
| :--- | :--- | :--- | :---: |
| **Behavioral** | **Unit IV:** Sequential logic, flip-flops, latches, counters | `process`, `if rising_edge(clk)`, wait-free sensitivity lists | **5** |
| **Dataflow** | **Unit V:** Combinational MSI logic, concurrent signal assignment | Concurrent `when-else`, Boolean operators, concurrent logic | **9** |
| **Structural** | **Unit V:** Hierarchical design, component instantiation | `component`, `port map`, VHDL-93 binding configurations | **13** |
| **Total Design Entities** | | | **27** |

---

## 2. Complete Entity-by-Entity Mapping Matrix

| # | Entity Name | Source File | Syllabus Unit | Modeling Style | Hardware Primitive / IC Represented | Function in Morse Decoder |
|---|:---|:---|:---:|:---:|:---|:---|
| 1 | `dff` | [`src/dff.vhd`](file:///d:/DL/src/dff.vhd) | Unit IV | Behavioral | Positive edge-triggered D flip-flop with async active-low reset | Basic 1-bit memory element for FSM state registers, edge detector, synchroniser, and output character latch. |
| 2 | `jkff` | [`src/jkff.vhd`](file:///d:/DL/src/jkff.vhd) | Unit IV | Behavioral | Negative edge-triggered J-K flip-flop with async active-low reset | Shift register cells in `symbol_reg` (configurable for hold, clear, shift dot '0', shift dash '1'). |
| 3 | `tff` | [`src/tff.vhd`](file:///d:/DL/src/tff.vhd) | Unit IV | Behavioral | Negative edge-triggered T flip-flop with async active-low reset | Binary ripple counter stages in `length_counter` (measures 1 to 5 symbols). |
| 4 | `srlatch` | [`src/srlatch.vhd`](file:///d:/DL/src/srlatch.vhd) | Unit IV | Behavioral | Set-Reset latch with active-high inputs | Asynchronous sticky flag latching for boundary condition detection. |
| 5 | `ic7490` | [`src/ic7490.vhd`](file:///d:/DL/src/ic7490.vhd) | Unit IV | Behavioral | 7490 BCD / Decade Counter (MOD-2 + MOD-5 ripple stages) | Width counter timing generator for pulse measurement (dot vs dash) and gap interval timing. |
| 6 | `ic7404` | [`src/ic7404.vhd`](file:///d:/DL/src/ic7404.vhd) | Unit V | Dataflow | Hex Inverter (NOT gates) | Logic signal inversion throughout combinational steering networks. |
| 7 | `ic7408` | [`src/ic7408.vhd`](file:///d:/DL/src/ic7408.vhd) | Unit V | Dataflow | Quad 2-input AND Gates | Term gating, enable qualifiers, and address decode pre-qualification. |
| 8 | `ic7432` | [`src/ic7432.vhd`](file:///d:/DL/src/ic7432.vhd) | Unit V | Dataflow | Quad 2-input OR Gates | Reset signal merging, multi-source enables, and decoded strobe combining. |
| 9 | `ic7483` | [`src/ic7483.vhd`](file:///d:/DL/src/ic7483.vhd) | Unit V | Dataflow | 4-bit Binary Full Adder with Fast Lookahead Carry | Address offset calculation and arithmetic timing threshold offsets. |
| 10 | `ic7485` | [`src/ic7485.vhd`](file:///d:/DL/src/ic7485.vhd) | Unit V | Dataflow | 4-bit Magnitude Comparator ($A>B, A=B, A<B$) | Pulse-width discriminator (distinguishes dot from dash at $\ge 7$ ticks) and gap thresholds. |
| 11 | `ic74138` | [`src/ic74138.vhd`](file:///d:/DL/src/ic74138.vhd) | Unit V | Dataflow | 3-to-8 Line Decoder / Demultiplexer with 3 enable inputs | Core 36-character Morse matrix decoding across 6 bank partitions. |
| 12 | `ic74151` | [`src/ic74151.vhd`](file:///d:/DL/src/ic74151.vhd) | Unit V | Dataflow | 8-to-1 Multiplexer with complementary $Y, W$ outputs | Bank output data selection and character active routing. |
| 13 | `ic74153` | [`src/ic74153.vhd`](file:///d:/DL/src/ic74153.vhd) | Unit V | Dataflow | Dual 4-to-1 Multiplexer with independent active-low strobes | FSM next-state multiplexing and steering multiplexer. |
| 14 | `fsm_comb` | [`src/fsm_comb.vhd`](file:///d:/DL/src/fsm_comb.vhd) | Unit V | Dataflow | Gate-level SOP combinational logic | Minimal Gray-code next-state logic and Mealy/Moore control outputs for FSM. |
| 15 | `synchroniser` | [`src/synchroniser.vhd`](file:///d:/DL/src/synchroniser.vhd) | Unit V | Structural | 2x Cascaded `dff` instances | Two-stage synchroniser eliminating metastability on external asynchronous Morse key input. |
| 16 | `edge_detector` | [`src/edge_detector.vhd`](file:///d:/DL/src/edge_detector.vhd) | Unit V | Structural | 1x `dff`, 1x `ic7404`, 2x `ic7408` | Generates 1-clock-cycle pulses `press_pulse` (rising edge) and `release_pulse` (falling edge). |
| 17 | `width_counter` | [`src/width_counter.vhd`](file:///d:/DL/src/width_counter.vhd) | Unit V | Structural | Cascaded `ic7490` counters | BCD/Decade counter measuring key-press duration in system clock cycles. |
| 18 | `comparator_dash` | [`src/comparator_dash.vhd`](file:///d:/DL/src/comparator_dash.vhd) | Unit V | Structural | 1x `ic7485` + sticky latch | Compares measured width against threshold $7$ ($2T-1$). Outputs sticky `dash_flag`. |
| 19 | `symbol_reg` | [`src/symbol_reg.vhd`](file:///d:/DL/src/symbol_reg.vhd) | Unit V | Structural | 5x `jkff` cells in shift cascade | 5-bit shift register storing symbols in chronological order ($Q_0$: first, $Q_4$: fifth; 0=dot, 1=dash). |
| 20 | `length_counter` | [`src/length_counter.vhd`](file:///d:/DL/src/length_counter.vhd) | Unit V | Structural | 3x `tff` binary ripple counter | Tracks number of symbols received in current letter ($0$ to $5$). |
| 21 | `gap_counter` | [`src/gap_counter.vhd`](file:///d:/DL/src/gap_counter.vhd) | Unit V | Structural | Cascaded `ic7490` counters + `ic7485` | Measures key-release gap duration. Generates `letter_end` strobe at $\ge 7$ ticks ($2T-1$). |
| 22 | `morse_fsm` | [`src/morse_fsm.vhd`](file:///d:/DL/src/morse_fsm.vhd) | Unit V | Structural | 2x `dff` + 1x `fsm_comb` | 4-state Gray-coded controller (`IDLE` 00, `MEASURE` 01, `GAP` 11, `DECODE` 10). |
| 23 | `word_space` | [`src/word_space.vhd`](file:///d:/DL/src/word_space.vhd) | Unit V | Structural | 1x `ic7485` + 1x `dff` + 1x `ic7408` | Detects inter-word silence interval ($\ge 19$ ticks / $5T-1$). Emits single space pulse. |
| 24 | `output_reg` | [`src/output_reg.vhd`](file:///d:/DL/src/output_reg.vhd) | Unit V | Structural | 36x `dff` storage cells | Latches decoded 36-bit one-hot character vector on `decode_strobe`; holds display between characters. |
| 25 | `morse_decoder_74138` | [`src/morse_decoder_74138.vhd`](file:///d:/DL/src/morse_decoder_74138.vhd) | Unit V | Structural | 6x `ic74138` decoders + discrete 74xx gates | Pure hardware matrix translating $(\text{Length}[2:0], \text{Symbol}[4:0])$ into 36 active-high character signals. |
| 26 | `morse_top` | [`src/morse_top.vhd`](file:///d:/DL/src/morse_top.vhd) | Unit V | Structural | Complete core interconnection | Structural integration of synchroniser, edge detector, counters, FSM, matrix decoder, and output register. |
| 27 | `morse_demo_wrapper` | [`src/morse_demo_wrapper.vhd`](file:///d:/DL/src/morse_demo_wrapper.vhd) | Unit V | Structural | Top wrapper with clock divider & debounce | Board-level integration wrapper suitable for FPGA evaluation kits (e.g., Basys 3, DE10-Lite). |

---

## 3. Strict Compliance Verification

1. **No Forbidden Primitives:**
   - No behavioral `case` or `with-select` statement character mapping tables.
   - No ROM, BRAM, LUT primitive, or EEPROM.
   - No 7474, 7475, 74161, 74164, 74175, 74194, 74139, 74154, or 555 timers.
   - No CPU, ALU, or microcontroller cores.

2. **Syllabus Primitives Exclusively:**
   - Every sequential storage element is built from primitive S-R latches or D, J-K, T flip-flops.
   - Every MSI combinational component is an exact model of the syllabus 74xx IC family: 7490, 7485, 7483, 74151, 74153, 74138, 7404, 7408, 7432.
