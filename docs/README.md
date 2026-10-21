# Digital Morse Decoder: Complete Toolchain & Reproduction Guide

This guide provides end-to-end instructions for reproducing the simulation, synthesis, and hardware deployment of the **Digital Morse Decoder** across all major digital design toolchains: **GHDL**, **ModelSim / QuestaSim**, **Intel Quartus Prime**, and **AMD Xilinx Vivado**.

---

## 1. Quick Start with GHDL & Make (Command Line)

### Prerequisites
- **GHDL** (v0.37+ or v6.0.0+ mcode/LLVM)
- **GNU Make** (v4.0+)
- **GTKWave** (optional, for viewing waveform `morse.vcd`)
- **Node.js** (v16+, for diagram rendering)

### Execution
From the root directory:

```bash
# 1. Run all 8 system test suites in GHDL:
make test

# 2. Run all leaf-level unit testbenches (DFF, JKFF, TFF, 74138, 7485, 7490):
make test-units

# 3. Regenerate all slide-ready figures and waveform SVGs/PNGs:
make diagrams

# 4. View simulation waveforms in GTKWave:
make wave
```

---

## 2. ModelSim / QuestaSim Simulation

A pre-configured simulation macro script [`run.do`](file:///d:/DL/run.do) is provided in the repository root.

### GUI or Command-Line Execution
1. Open ModelSim or QuestaSim.
2. In the Transcript window, change directory to the project root:
   ```tcl
   cd d:/DL
   ```
3. Execute the batch simulation script:
   ```tcl
   do run.do
   ```
4. The script will automatically:
   - Create and refresh the `work` library.
   - Compile all 27 design entities and testbenches in strict dependency order (`compile_order.txt`).
   - Elaborate `tb_morse` with full signal visibility.
   - Format waveform window with hierarchical signal dividers (`Clocks & Resets`, `Inputs`, `Edge Detector`, `Timing Counters`, `FSM Controller`, `Shift & Length Registers`, `Outputs & Decoded Letters`).
   - Run simulation for 45 µs and verify all 8 test suites.

---

## 3. Intel Quartus Prime (Synthesis & FPGA Implementation)

Target Hardware: Intel Cyclone IV E (e.g. DE0-Nano, DE2-115) or MAX 10 (e.g. DE10-Lite).

### Step-by-Step Project Setup
1. **Create New Project:**
   - Launch Intel Quartus Prime (Lite or Standard Edition).
   - Click **File > New Project Wizard**.
   - Working directory: `<project_dir>`.
   - Project name: `morse_decoder`.
   - Top-level design entity: `morse_demo_wrapper`.
2. **Add Source Files:**
   - Go to **Project > Add/Remove Files in Project**.
   - Select all files in `src/` following the order listed in [`compile_order.txt`](file:///d:/DL/compile_order.txt).
   - Ensure VHDL version is set to **VHDL 1993** (**Assignments > Settings > Compiler Settings > VHDL Input > VHDL 1993**).
3. **Select Target Device:**
   - E.g. MAX 10 `10M50DAF484C7G` (DE10-Lite) or Cyclone IV `EP4CE22F17C6` (DE0-Nano).
4. **Timing Constraints (`morse.sdc`):**
   Create a Synopsys Design Constraints file:
   ```tcl
   create_clock -name clk -period 20.000 [get_ports {clk}]
   derive_pll_clocks
   derive_clock_uncertainty
   ```
5. **Compile Design:**
   - Click **Processing > Start Compilation** (`Ctrl+L`).
   - Verify zero errors and zero timing violations.
6. **Program FPGA:**
   - Connect USB-Blaster cable.
   - Open **Tools > Programmer** and flash `.sof` file to target board.

---

## 4. AMD Xilinx Vivado (Synthesis & Implementation)

Target Hardware: Xilinx Artix-7 (e.g. Digilent Basys 3 `xc7a35tcpg236-1` or Nexys A7).

### Step-by-Step Project Setup
1. **Create Vivado Project:**
   - Launch Vivado (2020.2 or later).
   - Click **Create Project**, name it `morse_decoder`, and select **RTL Project**.
   - Check **Do not specify sources at this time**.
   - Choose Part: `xc7a35tcpg236-1` (Basys 3) or your board.
2. **Import VHDL Sources:**
   - Click **Add Sources > Add or Create Design Sources**.
   - Click **Add Files** and select all `.vhd` files from `src/`.
   - In the hierarchy window, right-click `morse_demo_wrapper.vhd` and click **Set as Top**.
   - In **Source File Properties**, ensure **Type** is set to **VHDL**.
3. **Add Physical & Timing Constraints (`basys3.xdc`):**
   ```xdc
   ## Clock signal (100 MHz onboard oscillator)
   set_property PACKAGE_PIN W5 [get_ports clk]
   set_property IOSTANDARD LVCMOS33 [get_ports clk]
   create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports clk]

   ## Pushbuttons
   set_property PACKAGE_PIN U18 [get_ports morse_in]
   set_property IOSTANDARD LVCMOS33 [get_ports morse_in]

   set_property PACKAGE_PIN T18 [get_ports reset_n]
   set_property IOSTANDARD LVCMOS33 [get_ports reset_n]

   ## LEDs (Char valid, Space, Error)
   set_property PACKAGE_PIN U16 [get_ports char_valid]
   set_property IOSTANDARD LVCMOS33 [get_ports char_valid]

   set_property PACKAGE_PIN E19 [get_ports space_detected]
   set_property IOSTANDARD LVCMOS33 [get_ports space_detected]

   set_property PACKAGE_PIN U19 [get_ports err]
   set_property IOSTANDARD LVCMOS33 [get_ports err]
   ```
4. **Run Synthesis & Implementation:**
   - Click **Run Synthesis**.
   - Click **Run Implementation**.
   - Click **Generate Bitstream**.
   - Program via **Hardware Manager**.

---

## 5. Directory Structure & Verification Summary

```
d:\DL\
├── compile_order.txt         # Ordered list of VHDL-93 dependencies
├── Makefile                  # Automated build, test, and diagram generation
├── run.do                    # ModelSim / QuestaSim execution macro
├── index.html                # Interactive hardware simulation & timing visualizer
├── morse.vcd                 # GHDL VCD waveform output
├── src/                      # 27 Synthesizable VHDL-93 entities
│   ├── dff.vhd               # D Flip-Flop (Unit IV Behavioral)
│   ├── jkff.vhd              # J-K Flip-Flop (Unit IV Behavioral)
│   ├── tff.vhd               # T Flip-Flop (Unit IV Behavioral)
│   ├── srlatch.vhd           # S-R Latch (Unit IV Behavioral)
│   ├── ic7490.vhd            # 7490 Decade Counter (Unit IV Behavioral)
│   ├── ic7404.vhd            # Hex Inverter (Unit V Dataflow)
│   ├── ic7408.vhd            # Quad AND (Unit V Dataflow)
│   ├── ic7432.vhd            # Quad OR (Unit V Dataflow)
│   ├── ic7483.vhd            # 4-bit Full Adder (Unit V Dataflow)
│   ├── ic7485.vhd            # 4-bit Magnitude Comparator (Unit V Dataflow)
│   ├── ic74138.vhd           # 3-to-8 Decoder (Unit V Dataflow)
│   ├── ic74151.vhd           # 8:1 Multiplexer (Unit V Dataflow)
│   ├── ic74153.vhd           # Dual 4:1 Multiplexer (Unit V Dataflow)
│   ├── fsm_comb.vhd          # FSM Next-State Logic (Unit V Dataflow)
│   ├── synchroniser.vhd      # 2-Stage DFF Synchroniser (Unit V Structural)
│   ├── edge_detector.vhd     # Edge Detector (Unit V Structural)
│   ├── width_counter.vhd     # Pulse Width Counter (Unit V Structural)
│   ├── comparator_dash.vhd   # Dash Discriminator (Unit V Structural)
│   ├── symbol_reg.vhd        # 5-bit JKFF Symbol Register (Unit V Structural)
│   ├── length_counter.vhd    # 3-bit TFF Length Counter (Unit V Structural)
│   ├── gap_counter.vhd       # Inter-Element Gap Counter (Unit V Structural)
│   ├── morse_fsm.vhd         # Gray-Coded FSM Controller (Unit V Structural)
│   ├── word_space.vhd        # Word Space Detector (Unit V Structural)
│   ├── output_reg.vhd        # 36-bit Character Latch (Unit V Structural)
│   ├── morse_decoder_74138.vhd # 36-Char Decoder Matrix (Unit V Structural)
│   ├── morse_top.vhd         # Top-Level Integrated System (Unit V Structural)
│   └── morse_demo_wrapper.vhd# Board Integration Wrapper (Unit V Structural)
├── tb/                       # Full testbench suite
│   ├── tb_dff.vhd            # DFF unit test
│   ├── tb_jkff.vhd           # JKFF unit test
│   ├── tb_tff.vhd            # TFF unit test
│   ├── tb_ic74138.vhd        # 74138 unit test
│   ├── tb_ic7485.vhd         # 7485 unit test
│   ├── tb_ic7490.vhd         # 7490 unit test
│   └── tb_morse.vhd          # Comprehensive 8-suite system testbench
├── figures/                  # Slide-ready architecture and waveform diagrams
│   ├── architecture_diagram.png / .svg
│   ├── fsm_state_diagram.png / .svg
│   ├── timing_letter_a.png / .svg
│   └── timing_sos.png / .svg
└── docs/                     # Full technical documentation
    ├── README.md             # This file
    ├── coverage_map.md       # Syllabus mapping for all 27 entities
    ├── syllabus_check.md     # Audit verifying zero forbidden primitives
    ├── kmap.md               # Karnaugh maps for B, Z, Q, 5 and don't cares
    └── fsm.md                # Gray FSM excitation tables & equations
```
