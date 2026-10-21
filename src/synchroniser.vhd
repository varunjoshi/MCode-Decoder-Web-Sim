-- MDIT221 Unit V: Structural Model - 2-Stage Key Synchroniser
-- Uses 2 edge-triggered D flip-flops (dff) with an optional SR-latch debouncer in front.
-- Eliminates metastability from asynchronous key input.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity synchroniser is
    port (
        clk      : in  std_logic;
        clr_n    : in  std_logic;
        raw_key  : in  std_logic;
        key_sync : out std_logic
    );
end entity synchroniser;

architecture structural of synchroniser is
    -- Component declarations per syllabus Unit V structural modeling rules
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

    component srlatch is
        port (
            en : in  std_logic;
            s  : in  std_logic;
            r  : in  std_logic;
            q  : out std_logic;
            qn : out std_logic
        );
    end component;

    for all : dff use entity work.dff(behavioral);
    for all : srlatch use entity work.srlatch(behavioral);

    signal debounced_key : std_logic;
    signal debounced_qn  : std_logic;
    signal raw_key_inv   : std_logic;
    signal stage1_q      : std_logic;
    signal stage1_qn     : std_logic;
    signal stage2_qn     : std_logic;
begin
    raw_key_inv <= not raw_key;

    -- SR Latch Debouncer Front-End
    u_debounce : srlatch
        port map (
            en => '1',
            s  => raw_key,
            r  => raw_key_inv,
            q  => debounced_key,
            qn => debounced_qn
        );

    -- First Synchronizer Stage (DFF)
    u_dff1 : dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => '1',
            d     => debounced_key,
            q     => stage1_q,
            qn    => stage1_qn
        );

    -- Second Synchronizer Stage (DFF)
    u_dff2 : dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => '1',
            d     => stage1_q,
            q     => key_sync,
            qn    => stage2_qn
        );

end architecture structural;
