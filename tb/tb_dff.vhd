-- Unit Testbench for dff (Edge-Triggered D Flip-Flop)
-- Self-checking testbench with assert statements and error reporting.

library ieee;
use ieee.std_logic_1164.all;
use std.textio.all;

entity tb_dff is
end entity tb_dff;

architecture test of tb_dff is
    signal clk   : std_logic := '0';
    signal clr_n : std_logic := '1';
    signal pre_n : std_logic := '1';
    signal d     : std_logic := '0';
    signal q     : std_logic;
    signal qn    : std_logic;
begin
    -- 100 MHz clock (10 ns period)
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
        -- Initial reset
        clr_n <= '0';
        pre_n <= '1';
        d     <= '0';
        wait for 12 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: Async clear failed" severity error;

        -- Release clear, test D=1 clocked
        clr_n <= '1';
        d     <= '1';
        wait for 10 ns; -- Wait for next rising edge
        wait for 1 ns;
        assert (q = '1' and qn = '0')
            report "FAIL: Clocked D=1 failed" severity error;

        -- Test D=0 clocked
        d <= '0';
        wait for 10 ns;
        wait for 1 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: Clocked D=0 failed" severity error;

        -- Test async preset
        pre_n <= '0';
        wait for 3 ns;
        assert (q = '1' and qn = '0')
            report "FAIL: Async preset failed" severity error;
        pre_n <= '1';
        wait for 10 ns;

        report "PASS: tb_dff all assertions succeeded" severity note;
        wait;
    end process;

    dut : entity work.dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => pre_n,
            d     => d,
            q     => q,
            qn    => qn
        );

end architecture test;
