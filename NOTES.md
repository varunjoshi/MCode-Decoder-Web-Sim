# NOTES.md: Digital Morse Decoder (DLD Mini-Project MDIT221)

## 1. Project Overview & Working Plan
This document records engineering decisions, syllabus compliance verification, race analysis, assumptions, and validation logs for the **Digital Morse Decoder** implemented in VHDL-93 under MDIT221 (Units IV & V).

### Working Plan
1. **Toolchain Verification**:
   - GHDL (v6.0.0 mcode) installed and verified.
   - GNU Make (v4.4.1) installed and verified.
   - Headless Microsoft Edge verified for high-resolution timing diagram generation from VCD.
   - ModelSim `run.do` and Quartus/Vivado portability maintained (no non-standard pragmas, pure VHDL-93).
2. **Component Architecture & Unit Design (27 Entities Total)**:
   - Behavioral Leaf Primitives (Unit IV - 5 Entities): `dff`, `jkff`, `tff`, `srlatch`, `ic7490`.
   - Dataflow Leaf Primitives (Unit V - 9 Entities): `ic7404`, `ic7408`, `ic7432`, `ic74138`, `ic7485`, `ic7483`, `ic74151`, `ic74153`, and FSM combinational logic `fsm_comb`.
   - Structural Subsystems & Top (Unit V - 13 Entities):
     - `synchroniser`: 2 DFFs eliminating input metastability.
     - `edge_detector`: DFF + gates -> `press` and `release`.
     - `width_counter`: Cascaded 7490 BCD decade counters measuring pulse duration.
     - `comparator_dash`: 7485 comparator against threshold $7$ ($2T-1$) with sticky DASH flip-flop.
     - `symbol_reg`: 5-bit SIPO shift register from cascaded JK-FFs.
     - `length_counter`: 3-bit binary counter from T-FFs with overflow suppression.
     - `gap_counter`: Cascaded 7490 counters + 7485 comparator against threshold $7$ ($2T-1$) for `LETTER_END`.
     - `morse_fsm`: 4-state Gray-encoded FSM (`IDLE=00`, `MEASURE=01`, `GAP=11`, `DECODE=10`).
     - `word_space`: Single-shot word space generator at $\ge 19$ ticks ($5T-1$) with `LETTER_SEEN` guard.
     - `output_reg`: 36-bit DFF output character register latching decoded letter on `decode_strobe`.
     - `morse_decoder_74138`: 36-character and error decoder matrix using 6x 74138 decoders and 7404/7408/7432 gates.
     - `morse_top`: Integrated top-level structural design.
     - `morse_demo_wrapper`: Clock divider demo wrapper using cascaded 7490 decade counters.
3. **Unit Testing**:
   - `tb_dff`, `tb_jkff`, `tb_tff`, `tb_ic74138`, `tb_ic7485`, `tb_ic7490` (All pass).
4. **Integration & System Testing (`tb_morse`)**:
   - Test 1: All 36 characters (A-Z, 0-9) decoded with exact one-hot match.
   - Test 2: Precise boundary tests (7 vs 8 ticks ON, 7 vs 8 ticks OFF, 19 vs 20 ticks gap).
   - Test 3: "SOS" and "SOS SOS" with 3T letter gaps and 7T word gap (exactly one space).
   - Test 4: Nominal keying for A, 5, 0, E, T, H, I.
   - Test 5: Error detection (6 symbols, 9+ symbols, invalid 4/5-symbol codes).
   - Test 6: Wrap-around immunity (100-tick hold and 100-tick gap).
   - Test 7: Power-up safety (no false space at startup, display holds).
   - Test 8: FSM state sequence logging during SOS.
5. **Documentation & Waveform Artifacts**:
   - `compile_order.txt`, `Makefile`, `run.do`.
   - `docs/coverage_map.md`, `docs/syllabus_check.md`, `docs/kmap.md`, `docs/fsm.md`, `docs/README.md`.
   - Slide-ready timing diagrams and architecture figures generated in `figures/`.

---

## 2. Syllabus Compliance Verification (Hard Rule)

| Component / Subsystem | Primitive Used | Syllabus Status | Justification / Notes |
| :--- | :--- | :--- | :--- |
| Clock Divider (Demo) | `ic7490` | **ALLOWED** | Syllabus IC (Decade / MOD-N Counter) |
| Magnitude Comparators | `ic7485` | **ALLOWED** | Syllabus IC (4-bit magnitude comparator with cascading) |
| Arithmetic / Adder | `ic7483` | **ALLOWED** | Syllabus IC (4-bit binary adder) |
| Character Decoder | `ic74138` | **ALLOWED** | Syllabus IC (3-to-8 decoder/demultiplexer) |
| Multiplexers | `ic74151`, `ic74153`| **ALLOWED** | Syllabus ICs (8:1 mux, dual 4:1 mux) |
| Basic Gates | `7404`, `7408`, `7432`, generic gates | **ALLOWED** | Syllabus gate-level primitives |
| State & Storage Registers | `dff`, `jkff`, `tff`, `srlatch` | **ALLOWED** | Syllabus flip-flops & latches |

### Disallowed Parts Checked & Excluded:
- **NO** 7474, 7475, 74161, 74164, 74175, 74194, 74139, 74154.
- **NO** 555 timers (pure synchronous logic replaces analog timers).
- **NO** Verilog code.
- **NO** ROM or lookup tables.
- **NO** Microcontroller or CPU cores.
- **NO** Behavioral FSM or case-statement character tables.

---

## 3. Engineering Decisions & Architecture Details

### 3.1 Timing Model ($T\_TICKS = 4$)
- Unit time $1T = 4$ clock ticks.
- Dot duration: nominal $1T = 4$ ticks ($< 2T = 8$ ticks).
- Dash duration: nominal $3T = 12$ ticks ($\ge 2T = 8$ ticks).
- Symbol gap: nominal $1T = 4$ ticks ($< 2T = 8$ ticks).
- Letter gap: nominal $3T = 12$ ticks ($\ge 2T = 8$ ticks $\implies$ `LETTER_END`).
- Word gap: nominal $7T = 28$ ticks ($\ge 5T = 20$ ticks $\implies$ `WORD_END`).
- Testbench master tick clock: 10 ns (100 MHz).
- Discrete boundary threshold alignment:
  - An input pulse held for $N$ clock intervals has $N-1$ internal clock edges. Therefore, a boundary of $2T$ (8 clock periods) presents count $= 7$ ($2T-1$) on the clock edge coinciding with release.
  - The comparator threshold is set to $7$ ($A \ge 7$), and `dash_flag` is implemented as an immediate/sticky combinational-registered OR: `sticky_q or cmp_ge`. This guarantees that an 8-tick pulse reliably clocks in a Dash (`1`), while a 7-tick pulse reliably clocks in a Dot (`0`).
  - Similarly, the inter-word space detector threshold is aligned to $19$ ticks ($5T-1$), ensuring exact boundary discrimination between 19-tick silence (no space) and 20-tick silence (space pulse).

### 3.2 Counter Wrap-Around Immunity via Sticky Flags
- Standard 4-bit counters wrap from 15 to 0. A non-sticky design would misclassify a long hold (e.g. 100 ticks) as a dot if the counter wrapped to $< 8$ at the moment of release.
- **Decision**: The comparator `ic7485` triggers a **sticky DASH flip-flop** as soon as width $\ge 7$. Once set, the DASH flip-flop remains high until the next `press` event. Thus, counter wrap-around during key-down is completely harmless.
- Similarly, for the gap counter, sticky `LETTER_END` (set at $\ge 7$) and sticky `WORD_END` (set at $\ge 19$) ensure that counter wrap-around during long idle periods never drops the flag or triggers spurious events.

### 3.3 Shift Register SIPO from JK Flip-Flops
- Syllabus forbids 74164 / 74194.
- Built structurally using 5 `jkff` instances.
- For each stage $i$:
  $$J_i = D_{in\_i} \cdot \text{shift\_en} \cdot \overline{\text{clear}}, \quad K_i = (\overline{D_{in\_i}} \cdot \text{shift\_en}) \lor \text{clear}$$
- When $\text{clear} = '0'$ and $\text{shift\_en} = '0'$, $J = 0, K = 0$ (hold state).
- When $\text{clear} = '1'$, $J = 0, K = 1$ (synchronous reset on next clock edge).
- Direction: Left-shift SIPO. First received symbol enters at stage 0 and shifts toward higher stages. At the end of $n$ symbols, $Q(n-1 \text{ downto } 0)$ contains the exact code sequence $s_0 s_1 \dots s_{n-1}$ matching the syllabus character table.

### 3.4 4-State Gray-Encoded FSM
- States:
  - `IDLE = "00"`
  - `MEASURE = "01"`
  - `GAP = "11"`
  - `DECODE = "10"`
- **Gray Encoding Justification**:
  - `IDLE (00) -> MEASURE (01)`: Only bit 0 toggles ($0 \to 1$).
  - `MEASURE (01) -> GAP (11)`: Only bit 1 toggles ($0 \to 1$).
  - `GAP (11) -> MEASURE (01)`: Only bit 1 toggles ($1 \to 0$).
  - `GAP (11) -> DECODE (10)`: Only bit 0 toggles ($1 \to 0$).
  - `DECODE (10) -> IDLE (00)`: Only bit 1 toggles ($1 \to 0$).
  - Result: Every valid state transition toggles **exactly one flip-flop**. This eliminates dynamic intermediate state hazards and reduces switching power.

### 3.5 Decoder Architecture using 6x 74138 ICs
- Syllabus forbids 74154 (4-to-16 decoder) and 74139 (dual 2-to-4 decoder).
- Length decoder: 1x `ic74138` decoding length 1..5 to active-low $/L_1 \dots /L_5$.
- Character decoders:
  - $n=1$: 1x 74138 with $A = Q_0, B = 0, C = 0$, enabled by $/L_1$ (E, T).
  - $n=2$: 1x 74138 with $A = Q_0, B = Q_1, C = 0$, enabled by $/L_2$ (I, A, N, M).
  - $n=3$: 1x 74138 with $A = Q_0, B = Q_1, C = Q_2$, enabled by $/L_3$ (S, U, R, W, D, K, G, O).
  - $n=4$: 2x 74138 forming 4-to-16 on $Q(3..0)$, enabled by $/L_4$ (H, V, F, L, P, J, B, X, C, Y, Z, Q). Unused codes map to ERR.
  - $n=5$: Shares the 4-to-16 structure on $Q(3..0)$, qualified by bit $Q(4)$ using standard 7408/7432 gating.
- Full K-maps and Boolean derivations are documented in [`docs/kmap.md`](file:///d:/DL/docs/kmap.md).

---

## 4. Race Analysis & Timing Integrity

1. **Output Register Latch vs. Register Clear (Resolved)**:
   - Initial naive design routed `clear_regs` to asynchronous clear pins, which wiped `symbol_reg` immediately upon entering `DECODE` before the clock edge could latch data into `output_reg`.
   - **Resolution**: `clear` is routed strictly to synchronous control inputs ($J=0, K=1$ for `jkff`, $T=Q$ for `tff`).
   - During the `DECODE` cycle, data is held stable at the D inputs of `output_reg`. On the rising clock edge exiting `DECODE` to `IDLE`, `output_reg` latches the valid decoded character, while `symbol_reg` and `length_counter` simultaneously clear.
2. **Key Bounce & Synchronizer Hazards**:
   - Asynchronous switch input passes through a 2-stage D flip-flop synchronizer (`sync_ff1` and `sync_ff2`), eliminating metastability.
3. **Single Driver for Word Space Counter**:
   - In `tb_morse.vhd`, `space_count` was initially modified by multiple processes. This was resolved by designating a single synchronous monitor process driving `space_count`, with `space_count_reset` strobe for test isolation.

---

## 5. Assumptions

1. [ASSUMPTION-01] Master clock frequency is sufficiently high relative to key events ($f_{clk} \ge 100 \text{ Hz}$ in hardware demo, 100 MHz in testbench).
2. [ASSUMPTION-02] Active key input is logic '1' (high when pressed, low when released).
3. [ASSUMPTION-03] Output `char_onehot` bus is 36 bits wide: indices 0 to 25 map to 'A' through 'Z', and indices 26 to 35 map to '0' through '9'.
4. [ASSUMPTION-04] If an unrecognized Morse sequence is received (such as unused 4-symbol codes `0011`, `0101`, `1110`, `1111`, unused 5-symbol codes, or length $\ge 6$), `err` is asserted on decode, and no character output line is pulsed.

---

## 6. Verification Tracking (100% Complete)
- [x] GHDL installation & compilation order.
- [x] Unit test pass: leaf components (`dff`, `jkff`, `tff`, `ic74138`, `ic7485`, `ic7490`).
- [x] Top testbench pass: 8 test suites in `tb_morse.vhd`.
- [x] Timing diagram generation: Edge headless VCD to PNG (`figures/*.png`).
- [x] Documentation artifacts complete (`docs/*.md`).
- [x] Makefile with targets (`all`, `compile`, `test`, `test-units`, `diagrams`, `wave`, `clean`).
- [x] ModelSim batch script (`run.do`) and compile order (`compile_order.txt`).
- [x] Zero open issues.

---

## 7. Execution & Verification Log

### Leaf Unit Testbenches Output:
```text
ghdl -a --std=93 src/dff.vhd src/jkff.vhd src/tff.vhd src/srlatch.vhd src/ic7490.vhd src/ic7404.vhd src/ic7408.vhd src/ic7432.vhd src/ic7483.vhd src/ic7485.vhd src/ic74138.vhd src/ic74151.vhd src/ic74153.vhd src/synchroniser.vhd src/edge_detector.vhd src/width_counter.vhd src/comparator_dash.vhd src/symbol_reg.vhd src/length_counter.vhd src/gap_counter.vhd src/fsm_comb.vhd src/morse_fsm.vhd src/word_space.vhd src/output_reg.vhd src/morse_decoder_74138.vhd src/morse_top.vhd src/morse_demo_wrapper.vhd tb/tb_dff.vhd tb/tb_jkff.vhd tb/tb_tff.vhd tb/tb_ic74138.vhd tb/tb_ic7485.vhd tb/tb_ic7490.vhd tb/tb_morse.vhd

ghdl -e --std=93 tb_dff
ghdl -r --std=93 tb_dff --assert-level=error
tb/tb_dff.vhd:64:9:@47ns:(report note): PASS: tb_dff all assertions succeeded

ghdl -e --std=93 tb_jkff
ghdl -r --std=93 tb_jkff --assert-level=error
tb/tb_jkff.vhd:73:9:@73ns:(report note): PASS: tb_jkff all assertions succeeded

ghdl -e --std=93 tb_tff
ghdl -r --std=93 tb_tff --assert-level=error
tb/tb_tff.vhd:62:9:@53ns:(report note): PASS: tb_tff all assertions succeeded

ghdl -e --std=93 tb_ic74138
ghdl -r --std=93 tb_ic74138 --assert-level=error
tb/tb_ic74138.vhd:77:9:@110ns:(report note): PASS: tb_ic74138 all datasheet truth table assertions succeeded

ghdl -e --std=93 tb_ic7485
ghdl -r --std=93 tb_ic7485 --assert-level=error
tb/tb_ic7485.vhd:74:9:@80ns:(report note): PASS: tb_ic7485 all datasheet comparison assertions succeeded

ghdl -e --std=93 tb_ic7490
ghdl -r --std=93 tb_ic7490 --assert-level=error
tb/tb_ic7490.vhd:62:9:@140ns:(report note): PASS: tb_ic7490 all decade counter and reset assertions succeeded
```

### Top-Level System Testbench (`tb_morse.vhd`) Output:
```text
ghdl -e --std=93 tb_morse
ghdl -r --std=93 tb_morse --assert-level=error --vcd=morse.vcd
tb/tb_morse.vhd:150:9:@0ms:(report note): ==========================================================
tb/tb_morse.vhd:151:9:@0ms:(report note): STARTING FULL DIGITAL MORSE DECODER TEST SUITE
tb/tb_morse.vhd:152:9:@0ms:(report note): ==========================================================
tb/tb_morse.vhd:164:9:@95ns:(report note): TEST 7a: Power-up state verification...
tb/tb_morse.vhd:169:9:@495ns:(report note): PASS: Test 7a (Power-up safety)
tb/tb_morse.vhd:174:9:@495ns:(report note): TEST 1: Verifying all 36 Morse characters...
tb/tb_morse.vhd:284:9:@21135ns:(report note): PASS: Test 1 (All 36 characters successfully decoded)
tb/tb_morse.vhd:289:9:@21135ns:(report note): TEST 2: Running Boundary Tests...
tb/tb_morse.vhd:313:9:@22485ns:(report note): PASS: Test 2 (All boundary conditions verified)
tb/tb_morse.vhd:318:9:@22485ns:(report note): TEST 3: Running SOS and 'SOS SOS' verification...
tb/tb_morse.vhd:341:9:@25495ns:(report note): PASS: Test 3 (SOS and 'SOS SOS' successful, exactly 1 space)
tb/tb_morse.vhd:346:9:@25495ns:(report note): TEST 4: Nominal keying tests (A, 5, 0, E, T, H, I)...
tb/tb_morse.vhd:354:9:@28635ns:(report note): PASS: Test 4 (Nominal keying sequence passed)
tb/tb_morse.vhd:359:9:@28635ns:(report note): TEST 5: Error detection tests...
tb/tb_morse.vhd:382:9:@33455ns:(report note): PASS: Test 5 (Error detection passed)
tb/tb_morse.vhd:387:9:@33455ns:(report note): TEST 6: Wrap-around immunity tests...
tb/tb_morse.vhd:400:9:@35865ns:(report note): PASS: Test 6 (Wrap-around immunity passed)
tb/tb_morse.vhd:405:9:@35865ns:(report note): TEST 7b: Display hold persistence verification...
tb/tb_morse.vhd:421:9:@36935ns:(report note): PASS: Test 7b (Display persistence holds until next decode)
tb/tb_morse.vhd:426:9:@36935ns:(report note): TEST 8: Logging FSM state transitions for SOS...
tb/tb_morse.vhd:427:9:@36935ns:(report note): FSM State Encoding: 00=IDLE, 01=MEASURE, 11=GAP, 10=DECODE
tb/tb_morse.vhd:430:9:@36935ns:(report note): Current FSM State: IDLE (00)
tb/tb_morse.vhd:433:9:@36935ns:(report note): [SOS Test] Keying S (dot-dot-dot)...
tb/tb_morse.vhd:436:9:@36955ns:(report note):   -> Transition to MEASURE (01) on PRESS
tb/tb_morse.vhd:438:9:@36995ns:(report note):   -> Transition to GAP (11) on RELEASE (dot 1 stored)
tb/tb_morse.vhd:443:9:@37035ns:(report note):   -> Transition to MEASURE (01) on PRESS
tb/tb_morse.vhd:445:9:@37075ns:(report note):   -> Transition to GAP (11) on RELEASE (dot 2 stored)
tb/tb_morse.vhd:450:9:@37115ns:(report note):   -> Transition to MEASURE (01) on PRESS
tb/tb_morse.vhd:452:9:@37155ns:(report note):   -> Transition to GAP (11) on RELEASE (dot 3 stored)
tb/tb_morse.vhd:456:9:@37215ns:(report note):   -> Letter gap >= 2T reached: LETTER_END fires
tb/tb_morse.vhd:458:9:@37235ns:(report note):   -> Transition to DECODE (10): Letter 'S' latched
tb/tb_morse.vhd:460:9:@37255ns:(report note):   -> Transition to IDLE (00): Registers cleared, holding display
tb/tb_morse.vhd:465:9:@37315ns:(report note): [SOS Test] Keying O (dash-dash-dash)...
tb/tb_morse.vhd:468:9:@37335ns:(report note):   -> Transition to MEASURE (01) on PRESS
tb/tb_morse.vhd:470:9:@37455ns:(report note):   -> Transition to GAP (11) on RELEASE (dash 1 stored)
tb/tb_morse.vhd:475:9:@37495ns:(report note):   -> Transition to MEASURE (01) on PRESS
tb/tb_morse.vhd:477:9:@37615ns:(report note):   -> Transition to GAP (11) on RELEASE (dash 2 stored)
tb/tb_morse.vhd:482:9:@37655ns:(report note):   -> Transition to MEASURE (01) on PRESS
tb/tb_morse.vhd:484:9:@37775ns:(report note):   -> Transition to GAP (11) on RELEASE (dash 3 stored)
tb/tb_morse.vhd:488:9:@37835ns:(report note):   -> Letter gap >= 2T reached: LETTER_END fires
tb/tb_morse.vhd:490:9:@37855ns:(report note):   -> Transition to DECODE (10): Letter 'O' latched
tb/tb_morse.vhd:492:9:@37875ns:(report note):   -> Transition to IDLE (00): Registers cleared, holding display
tb/tb_morse.vhd:497:9:@37935ns:(report note): [SOS Test] Keying S (dot-dot-dot)...
tb/tb_morse.vhd:500:9:@38315ns:(report note):   -> FSM state sequence for SOS completed successfully
tb/tb_morse.vhd:502:9:@38315ns:(report note): PASS: Test 8 (FSM state logging complete)
tb/tb_morse.vhd:507:9:@38315ns:(report note): ==========================================================
tb/tb_morse.vhd:508:9:@38315ns:(report note): ALL TEST SUITES PASSED PERFECTLY (8 OF 8 TESTS SUCCEEDED)
tb/tb_morse.vhd:509:9:@38315ns:(report note): ==========================================================
```
