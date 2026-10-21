-- Unit Testbench for tff (T Flip-Flop)
-- Self-checking testbench with assert statements and error reporting.

library ieee;
use ieee.std_logic_1164.all;

entity tb_tff is
end entity tb_tff;

architecture test of tb_tff is
    signal clk   : std_logic := '0';
    signal clr_n : std_logic := '1';
    signal t     : std_logic := '0';
    signal q     : std_logic;
    signal qn    : std_logic;
begin
    clk_process : process
    begin
        while now < 200 ns loop
            clk <= '0';
            wait for 5 ns;
            clk <= '1';
            wait for 5 ns;
        end loop;
        wait;
    end process;

    stim_proc : process
    begin
        -- 1. Async clear
        clr_n <= '0';
        t     <= '1';
        wait for 12 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: TFF async clear failed" severity error;

        clr_n <= '1';
        -- 2. Hold when T=0
        t <= '0';
        wait for 10 ns; wait for 1 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: TFF hold 0 failed" severity error;

        -- 3. Toggle when T=1
        t <= '1';
        wait for 10 ns;
        assert (q = '1' and qn = '0')
            report "FAIL: TFF toggle 0->1 failed" severity error;

        -- 4. Hold when T=0
        t <= '0';
        wait for 10 ns;
        assert (q = '1' and qn = '0')
            report "FAIL: TFF hold 1 failed" severity error;

        -- 5. Toggle when T=1
        t <= '1';
        wait for 10 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: TFF toggle 1->0 failed" severity error;

        report "PASS: tb_tff all assertions succeeded" severity note;
        wait;
    end process;

    dut : entity work.tff
        port map (
            clk   => clk,
            clr_n => clr_n,
            t     => t,
            q     => q,
            qn    => qn
        );

end architecture test;
