-- MDIT221 Unit V: Structural Model - 4-State Gray-Encoded FSM
-- Structural composition of two syllabus D flip-flops (dff) with dataflow
-- next-state and control combinational logic (fsm_comb).
-- States: IDLE = "00", MEASURE = "01", GAP = "11", DECODE = "10".
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity morse_fsm is
    port (
        clk           : in  std_logic;
        clr_n         : in  std_logic;
        press         : in  std_logic;
        release       : in  std_logic;
        letter_end    : in  std_logic;
        state_out     : out std_logic_vector(1 downto 0);
        in_measure    : out std_logic;
        in_gap        : out std_logic;
        shift_en      : out std_logic;
        decode_strobe : out std_logic;
        clear_regs    : out std_logic
    );
end entity morse_fsm;

architecture structural of morse_fsm is
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

    component fsm_comb is
        port (
            q1            : in  std_logic;
            q0            : in  std_logic;
            press         : in  std_logic;
            release       : in  std_logic;
            letter_end    : in  std_logic;
            d1            : out std_logic;
            d0            : out std_logic;
            in_measure    : out std_logic;
            in_gap        : out std_logic;
            shift_en      : out std_logic;
            decode_strobe : out std_logic;
            clear_regs    : out std_logic
        );
    end component;

    for all : dff use entity work.dff(behavioral);
    for all : fsm_comb use entity work.fsm_comb(dataflow);

    signal q1_reg, q1_qn : std_logic;
    signal q0_reg, q0_qn : std_logic;
    signal d1_next       : std_logic;
    signal d0_next       : std_logic;
begin
    -- Next-state and output combinational logic
    u_fsm_comb : fsm_comb
        port map (
            q1            => q1_reg,
            q0            => q0_reg,
            press         => press,
            release       => release,
            letter_end    => letter_end,
            d1            => d1_next,
            d0            => d0_next,
            in_measure    => in_measure,
            in_gap        => in_gap,
            shift_en      => shift_en,
            decode_strobe => decode_strobe,
            clear_regs    => clear_regs
        );

    -- State Flip-Flop 1 (MSB: Q1)
    u_dff1 : dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => '1',
            d     => d1_next,
            q     => q1_reg,
            qn    => q1_qn
        );

    -- State Flip-Flop 0 (LSB: Q0)
    u_dff0 : dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => '1',
            d     => d0_next,
            q     => q0_reg,
            qn    => q0_qn
        );

    state_out(1) <= q1_reg;
    state_out(0) <= q0_reg;

end architecture structural;
