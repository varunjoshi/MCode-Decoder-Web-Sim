# Karnaugh Maps & Minimal Boolean Derivation for Morse Matrix Decoding

This document presents the formal Boolean derivation, Karnaugh maps (K-maps), and don't-care condition analysis for representative characters in the **Digital Morse Decoder**:
- **Character 'B'** (`- . . .`)
- **Character 'Z'** (`- - . .`)
- **Character 'Q'** (`- - . -`)
- **Digit '5'** (`. . . . .`)

---

## 1. Coordinate System & Shift Register Architecture

In the hardware implementation ([`src/symbol_reg.vhd`](file:///d:/DL/src/symbol_reg.vhd)), incoming dots and dashes are shifted into a 5-bit SIPO shift register on each symbol release:
- **Dot** = `'0'`
- **Dash** = `'1'`

Because new symbols enter at stage 0 ($Q_0$) and shift toward stage 4 ($Q_4$):
- **1st symbol received** ends up at $Q_{n-1}$ (for a character of length $n$).
- **Last symbol received** remains at $Q_0$.
- Symbols beyond length $n$ (i.e. stages $Q_n \dots Q_4$) retain whatever was in the shift register or initialized value, making them **Don't Cares ($X$)** for length $n$.

The character length $n \in \{1, 2, 3, 4, 5\}$ is simultaneously tracked by the 3-bit binary counter ([`src/length_counter.vhd`](file:///d:/DL/src/length_counter.vhd)), represented by $L = (L_2, L_1, L_0)_2$.

A complete decoder space is partitioned hierarchically by length enable signals derived from a 3-to-8 decoder ([`src/ic74138.vhd`](file:///d:/DL/src/ic74138.vhd)):
- $L = 4 \implies (L_2, L_1, L_0) = (1, 0, 0) \implies \overline{L_4} = '0'$
- $L = 5 \implies (L_2, L_1, L_0) = (1, 0, 1) \implies \overline{L_5} = '0'$

---

## 2. Derivation for Characters of Length $n=4$ (B, Z, Q)

For all 4-symbol characters, the length condition is strictly $L = 4$ ($L_4 = 1, \overline{L_4} = 0$). Stage $Q_4$ is a **Don't Care ($X$)** because only 4 symbols were shifted.

The 4 active bits are $Q_3, Q_2, Q_1, Q_0$. We define the 4-variable K-map over $(Q_3 Q_2)$ on the rows and $(Q_1 Q_0)$ on the columns:

```
                Q1 Q0
  Q3 Q2   00    01    11    10
       +-----+-----+-----+-----+
    00 |  0  |  1  |  3  |  2  |
       +-----+-----+-----+-----+
    01 |  4  |  5  |  7  |  6  |
       +-----+-----+-----+-----+
    11 | 12  | 13  | 15  | 14  |
       +-----+-----+-----+-----+
    10 |  8  |  9  | 11  | 10  |
       +-----+-----+-----+-----+
```

### 2.1 Character 'B' (`- . . .`)

- **Transmission Sequence:**
  1. 1st symbol = Dash (`1`) $\to$ shifts to $Q_3$
  2. 2nd symbol = Dot (`0`) $\to$ shifts to $Q_2$
  3. 3rd symbol = Dot (`0`) $\to$ shifts to $Q_1$
  4. 4th symbol = Dot (`0`) $\to$ stays at $Q_0$
- **State Vector:** $(Q_3, Q_2, Q_1, Q_0) = (1, 0, 0, 0)_2 = 8_{10}$.
- **Karnaugh Map for 'B' (given $L=4$):**

```
                Q1 Q0
  Q3 Q2   00    01    11    10
       +-----+-----+-----+-----+
    00 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    01 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    11 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    10 |  1  |  0  |  0  |  0  |   <-- cell 8 is '1'
       +-----+-----+-----+-----+
```

- **Minimal SOP Expression:**
  $$\text{B} = L_4 \cdot Q_3 \cdot \overline{Q_2} \cdot \overline{Q_1} \cdot \overline{Q_0}$$
- **74xx Hardware Mapping:**
  In [`src/morse_decoder_74138.vhd`](file:///d:/DL/src/morse_decoder_74138.vhd), the upper 74138 (`u_qhi_dec`) has:
  $$G_1 = Q_3, \quad C = Q_2, \quad B = Q_1, \quad A = Q_0$$
  When $Q_3=1$ and $CBA = 000_2$, output $\overline{Y_0}$ goes low, giving $q\_dec(8) = 1$.
  Thus:
  $$\text{char\_active}(1) = q\_dec(8) \text{ and } (\text{not } l4\_n)$$
  which implements the exact minimal term with zero redundant gate delays.

---

### 2.2 Character 'Z' (`- - . .`)

- **Transmission Sequence:**
  1. 1st symbol = Dash (`1`) $\to$ shifts to $Q_3$
  2. 2nd symbol = Dash (`1`) $\to$ shifts to $Q_2$
  3. 3rd symbol = Dot (`0`) $\to$ shifts to $Q_1$
  4. 4th symbol = Dot (`0`) $\to$ stays at $Q_0$
- **State Vector:** $(Q_3, Q_2, Q_1, Q_0) = (1, 1, 0, 0)_2 = 12_{10}$.
- **Karnaugh Map for 'Z' (given $L=4$):**

```
                Q1 Q0
  Q3 Q2   00    01    11    10
       +-----+-----+-----+-----+
    00 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    01 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    11 |  1  |  0  |  0  |  0  |   <-- cell 12 is '1'
       +-----+-----+-----+-----+
    10 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
```

- **Minimal SOP Expression:**
  $$\text{Z} = L_4 \cdot Q_3 \cdot Q_2 \cdot \overline{Q_1} \cdot \overline{Q_0}$$
- **74xx Hardware Mapping:**
  In `u_qhi_dec`, $Q_3=1$ and $CBA = 100_2 = 4$, selecting output $\overline{Y_4}$, which generates $q\_dec(12) = 1$.
  Thus:
  $$\text{char\_active}(25) = q\_dec(12) \text{ and } (\text{not } l4\_n)$$

---

### 2.3 Character 'Q' (`- - . -`)

- **Transmission Sequence:**
  1. 1st symbol = Dash (`1`) $\to$ shifts to $Q_3$
  2. 2nd symbol = Dash (`1`) $\to$ shifts to $Q_2$
  3. 3rd symbol = Dot (`0`) $\to$ shifts to $Q_1$
  4. 4th symbol = Dash (`1`) $\to$ stays at $Q_0$
- **State Vector:** $(Q_3, Q_2, Q_1, Q_0) = (1, 1, 0, 1)_2 = 13_{10}$.
- **Karnaugh Map for 'Q' (given $L=4$):**

```
                Q1 Q0
  Q3 Q2   00    01    11    10
       +-----+-----+-----+-----+
    00 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    01 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    11 |  0  |  1  |  0  |  0  |   <-- cell 13 is '1'
       +-----+-----+-----+-----+
    10 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
```

- **Minimal SOP Expression:**
  $$\text{Q} = L_4 \cdot Q_3 \cdot Q_2 \cdot \overline{Q_1} \cdot Q_0$$
- **74xx Hardware Mapping:**
  In `u_qhi_dec`, $Q_3=1$ and $CBA = 101_2 = 5$, selecting output $\overline{Y_5}$, which generates $q\_dec(13) = 1$.
  Thus:
  $$\text{char\_active}(16) = q\_dec(13) \text{ and } (\text{not } l4\_n)$$

---

## 3. Derivation for Digit '5' (`. . . . .`) ($n=5$)

For 5-symbol characters, the length condition is $L = 5$ ($L_5 = 1, \overline{L_5} = 0$). All 5 flip-flop stages $(Q_4, Q_3, Q_2, Q_1, Q_0)$ contain valid transmitted symbols.

- **Transmission Sequence:**
  1. 1st symbol = Dot (`0`) $\to Q_4$
  2. 2nd symbol = Dot (`0`) $\to Q_3$
  3. 3rd symbol = Dot (`0`) $\to Q_2$
  4. 4th symbol = Dot (`0`) $\to Q_1$
  5. 5th symbol = Dot (`0`) $\to Q_0$
- **State Vector:** $(Q_4, Q_3, Q_2, Q_1, Q_0) = (0, 0, 0, 0, 0)_2 = 0_{10}$.

### 3.1 5-Variable K-Map Structure ($L=5$)

We split into two 4-variable sub-maps across $Q_4$:

#### Sub-map $Q_4 = 0$:
```
                Q1 Q0
  Q3 Q2   00    01    11    10
       +-----+-----+-----+-----+
    00 |  1  |  0  |  0  |  0  |   <-- cell 0 ('5') is '1'
       +-----+-----+-----+-----+
    01 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    11 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    10 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
```

#### Sub-map $Q_4 = 1$:
```
                Q1 Q0
  Q3 Q2   00    01    11    10
       +-----+-----+-----+-----+
    00 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    01 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    11 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
    10 |  0  |  0  |  0  |  0  |
       +-----+-----+-----+-----+
```

- **Minimal SOP Expression:**
  $$\text{'5'} = L_5 \cdot \overline{Q_4} \cdot \overline{Q_3} \cdot \overline{Q_2} \cdot \overline{Q_1} \cdot \overline{Q_0}$$
- **74xx Hardware Mapping:**
  The lower 74138 (`u_qlo_dec`) decodes $(Q_3, Q_2, Q_1, Q_0) = 0000_2$ to generate $q\_dec(0) = 1$.
  Qualifying with $Q_4 = 0$ via inverter $q4\_n$ and length enable $l5\_n$:
  $$\text{char\_active}(31) = q\_dec(0) \text{ and } q4\_n \text{ and } (\text{not } l5\_n)$$

---

## 4. Don't-Care Space & False Code Immunity

The complete input space comprises $2^3 \times 2^5 = 256$ possible combinations of $(L, Q)$.
The 36 ITU-R Morse characters occupy exactly 36 valid states:
- Length 1: 2 characters (E, T)
- Length 2: 4 characters (I, A, N, M)
- Length 3: 8 characters (S, U, R, W, D, K, G, O)
- Length 4: 12 characters (B, C, F, H, J, L, P, Q, V, X, Y, Z)
- Length 5: 10 digits (0 through 9)

The remaining $256 - 36 = 220$ combinations represent **Don't-Care ($X$)** conditions or invalid sequences:
1. **Invalid Lengths ($L=0, 6, 7$):** Suppressed by the length decoder (`u_len_dec`).
2. **Unused 4-symbol patterns:** 4 patterns ($16 - 12 = 4$) in the 4-symbol subspace are not letters in standard English Morse.
3. **Unused 5-symbol patterns:** 22 patterns ($32 - 10 = 22$) in the 5-symbol subspace are non-digit codes.

In [`src/morse_decoder_74138.vhd`](file:///d:/DL/src/morse_decoder_74138.vhd), the error detection logic collects all active character lines:
$$\text{any\_char} = \bigvee_{i=0}^{35} \text{char\_active}(i)$$
$$\text{err} = \text{overflow} \lor \overline{\text{any\_char}}$$

If an operator keys an invalid sequence (e.g. 4 dashes `----` or 6 dots), `any_char` remains `'0'` and `err` asserts `'1'`, ensuring absolute immunity against erroneous character recognition.
