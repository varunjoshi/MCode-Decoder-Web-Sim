# Makefile for Digital Morse Decoder (MDIT221 Units IV and V)
GHDL ?= ghdl
NODE ?= node
VHDL_STD = --std=93

# VHDL Source Files in strict dependency order
SRCS = \
	src/dff.vhd \
	src/jkff.vhd \
	src/tff.vhd \
	src/srlatch.vhd \
	src/ic7490.vhd \
	src/ic7404.vhd \
	src/ic7408.vhd \
	src/ic7432.vhd \
	src/ic7483.vhd \
	src/ic7485.vhd \
	src/ic74138.vhd \
	src/ic74151.vhd \
	src/ic74153.vhd \
	src/synchroniser.vhd \
	src/edge_detector.vhd \
	src/width_counter.vhd \
	src/comparator_dash.vhd \
	src/symbol_reg.vhd \
	src/length_counter.vhd \
	src/gap_counter.vhd \
	src/fsm_comb.vhd \
	src/morse_fsm.vhd \
	src/word_space.vhd \
	src/output_reg.vhd \
	src/morse_decoder_74138.vhd \
	src/morse_top.vhd \
	src/morse_demo_wrapper.vhd

TBS = \
	tb/tb_dff.vhd \
	tb/tb_jkff.vhd \
	tb/tb_tff.vhd \
	tb/tb_ic74138.vhd \
	tb/tb_ic7485.vhd \
	tb/tb_ic7490.vhd \
	tb/tb_morse.vhd

.PHONY: all compile test test-units wave diagrams clean help

all: test diagrams

compile:
	$(GHDL) -a $(VHDL_STD) $(SRCS) $(TBS)

test: compile
	$(GHDL) -e $(VHDL_STD) tb_morse
	$(GHDL) -r $(VHDL_STD) tb_morse --assert-level=error --vcd=morse.vcd

test-units: compile
	$(GHDL) -e $(VHDL_STD) tb_dff
	$(GHDL) -r $(VHDL_STD) tb_dff --assert-level=error
	$(GHDL) -e $(VHDL_STD) tb_jkff
	$(GHDL) -r $(VHDL_STD) tb_jkff --assert-level=error
	$(GHDL) -e $(VHDL_STD) tb_tff
	$(GHDL) -r $(VHDL_STD) tb_tff --assert-level=error
	$(GHDL) -e $(VHDL_STD) tb_ic74138
	$(GHDL) -r $(VHDL_STD) tb_ic74138 --assert-level=error
	$(GHDL) -e $(VHDL_STD) tb_ic7485
	$(GHDL) -r $(VHDL_STD) tb_ic7485 --assert-level=error
	$(GHDL) -e $(VHDL_STD) tb_ic7490
	$(GHDL) -r $(VHDL_STD) tb_ic7490 --assert-level=error

diagrams:
	$(NODE) scripts/generate_diagrams.cjs

wave:
	@echo "Checking for GTKWave..."
	@gtkwave morse.vcd || echo "GTKWave not found on PATH. Install GTKWave or open morse.vcd manually."

clean:
	-$(GHDL) --clean
	-rm -f work-obj93.cf *.o tb_morse tb_dff tb_jkff tb_tff tb_ic74138 tb_ic7485 tb_ic7490
