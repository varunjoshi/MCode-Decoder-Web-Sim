-- MDIT221 Unit V: Structural Model - 3-Bit Length Counter with Sticky Overflow Flag
-- Built from 3 syllabus T flip-flops (tff) and a sticky overflow flip-flop (dff).
-- Increments on RELEASE pulse (when inc_en = '1').
-- Synchronously clears on 'clear' pulse without disturbing asynchronous clear integrity.
-- Detects length >= 6 (Q2 and Q1 = '1') and latches sticky OVERFLOW flag.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity length_counter is
    port (
        clk      : in  std_logic;
        clr_n    : in  std_logic; -- Master asynchronous reset
        clear    : in  std_logic; -- Synchronous clear at decode end
        inc_en   : in  std_logic;
        length   : out std_logic_vector(2 downto 0);
        overflow : out std_logic
    );
end entity length_counter;

architecture structural of length_counter is
    component tff is
        port (
            clk   : in  std_logic;
            clr_n : in  std_logic;
            t     : in  std_logic;
            q     : out std_logic;
            qn    : out std_logic
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

    for all : tff use entity work.tff(behavioral);
    for all : dff use entity work.dff(behavioral);

    signal q_int       : std_logic_vector(2 downto 0);
    signal qn_int      : std_logic_vector(2 downto 0);
    signal t0, t1, t2  : std_logic;
    signal clear_n     : std_logic;
    signal ovf_cond    : std_logic;
    signal sticky_d    : std_logic;
    signal sticky_q    : std_logic;
    signal sticky_qn   : std_logic;
begin
    clear_n <= not clear;

    -- Synchronous Toggle Equations:
    -- When clear = '1', T_i = Q_i (forces synchronous toggle back to 0 on next rising edge).
    -- When clear = '0', counts normally when inc_en = '1'.
    t0 <= (q_int(0) and clear) or (inc_en and clear_n);
    t1 <= (q_int(1) and clear) or (inc_en and q_int(0) and clear_n);
    t2 <= (q_int(2) and clear) or (inc_en and q_int(0) and q_int(1) and clear_n);

    u_tff0 : tff
        port map (
            clk   => clk,
            clr_n => clr_n,
            t     => t0,
            q     => q_int(0),
            qn    => qn_int(0)
        );

    u_tff1 : tff
        port map (
            clk   => clk,
            clr_n => clr_n,
            t     => t1,
            q     => q_int(1),
            qn    => qn_int(1)
        );

    u_tff2 : tff
        port map (
            clk   => clk,
            clr_n => clr_n,
            t     => t2,
            q     => q_int(2),
            qn    => qn_int(2)
        );

    -- Overflow condition: count >= 6 (binary "110" or "111", so Q(2) and Q(1))
    ovf_cond <= q_int(2) and q_int(1);

    -- Sticky overflow flip-flop with synchronous clear:
    sticky_d <= (sticky_q or ovf_cond) and clear_n;

    u_ovf_ff : dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => '1',
            d     => sticky_d,
            q     => sticky_q,
            qn    => sticky_qn
        );

    length   <= q_int;
    overflow <= sticky_q;

end architecture structural;
