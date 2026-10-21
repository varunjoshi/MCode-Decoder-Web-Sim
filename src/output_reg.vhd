-- MDIT221 Unit V: Structural Model - Output Latch Register
-- Features:
--   Built from syllabus D flip-flops (dff).
--   Latches {length(2..0), symbol_bits(4..0), overflow} on decode_strobe.
--   Preserves decoded output display across subsequent keying until next decode.
--   Maintains 'has_decoded' guard to ensure clean power-up (no false ERR or char).
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity output_reg is
    port (
        clk           : in  std_logic;
        clr_n         : in  std_logic;
        latch_en      : in  std_logic; -- decode_strobe
        length_in     : in  std_logic_vector(2 downto 0);
        symbol_in     : in  std_logic_vector(4 downto 0);
        overflow_in   : in  std_logic;
        length_out    : out std_logic_vector(2 downto 0);
        symbol_out    : out std_logic_vector(4 downto 0);
        overflow_out  : out std_logic;
        has_decoded   : out std_logic
    );
end entity output_reg;

architecture structural of output_reg is
    component dff is
        port (
            clk   : in  std_logic;
            clr_n : in  std_logic;
            pre_n : in  std_logic;
            d     : in  std_logic;
            q     : out std_logic;
            qn    : out std_logic
        );
    end component;

    for all : dff use entity work.dff(behavioral);

    signal len_d, len_q, len_qn : std_logic_vector(2 downto 0);
    signal sym_d, sym_q, sym_qn : std_logic_vector(4 downto 0);
    signal ovf_d, ovf_q, ovf_qn : std_logic;
    signal dec_d, dec_q, dec_qn : std_logic;
    signal latch_en_n           : std_logic;
begin
    latch_en_n <= not latch_en;

    -- Multiplexed D inputs: D = (in and latch_en) or (Q and not latch_en)
    len_d(0) <= (length_in(0) and latch_en) or (len_q(0) and latch_en_n);
    len_d(1) <= (length_in(1) and latch_en) or (len_q(1) and latch_en_n);
    len_d(2) <= (length_in(2) and latch_en) or (len_q(2) and latch_en_n);

    u_dff_len0 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => len_d(0), q => len_q(0), qn => len_qn(0));
    u_dff_len1 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => len_d(1), q => len_q(1), qn => len_qn(1));
    u_dff_len2 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => len_d(2), q => len_q(2), qn => len_qn(2));

    sym_d(0) <= (symbol_in(0) and latch_en) or (sym_q(0) and latch_en_n);
    sym_d(1) <= (symbol_in(1) and latch_en) or (sym_q(1) and latch_en_n);
    sym_d(2) <= (symbol_in(2) and latch_en) or (sym_q(2) and latch_en_n);
    sym_d(3) <= (symbol_in(3) and latch_en) or (sym_q(3) and latch_en_n);
    sym_d(4) <= (symbol_in(4) and latch_en) or (sym_q(4) and latch_en_n);

    u_dff_sym0 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => sym_d(0), q => sym_q(0), qn => sym_qn(0));
    u_dff_sym1 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => sym_d(1), q => sym_q(1), qn => sym_qn(1));
    u_dff_sym2 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => sym_d(2), q => sym_q(2), qn => sym_qn(2));
    u_dff_sym3 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => sym_d(3), q => sym_q(3), qn => sym_qn(3));
    u_dff_sym4 : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => sym_d(4), q => sym_q(4), qn => sym_qn(4));

    ovf_d <= (overflow_in and latch_en) or (ovf_q and latch_en_n);
    u_dff_ovf : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => ovf_d, q => ovf_q, qn => ovf_qn);

    -- Latch has_decoded flag: once a decode has occurred, stays 1 until reset
    dec_d <= dec_q or latch_en;
    u_dff_dec : dff port map (clk => clk, clr_n => clr_n, pre_n => '1', d => dec_d, q => dec_q, qn => dec_qn);

    length_out   <= len_q;
    symbol_out   <= sym_q;
    overflow_out <= ovf_q;
    has_decoded  <= dec_q;

end architecture structural;
