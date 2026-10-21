-- MDIT221 Unit V: Structural Model - 4-Bit Synchronous Width Counter
-- Built from syllabus T flip-flops (tff) with synchronous carry-chain logic.
-- Cleared on PRESS pulse. Counts when count_en = '1'.
-- Free-running / wrapping (wrap-around rendered harmless by downstream sticky flag).
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity width_counter is
    port (
        clk      : in  std_logic;
        clr_n    : in  std_logic;
        press    : in  std_logic;
        count_en : in  std_logic;
        count    : out std_logic_vector(3 downto 0)
    );
end entity width_counter;

architecture structural of width_counter is
    component tff is
        port (
            clk   : in  std_logic;
            clr_n : in  std_logic;
            t     : in  std_logic;
            q     : out std_logic;
            qn    : out std_logic
        );
    end component;

    for all : tff use entity work.tff(behavioral);

    signal clr_eff_n : std_logic;
    signal q_int     : std_logic_vector(3 downto 0);
    signal qn_int    : std_logic_vector(3 downto 0);
    signal t0, t1, t2, t3 : std_logic;
begin
    -- Clear counter on master reset or on PRESS event
    clr_eff_n <= clr_n and (not press);

    -- Synchronous binary counter toggle equations
    t0 <= count_en;
    t1 <= count_en and q_int(0);
    t2 <= count_en and q_int(0) and q_int(1);
    t3 <= count_en and q_int(0) and q_int(1) and q_int(2);

    -- Bit 0 (LSB)
    u_tff0 : tff
        port map (
            clk   => clk,
            clr_n => clr_eff_n,
            t     => t0,
            q     => q_int(0),
            qn    => qn_int(0)
        );

    -- Bit 1
    u_tff1 : tff
        port map (
            clk   => clk,
            clr_n => clr_eff_n,
            t     => t1,
            q     => q_int(1),
            qn    => qn_int(1)
        );

    -- Bit 2
    u_tff2 : tff
        port map (
            clk   => clk,
            clr_n => clr_eff_n,
            t     => t2,
            q     => q_int(2),
            qn    => qn_int(2)
        );

    -- Bit 3 (MSB)
    u_tff3 : tff
        port map (
            clk   => clk,
            clr_n => clr_eff_n,
            t     => t3,
            q     => q_int(3),
            qn    => qn_int(3)
        );

    count <= q_int;

end architecture structural;
