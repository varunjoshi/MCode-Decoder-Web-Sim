-- MDIT221 Unit V: Structural Model - Demo Wrapper with 7490 Clock Divider Chain
-- Demonstrates hardware clock division from a fast board oscillator (e.g. 3.2 kHz)
-- down to human-keyable tick rates (e.g. 32 Hz) using cascaded syllabus ic7490 decade counters.
-- The core morse_top system remains completely single-clock and fully synchronous.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity morse_demo_wrapper is
    port (
        fast_osc_clk : in  std_logic;
        clr_n        : in  std_logic;
        raw_key      : in  std_logic;
        char_onehot  : out std_logic_vector(35 downto 0);
        space        : out std_logic;
        err          : out std_logic;
        char_code    : out std_logic_vector(5 downto 0);
        fsm_state    : out std_logic_vector(1 downto 0);
        slow_tick    : out std_logic -- Divided tick clock monitor
    );
end entity morse_demo_wrapper;

architecture structural of morse_demo_wrapper is
    component ic7490 is
        port (
            cka  : in  std_logic;
            ckb  : in  std_logic;
            r0_1 : in  std_logic;
            r0_2 : in  std_logic;
            r9_1 : in  std_logic;
            r9_2 : in  std_logic;
            qa   : out std_logic;
            qb   : out std_logic;
            qc   : out std_logic;
            qd   : out std_logic
        );
    end component;

    component morse_top is
        port (
            clk         : in  std_logic;
            clr_n       : in  std_logic;
            raw_key     : in  std_logic;
            char_onehot : out std_logic_vector(35 downto 0);
            space       : out std_logic;
            err         : out std_logic;
            char_code   : out std_logic_vector(5 downto 0);
            fsm_state   : out std_logic_vector(1 downto 0)
        );
    end component;

    for all : ic7490 use entity work.ic7490(behavioral);
    for all : morse_top use entity work.morse_top(structural);

    signal qa1, qb1, qc1, qd1 : std_logic;
    signal qa2, qb2, qc2, qd2 : std_logic;
    signal divided_clk        : std_logic;
begin
    ----------------------------------------------------------------------------
    -- Stage 1: Divide by 10 Decade Counter
    -- Fast clock -> CKA. QA connected to CKB. QD provides /10 output.
    ----------------------------------------------------------------------------
    u_div10_1 : ic7490
        port map (
            cka  => fast_osc_clk,
            ckb  => qa1,
            r0_1 => '0',
            r0_2 => '0',
            r9_1 => '0',
            r9_2 => '0',
            qa   => qa1,
            qb   => qb1,
            qc   => qc1,
            qd   => qd1
        );

    ----------------------------------------------------------------------------
    -- Stage 2: Second Divide by 10 Decade Counter (Total /100)
    ----------------------------------------------------------------------------
    u_div10_2 : ic7490
        port map (
            cka  => qd1,
            ckb  => qa2,
            r0_1 => '0',
            r0_2 => '0',
            r9_1 => '0',
            r9_2 => '0',
            qa   => qa2,
            qb   => qb2,
            qc   => qc2,
            qd   => qd2
        );

    divided_clk <= qd2;
    slow_tick   <= divided_clk;

    ----------------------------------------------------------------------------
    -- Core Synchronous Morse Top-Level Instance
    ----------------------------------------------------------------------------
    u_morse_core : morse_top
        port map (
            clk         => divided_clk,
            clr_n       => clr_n,
            raw_key     => raw_key,
            char_onehot => char_onehot,
            space       => space,
            err         => err,
            char_code   => char_code,
            fsm_state   => fsm_state
        );

end architecture structural;
