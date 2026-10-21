# Finite State Machine (FSM) Design & Gray-Code Derivation

This document details the architectural design, formal state transition tables, Gray-code excitation tables, Karnaugh maps, and control signal derivations for the **Digital Morse Decoder** controller ([`src/morse_fsm.vhd`](file:///d:/DL/src/morse_fsm.vhd) and [`src/fsm_comb.vhd`](file:///d:/DL/src/fsm_comb.vhd)).

---

## 1. State Definitions & Gray Encoding

The controller oversees the reception and decoding lifecycle of each Morse character through four primary states:

| State Name | Gray Code $(Q_1 Q_0)$ | Description | Moore Output Active |
| :--- | :---: | :--- | :--- |
| **`IDLE`** | `00` | Quiescent state awaiting key depression. Display registers hold previous character. | None |
| **`MEASURE`** | `01` | Key is depressed (`morse_sync = '1'`). `width_counter` measures pulse duration. | `in_measure = '1'` |
| **`GAP`** | `11` | Key is released (`morse_sync = '0'`). `gap_counter` measures inter-element silence. | `in_gap = '1'` |
| **`DECODE`** | `10` | Letter end condition satisfied (`gap >= 2T`). Outputs latched; counters clear. | `decode_strobe = '1'`, `clear_regs = '1'` |

### Justification for Gray Encoding
In standard binary encoding, transitions such as `01` $\to$ `10` require two state bits to switch simultaneously. If $Q_1$ switches before $Q_0$, the machine temporarily passes through `11` (or `00` if $Q_0$ switches first), creating transient combinational glitches and false strobe firings.

Under Gray encoding:
- `IDLE` (`00`) $\to$ `MEASURE` (`01`): **Only $Q_0$ toggles.**
- `MEASURE` (`01`) $\to$ `GAP` (`11`): **Only $Q_1$ toggles.**
- `GAP` (`11`) $\to$ `MEASURE` (`01`): **Only $Q_1$ toggles** (for next symbol in same character).
- `GAP` (`11`) $\to$ `DECODE` (`10`): **Only $Q_0$ toggles** (on `letter_end`).
- `DECODE` (`10`) $\to$ `IDLE` (`00`): **Only $Q_1$ toggles.**

Every adjacent operational transition has a Hamming distance of exactly $1$. This eliminates dynamic hazards and ensures glitch-free control strobe generation.

---

## 2. Complete State Transition Table

The inputs to the FSM combinational logic are:
- `press`: Single-cycle active-high pulse generated on key press (rising edge).
- `release`: Single-cycle active-high pulse generated on key release (falling edge).
- `letter_end`: Level signal asserted when `gap_counter` reaches threshold $\ge 7$ clock ticks ($2T - 1$).

| Current State | $Q_1$ | $Q_0$ | `press` | `release` | `letter_end` | Next State | $D_1$ | $D_0$ | Operational Event |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| `IDLE` | 0 | 0 | 0 | X | X | `IDLE` | 0 | 0 | Awaiting key press |
| `IDLE` | 0 | 0 | 1 | X | X | `MEASURE` | 0 | 1 | Key depressed; start width timer |
| `MEASURE` | 0 | 1 | X | 0 | X | `MEASURE` | 0 | 1 | Pulse continues; counting width |
| `MEASURE` | 0 | 1 | X | 1 | X | `GAP` | 1 | 1 | Key released; shift symbol into reg |
| `GAP` | 1 | 1 | 1 | X | X | `MEASURE` | 0 | 1 | Next dot/dash started |
| `GAP` | 1 | 1 | 0 | X | 0 | `GAP` | 1 | 1 | Silence continues; counting gap |
| `GAP` | 1 | 1 | 0 | X | 1 | `DECODE` | 1 | 0 | Inter-letter gap reached ($2T$) |
| `DECODE` | 1 | 0 | X | X | X | `IDLE` | 0 | 0 | 1-cycle decode strobe; return to IDLE |

---

## 3. Excitation Karnaugh Maps & Next-State Equations

### 3.1 Next-State $D_1$ Derivation

$D_1$ must be `'1'` when transitioning into `GAP` (`11`) or into `DECODE` (`10`).
Looking at the transition conditions:
1. From `MEASURE` (`01`): $D_1 = 1$ when `release = '1'`.
   $$\text{Term 1} = \overline{Q_1} \cdot Q_0 \cdot \text{release}$$
2. From `GAP` (`11`): $D_1 = 1$ when `press = '0'` (whether holding in `GAP` or advancing to `DECODE`).
   $$\text{Term 2} = Q_1 \cdot Q_0 \cdot \overline{\text{press}}$$
3. From `DECODE` (`10`): $D_1 = 0$ unconditionally (always returns to `IDLE` `00`).
4. From `IDLE` (`00`): $D_1 = 0$ unconditionally.

Combining into minimal Sum-of-Products (SOP):
$$D_1 = (\overline{Q_1} \cdot Q_0 \cdot \text{release}) \lor (Q_1 \cdot Q_0 \cdot \overline{\text{press}})$$

---

### 3.2 Next-State $D_0$ Derivation

$D_0$ must be `'1'` when in or transitioning into `MEASURE` (`01`) or `GAP` (`11`).
1. From `IDLE` (`00`): $D_0 = 1$ when `press = '1'`.
   $$\text{Term 1} = \overline{Q_1} \cdot \overline{Q_0} \cdot \text{press}$$
2. From `MEASURE` (`01`): $D_0 = 1$ unconditionally (whether holding in `MEASURE` or advancing to `GAP`).
   $$\text{Term 2} = \overline{Q_1} \cdot Q_0$$
3. From `GAP` (`11`): $D_0 = 1$ if key pressed again (`press = '1'`) OR gap is not yet over ($\overline{\text{letter\_end}}$).
   $$\text{Term 3} = Q_1 \cdot Q_0 \cdot (\text{press} \lor \overline{\text{letter\_end}})$$
4. From `DECODE` (`10`): $D_0 = 0$ unconditionally.

Combining into minimal Sum-of-Products (SOP):
$$D_0 = (\overline{Q_1} \cdot \overline{Q_0} \cdot \text{press}) \lor (\overline{Q_1} \cdot Q_0) \lor (Q_1 \cdot Q_0 \cdot (\text{press} \lor \overline{\text{letter\_end}}))$$

---

## 4. Control Strobes & Output Equations

The FSM generates both Moore outputs (dependent only on state) and Mealy outputs (dependent on state and inputs):

### Moore Outputs
- **`in_measure`** (enables width counter counting):
  $$\text{in\_measure} = \overline{Q_1} \cdot Q_0$$
- **`in_gap`** (enables gap counter counting):
  $$\text{in\_gap} = Q_1 \cdot Q_0$$
- **`decode_strobe`** (clocks output character register):
  $$\text{decode\_strobe} = Q_1 \cdot \overline{Q_0}$$
- **`clear_regs`** (synchronously resets symbol register and length counter):
  $$\text{clear\_regs} = Q_1 \cdot \overline{Q_0}$$

### Mealy Outputs
- **`shift_en`** (clocks classified symbol into `symbol_reg` exactly once on key release):
  $$\text{shift\_en} = \overline{Q_1} \cdot Q_0 \cdot \text{release}$$

---

## 5. Timing Diagram & Verification

```
Clock       :  __--__--__--__--__--__--__--__--__--__--__--__--__--__--__--__--__
morse_in    :  ____/-------------\________________________/-------------\_______
FSM State   :  IDLE  |  MEASURE   |       GAP       |DEC | IDLE |  MEASURE   | ...
Gray (Q1 Q0):   00   |     01     |        11       | 10 |  00  |     01     | ...
press_pulse :  ______/--\___________________________________/--\________________
release_pulse: _________________/--\____________________________________________
shift_en    :  _________________/--\____________________________________________
letter_end  :  _________________________________/------\________________________
decode_strobe: _______________________________________/--\______________________
char_onehot :  =======================================<     LATCHED CHAR     >==
```

All state transitions and timings are visually verified in the generated diagrams:
- Architecture Diagram: `figures/architecture_diagram.png`
- State Transition Diagram: `figures/fsm_state_diagram.png`
- Waveform Timing Diagrams: `figures/timing_letter_a.png` and `figures/timing_sos.png`
