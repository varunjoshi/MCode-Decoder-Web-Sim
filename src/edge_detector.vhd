-- MDIT221 Unit V: Structural Model - Edge Detector
-- Uses an edge-triggered D flip-flop (dff) and syllabus logic gates to generate
-- single-cycle active-high PRESS and RELEASE pulses.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity edge_detector is
    port (
        clk      : in  std_logic;
        clr_n    : in  std_logic;
        key_sync : in  std_logic;
        press    : out std_logic;
        release  : out std_logic
    );
end entity edge_detector;

architecture structural of edge_detector is
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

    signal key_delayed    : std_logic;
    signal key_delayed_qn : std_logic;
    signal key_sync_inv   : std_logic;
begin
    -- Register key state by 1 clock cycle
    u_delay_dff : dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => '1',
            d     => key_sync,
            q     => key_delayed,
            qn    => key_delayed_qn
        );

    key_sync_inv <= not key_sync;

    -- PRESS: key is '1' now and was '0' in previous cycle
    press <= key_sync and key_delayed_qn;

    -- RELEASE: key is '0' now and was '1' in previous cycle
    release <= key_sync_inv and key_delayed;

end architecture structural;
