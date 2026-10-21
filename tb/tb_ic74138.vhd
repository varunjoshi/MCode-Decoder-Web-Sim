-- Unit Testbench for ic74138 (3-to-8 Decoder / Demultiplexer)
-- Tests all enable combinations and all 8 decoded output addresses against datasheet.

library ieee;
use ieee.std_logic_1164.all;

entity tb_ic74138 is
end entity tb_ic74138;

architecture test of tb_ic74138 is
    signal a     : std_logic := '0';
    signal b     : std_logic := '0';
    signal c     : std_logic := '0';
    signal g1    : std_logic := '0';
    signal g2a_n : std_logic := '1';
    signal g2b_n : std_logic := '1';
    signal y_n   : std_logic_vector(7 downto 0);
begin
    stim_proc : process
    begin
        -- 1. Test Disabled Conditions (All outputs must be '1')
        g1 <= '0'; g2a_n <= '0'; g2b_n <= '0'; a <= '0'; b <= '0'; c <= '0';
        wait for 10 ns;
        assert y_n = "11111111" report "FAIL: 74138 G1=0 disable failed" severity error;

        g1 <= '1'; g2a_n <= '1'; g2b_n <= '0';
        wait for 10 ns;
        assert y_n = "11111111" report "FAIL: 74138 G2A_n=1 disable failed" severity error;

        g1 <= '1'; g2a_n <= '0'; g2b_n <= '1';
        wait for 10 ns;
        assert y_n = "11111111" report "FAIL: 74138 G2B_n=1 disable failed" severity error;

        -- 2. Test Active Conditions: G1=1, G2A_n=0, G2B_n=0
        g1 <= '1'; g2a_n <= '0'; g2b_n <= '0';

        -- CBA = 000 -> Y0_n = 0
        c <= '0'; b <= '0'; a <= '0';
        wait for 10 ns;
        assert y_n = "11111110" report "FAIL: 74138 output Y0 failed" severity error;

        -- CBA = 001 -> Y1_n = 0
        c <= '0'; b <= '0'; a <= '1';
        wait for 10 ns;
        assert y_n = "11111101" report "FAIL: 74138 output Y1 failed" severity error;

        -- CBA = 010 -> Y2_n = 0
        c <= '0'; b <= '1'; a <= '0';
        wait for 10 ns;
        assert y_n = "11111011" report "FAIL: 74138 output Y2 failed" severity error;

        -- CBA = 011 -> Y3_n = 0
        c <= '0'; b <= '1'; a <= '1';
        wait for 10 ns;
        assert y_n = "11110111" report "FAIL: 74138 output Y3 failed" severity error;

        -- CBA = 100 -> Y4_n = 0
        c <= '1'; b <= '0'; a <= '0';
        wait for 10 ns;
        assert y_n = "11101111" report "FAIL: 74138 output Y4 failed" severity error;

        -- CBA = 101 -> Y5_n = 0
        c <= '1'; b <= '0'; a <= '1';
        wait for 10 ns;
        assert y_n = "11011111" report "FAIL: 74138 output Y5 failed" severity error;

        -- CBA = 110 -> Y6_n = 0
        c <= '1'; b <= '1'; a <= '0';
        wait for 10 ns;
        assert y_n = "10111111" report "FAIL: 74138 output Y6 failed" severity error;

        -- CBA = 111 -> Y7_n = 0
        c <= '1'; b <= '1'; a <= '1';
        wait for 10 ns;
        assert y_n = "01111111" report "FAIL: 74138 output Y7 failed" severity error;

        report "PASS: tb_ic74138 all datasheet truth table assertions succeeded" severity note;
        wait;
    end process;

    dut : entity work.ic74138
        port map (
            a     => a,
            b     => b,
            c     => c,
            g1    => g1,
            g2a_n => g2a_n,
            g2b_n => g2b_n,
            y_n   => y_n
        );

end architecture test;
