-- Unit Testbench for ic7485 (4-Bit Magnitude Comparator)
-- Tests A>B, A<B, A=B at all bit weights, plus cascade input behavior against datasheet.

library ieee;
use ieee.std_logic_1164.all;

entity tb_ic7485 is
end entity tb_ic7485;

architecture test of tb_ic7485 is
    signal a          : std_logic_vector(3 downto 0) := "0000";
    signal b          : std_logic_vector(3 downto 0) := "0000";
    signal a_gt_b_in  : std_logic := '0';
    signal a_lt_b_in  : std_logic := '0';
    signal a_eq_b_in  : std_logic := '1';
    signal a_gt_b_out : std_logic;
    signal a_lt_b_out : std_logic;
    signal a_eq_b_out : std_logic;
begin
    stim_proc : process
    begin
        -- Standard cascade setup for least significant stage
        a_gt_b_in <= '0'; a_lt_b_in <= '0'; a_eq_b_in <= '1';

        -- 1. Test A > B at MSB (bit 3)
        a <= "1000"; b <= "0111";
        wait for 10 ns;
        assert (a_gt_b_out = '1' and a_lt_b_out = '0' and a_eq_b_out = '0')
            report "FAIL: 7485 A>B bit 3 failed" severity error;

        -- 2. Test A < B at MSB (bit 3)
        a <= "0111"; b <= "1000";
        wait for 10 ns;
        assert (a_gt_b_out = '0' and a_lt_b_out = '1' and a_eq_b_out = '0')
            report "FAIL: 7485 A<B bit 3 failed" severity error;

        -- 3. Test A > B at bit 2
        a <= "1100"; b <= "1011";
        wait for 10 ns;
        assert (a_gt_b_out = '1' and a_lt_b_out = '0' and a_eq_b_out = '0')
            report "FAIL: 7485 A>B bit 2 failed" severity error;

        -- 4. Test A > B at bit 0 (LSB)
        a <= "1011"; b <= "1010";
        wait for 10 ns;
        assert (a_gt_b_out = '1' and a_lt_b_out = '0' and a_eq_b_out = '0')
            report "FAIL: 7485 A>B bit 0 failed" severity error;

        -- 5. Test A = B with default cascade (A_eq_B_in = 1)
        a <= "1010"; b <= "1010";
        wait for 10 ns;
        assert (a_gt_b_out = '0' and a_lt_b_out = '0' and a_eq_b_out = '1')
            report "FAIL: 7485 A=B failed" severity error;

        -- 6. Test Cascade when A = B:
        -- 6a. A_gt_B_in = 1
        a_gt_b_in <= '1'; a_lt_b_in <= '0'; a_eq_b_in <= '0';
        wait for 10 ns;
        assert (a_gt_b_out = '1' and a_lt_b_out = '0' and a_eq_b_out = '0')
            report "FAIL: 7485 cascade A_gt_in failed" severity error;

        -- 6b. A_lt_B_in = 1
        a_gt_b_in <= '0'; a_lt_b_in <= '1'; a_eq_b_in <= '0';
        wait for 10 ns;
        assert (a_gt_b_out = '0' and a_lt_b_out = '1' and a_eq_b_out = '0')
            report "FAIL: 7485 cascade A_lt_in failed" severity error;

        -- 6c. All cascade inputs 0 (datasheet: both gt and lt outputs go high)
        a_gt_b_in <= '0'; a_lt_b_in <= '0'; a_eq_b_in <= '0';
        wait for 10 ns;
        assert (a_gt_b_out = '1' and a_lt_b_out = '1' and a_eq_b_out = '0')
            report "FAIL: 7485 cascade all-zero failed" severity error;

        report "PASS: tb_ic7485 all datasheet comparison assertions succeeded" severity note;
        wait;
    end process;

    dut : entity work.ic7485
        port map (
            a          => a,
            b          => b,
            a_gt_b_in  => a_gt_b_in,
            a_lt_b_in  => a_lt_b_in,
            a_eq_b_in  => a_eq_b_in,
            a_gt_b_out => a_gt_b_out,
            a_lt_b_out => a_lt_b_out,
            a_eq_b_out => a_eq_b_out
        );

end architecture test;
