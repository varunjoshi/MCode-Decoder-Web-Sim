# ModelSim / QuestaSim Automation Script
# Digital Morse Decoder (MDIT221 Units IV and V)

# Create and map local working library
vlib work
vmap work work

# Compile Behavioral Models (Unit IV)
vcom -93 -work work src/dff.vhd
vcom -93 -work work src/jkff.vhd
vcom -93 -work work src/tff.vhd
vcom -93 -work work src/srlatch.vhd
vcom -93 -work work src/ic7490.vhd

# Compile Dataflow Models (Unit V)
vcom -93 -work work src/ic7404.vhd
vcom -93 -work work src/ic7408.vhd
vcom -93 -work work src/ic7432.vhd
vcom -93 -work work src/ic7483.vhd
vcom -93 -work work src/ic7485.vhd
vcom -93 -work work src/ic74138.vhd
vcom -93 -work work src/ic74151.vhd
vcom -93 -work work src/ic74153.vhd

# Compile Structural Subsystems (Unit V)
vcom -93 -work work src/synchroniser.vhd
vcom -93 -work work src/edge_detector.vhd
vcom -93 -work work src/width_counter.vhd
vcom -93 -work work src/comparator_dash.vhd
vcom -93 -work work src/symbol_reg.vhd
vcom -93 -work work src/length_counter.vhd
vcom -93 -work work src/gap_counter.vhd
vcom -93 -work work src/fsm_comb.vhd
vcom -93 -work work src/morse_fsm.vhd
vcom -93 -work work src/word_space.vhd
vcom -93 -work work src/output_reg.vhd
vcom -93 -work work src/morse_decoder_74138.vhd

# Compile Top-Level Architectures
vcom -93 -work work src/morse_top.vhd
vcom -93 -work work src/morse_demo_wrapper.vhd

# Compile Testbenches
vcom -93 -work work tb/tb_dff.vhd
vcom -93 -work work tb/tb_jkff.vhd
vcom -93 -work work tb/tb_tff.vhd
vcom -93 -work work tb/tb_ic74138.vhd
vcom -93 -work work tb/tb_ic7485.vhd
vcom -93 -work work tb/tb_ic7490.vhd
vcom -93 -work work tb/tb_morse.vhd

# Elaborate and simulate top testbench
vsim -c -t 1ns -assertdebug work.tb_morse

# Add wave signals for visual debugging if GUI is active
add wave -position insertpoint sim:/tb_morse/*
add wave -position insertpoint sim:/tb_morse/dut/*

# Run full test suite
run -all

# Exit if running in command-line mode
quit -f
