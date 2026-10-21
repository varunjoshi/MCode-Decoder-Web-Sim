# MDIT221 Syllabus Audit & Compliance Checklist

This document details the compliance audit of the **Digital Morse Decoder** design against the **MDIT221 Digital Logic Design** syllabus specifications (Units IV & V).

---

## 1. Permitted Primitives Audit

The syllabus specifies a restricted set of primitive building blocks. The table below lists each permitted primitive, its syllabus reference, and its verification status within the codebase:

| Allowed Primitive Category | Permitted Components | Used in Project? | Implementation Files | Status |
| :--- | :--- | :---: | :--- | :---: |
| **Basic Gates** | AND, OR, NOT, NAND, NOR, XOR | Yes | Gate-level VHDL and standard logic operators in `ic7404.vhd`, `ic7408.vhd`, `ic7432.vhd`, `fsm_comb.vhd` | **VERIFIED** |
| **Latches & Flip-Flops** | S-R latch, Edge-triggered D, J-K, T flip-flops | Yes | `src/srlatch.vhd`, `src/dff.vhd`, `src/jkff.vhd`, `src/tff.vhd` (Unit IV Behavioral) | **VERIFIED** |
| **MSI Decade Counter** | IC 7490 (MOD-N / BCD Decade Counter) | Yes | `src/ic7490.vhd` (Used in `width_counter.vhd`, `gap_counter.vhd`) | **VERIFIED** |
| **MSI Comparator** | IC 7485 (4-bit Magnitude Comparator) | Yes | `src/ic7485.vhd` (Used in `comparator_dash.vhd`, `gap_counter.vhd`, `word_space.vhd`) | **VERIFIED** |
| **MSI Binary Adder** | IC 7483 (4-bit Binary Full Adder) | Yes | `src/ic7483.vhd` (Unit V Dataflow) | **VERIFIED** |
| **MSI Multiplexers** | IC 74151 (8:1 MUX), IC 74153 (Dual 4:1 MUX) | Yes | `src/ic74151.vhd`, `src/ic74153.vhd` (Unit V Dataflow) | **VERIFIED** |
| **MSI Decoder** | IC 74138 (3-to-8 Line Decoder / Demux) | Yes | `src/ic74138.vhd` (Used in `morse_decoder_74138.vhd` to decode 36 characters) | **VERIFIED** |
| **SSI Gate ICs** | IC 7404 (Hex NOT), IC 7408 (Quad AND), IC 7432 (Quad OR) | Yes | `src/ic7404.vhd`, `src/ic7408.vhd`, `src/ic7432.vhd` | **VERIFIED** |

---

## 2. Forbidden Primitives & Anti-Pattern Check

The prompt sets strict negative constraints. The table below lists all forbidden components and verifies their total absence from the implementation:

| Forbidden Component / Pattern | Permitted in MDIT221? | Present in Codebase? | Verification Evidence | Compliance |
| :--- | :---: | :---: | :--- | :---: |
| **IC 7474 (Dual D Flip-Flop)** | No | **NO** | Replaced with primitive `dff.vhd` (Unit IV Behavioral) | **PASS** |
| **IC 7475 (4-bit Bistable Latch)** | No | **NO** | No 7475 used. Latches use `srlatch.vhd` | **PASS** |
| **IC 74161 (4-bit Synchronous Binary Counter)** | No | **NO** | Ripple counters constructed strictly with `tff` and `ic7490` | **PASS** |
| **IC 74164 (8-bit Serial-In Parallel-Out Shift Reg)** | No | **NO** | Shift register built using cascaded `jkff` cells in `symbol_reg.vhd` | **PASS** |
| **IC 74175 (Quad D Flip-Flop)** | No | **NO** | Storage registers built using discrete `dff` arrays | **PASS** |
| **IC 74194 (4-bit Universal Shift Register)** | No | **NO** | No 74194 used. Only `jkff` shift cells used | **PASS** |
| **IC 74139 (Dual 2-to-4 Decoder)** | No | **NO** | All decoding handled by 3-to-8 decoder `ic74138` | **PASS** |
| **IC 74154 (4-to-16 Line Decoder)** | No | **NO** | High-order decoding partitioned into 74138 decoders | **PASS** |
| **NE555 Timer IC** | No | **NO** | All timing is digital clock division using `ic7490` and `tff` | **PASS** |
| **Verilog / SystemVerilog Code** | No | **NO** | 100% written in pure VHDL-93 | **PASS** |
| **ROM / Block RAM / Distributed LUT** | No | **NO** | Zero memory arrays or ROM tables in logic path | **PASS** |
| **Microcontroller / Soft CPU Core** | No | **NO** | Fully hardwired digital logic; no instruction sequencer | **PASS** |
| **Behavioral FSM / `case` Character Table** | No | **NO** | State machine uses explicit Gray state flip-flops (`morse_fsm.vhd`) and SOP combinational gate logic (`fsm_comb.vhd`). 36-char decoder uses 6x `ic74138` + 74xx gates | **PASS** |

---

## 3. Standard & Synthesis Audit

- **Language Standard:** IEEE VHDL 1076-1993 (VHDL-93).
- **Libraries Used:** Exclusively `ieee.std_logic_1164.all`.
- **Logic Datatypes:** `std_logic` and `std_logic_vector` only in all design entities. Zero `integer` types or `numeric_std` arithmetic in synthesis logic paths.
- **Clock Disciplines:** Single synchronous clock domain `clk` with active-low asynchronous system reset `clr_n`.
- **Metastability Protection:** 2-stage synchroniser on external asynchronous `morse_in` input.
- **Race Condition Prevention:** Synchronous register clearing upon entry to `DECODE` state ensures data is latched by `output_reg` before registers are cleared.
