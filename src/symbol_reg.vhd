-- MDIT221 Unit V: Structural Model - 5-Bit SIPO Symbol Register
-- Built from 5 syllabus J-K flip-flops (jkff).
-- Excitation equations per stage with synchronous clear:
--   J = D_in and shift_en and (not clear)
--   K = ((not D_in) and shift_en) or clear
-- When clear = '0' and shift_en = '0': J=0, K=0 (hold state).
-- When clear = '1': J=0, K=1 (synchronous reset on next clock edge).
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity symbol_reg is
    port (
        clk      : in  std_logic;
        clr_n    : in  std_logic; -- Master asynchronous reset
        clear    : in  std_logic; -- Synchronous clear at decode end
        shift_en : in  std_logic; -- Active on RELEASE
        d_in     : in  std_logic; -- Classified symbol (0 = dot, 1 = dash)
        q        : out std_logic_vector(4 downto 0)
    );
end entity symbol_reg;

architecture structural of symbol_reg is
    component jkff is
        port (
            clk   : in  std_logic;
            clr_n : in  std_logic;
            j     : in  std_logic;
            k     : in  std_logic;
            q     : out std_logic;
            qn    : out std_logic
        );
    end component;

    for all : jkff use entity work.jkff(behavioral);

    signal q_int     : std_logic_vector(4 downto 0);
    signal qn_int    : std_logic_vector(4 downto 0);
    signal j_sig     : std_logic_vector(4 downto 0);
    signal k_sig     : std_logic_vector(4 downto 0);
    signal clear_n   : std_logic;
begin
    clear_n <= not clear;

    -- Stage 0 (receives d_in)
    j_sig(0) <= d_in and shift_en and clear_n;
    k_sig(0) <= ((not d_in) and shift_en) or clear;

    u_jkff0 : jkff
        port map (
            clk   => clk,
            clr_n => clr_n,
            j     => j_sig(0),
            k     => k_sig(0),
            q     => q_int(0),
            qn    => qn_int(0)
        );

    -- Stage 1 (receives q_int(0))
    j_sig(1) <= q_int(0) and shift_en and clear_n;
    k_sig(1) <= ((not q_int(0)) and shift_en) or clear;

    u_jkff1 : jkff
        port map (
            clk   => clk,
            clr_n => clr_n,
            j     => j_sig(1),
            k     => k_sig(1),
            q     => q_int(1),
            qn    => qn_int(1)
        );

    -- Stage 2 (receives q_int(1))
    j_sig(2) <= q_int(1) and shift_en and clear_n;
    k_sig(2) <= ((not q_int(1)) and shift_en) or clear;

    u_jkff2 : jkff
        port map (
            clk   => clk,
            clr_n => clr_n,
            j     => j_sig(2),
            k     => k_sig(2),
            q     => q_int(2),
            qn    => qn_int(2)
        );

    -- Stage 3 (receives q_int(2))
    j_sig(3) <= q_int(2) and shift_en and clear_n;
    k_sig(3) <= ((not q_int(2)) and shift_en) or clear;

    u_jkff3 : jkff
        port map (
            clk   => clk,
            clr_n => clr_n,
            j     => j_sig(3),
            k     => k_sig(3),
            q     => q_int(3),
            qn    => qn_int(3)
        );

    -- Stage 4 (receives q_int(3))
    j_sig(4) <= q_int(3) and shift_en and clear_n;
    k_sig(4) <= ((not q_int(3)) and shift_en) or clear;

    u_jkff4 : jkff
        port map (
            clk   => clk,
            clr_n => clr_n,
            j     => j_sig(4),
            k     => k_sig(4),
            q     => q_int(4),
            qn    => qn_int(4)
        );

    q <= q_int;

end architecture structural;
