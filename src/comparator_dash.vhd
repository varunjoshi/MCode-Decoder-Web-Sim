-- MDIT221 Unit V: Structural Model - Dash Discriminator with Sticky Dash Flag
-- Uses syllabus ic7485 comparator to test width >= 2T (8 ticks).
-- Employs a sticky flip-flop (dff) that latches '1' as soon as the threshold is met,
-- cleared on PRESS, rendering counter wrap-around completely harmless.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity comparator_dash is
    port (
        clk       : in  std_logic;
        clr_n     : in  std_logic;
        press     : in  std_logic;
        width     : in  std_logic_vector(3 downto 0);
        dash_flag : out std_logic
    );
end entity comparator_dash;

architecture structural of comparator_dash is
    component ic7485 is
        port (
            a          : in  std_logic_vector(3 downto 0);
            b          : in  std_logic_vector(3 downto 0);
            a_gt_b_in  : in  std_logic;
            a_lt_b_in  : in  std_logic;
            a_eq_b_in  : in  std_logic;
            a_gt_b_out : out std_logic;
            a_lt_b_out : out std_logic;
            a_eq_b_out : out std_logic
        );
    end component;

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

    for all : ic7485 use entity work.ic7485(dataflow);
    for all : dff use entity work.dff(behavioral);

    signal threshold_2t : std_logic_vector(3 downto 0) := "0111"; -- 2T - 1 = 7 ticks (8-tick boundary)
    signal cmp_gt       : std_logic;
    signal cmp_lt       : std_logic;
    signal cmp_eq       : std_logic;
    signal cmp_ge       : std_logic;
    signal clr_eff_n    : std_logic;
    signal sticky_d     : std_logic;
    signal sticky_q     : std_logic;
    signal sticky_qn    : std_logic;
begin
    -- 7485 4-Bit Magnitude Comparator comparing width against 2T (8)
    u_cmp : ic7485
        port map (
            a          => width,
            b          => threshold_2t,
            a_gt_b_in  => '0',
            a_lt_b_in  => '0',
            a_eq_b_in  => '1',
            a_gt_b_out => cmp_gt,
            a_lt_b_out => cmp_lt,
            a_eq_b_out => cmp_eq
        );

    -- Greater-than or Equal condition
    cmp_ge <= cmp_gt or cmp_eq;

    -- Cleared on master clear or PRESS pulse
    clr_eff_n <= clr_n and (not press);

    -- Sticky latch behavior: once cmp_ge is 1, sticky_d stays 1 until cleared
    sticky_d <= sticky_q or cmp_ge;

    u_sticky_ff : dff
        port map (
            clk   => clk,
            clr_n => clr_eff_n,
            pre_n => '1',
            d     => sticky_d,
            q     => sticky_q,
            qn    => sticky_qn
        );

    dash_flag <= sticky_q or cmp_ge;

end architecture structural;
