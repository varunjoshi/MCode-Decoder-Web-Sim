-- Unit Testbench for jkff (J-K Flip-Flop)
-- Self-checking testbench with assert statements and error reporting.

library ieee;
use ieee.std_logic_1164.all;

entity tb_jkff is
end entity tb_jkff;

architecture test of tb_jkff is
    signal clk   : std_logic := '0';
    signal clr_n : std_logic := '1';
    signal j     : std_logic := '0';
    signal k     : std_logic := '0';
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
        -- 1. Test async clear
        clr_n <= '0';
        j <= '1'; k <= '0';
        wait for 12 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: JK async clear failed" severity error;

        clr_n <= '1';
        -- 2. Test Hold (0, 0)
        j <= '0'; k <= '0';
        wait for 10 ns; wait for 1 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: JK hold 0 failed" severity error;

        -- 3. Test Set (1, 0)
        j <= '1'; k <= '0';
        wait for 10 ns;
        assert (q = '1' and qn = '0')
            report "FAIL: JK set to 1 failed" severity error;

        -- 4. Test Hold (0, 0) with Q=1
        j <= '0'; k <= '0';
        wait for 10 ns;
        assert (q = '1' and qn = '0')
            report "FAIL: JK hold 1 failed" severity error;

        -- 5. Test Reset (0, 1)
        j <= '0'; k <= '1';
        wait for 10 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: JK reset failed" severity error;

        -- 6. Test Toggle (1, 1)
        j <= '1'; k <= '1';
        wait for 10 ns;
        assert (q = '1' and qn = '0')
            report "FAIL: JK toggle 0->1 failed" severity error;

        wait for 10 ns;
        assert (q = '0' and qn = '1')
            report "FAIL: JK toggle 1->0 failed" severity error;

        report "PASS: tb_jkff all assertions succeeded" severity note;
        wait;
    end process;

    dut : entity work.jkff
        port map (
            clk   => clk,
            clr_n => clr_n,
            j     => j,
            k     => k,
            q     => q,
            qn    => qn
        );

end architecture test;
