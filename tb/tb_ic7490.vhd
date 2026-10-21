-- Unit Testbench for ic7490 (Decade / MOD-N Counter)
-- Tests BCD decade counting sequence (0-9) and asynchronous R0 / R9 reset pins.

library ieee;
use ieee.std_logic_1164.all;

entity tb_ic7490 is
end entity tb_ic7490;

architecture test of tb_ic7490 is
    signal cka  : std_logic := '0';
    signal ckb  : std_logic;
    signal r0_1 : std_logic := '0';
    signal r0_2 : std_logic := '0';
    signal r9_1 : std_logic := '0';
    signal r9_2 : std_logic := '0';
    signal qa   : std_logic;
    signal qb   : std_logic;
    signal qc   : std_logic;
    signal qd   : std_logic;

    signal q_bcd : std_logic_vector(3 downto 0);
begin
    q_bcd <= qd & qc & qb & qa;
    ckb   <= qa; -- External connection for BCD decade counter mode

    stim_proc : process
        procedure clock_pulse is
        begin
            cka <= '1';
            wait for 5 ns;
            cka <= '0';
            wait for 5 ns;
        end procedure;
    begin
        -- 1. Test asynchronous reset to 0 (R0_1 and R0_2 active high)
        r0_1 <= '1'; r0_2 <= '1';
        wait for 10 ns;
        assert q_bcd = "0000" report "FAIL: 7490 reset to 0 failed" severity error;
        r0_1 <= '0'; r0_2 <= '0';
        wait for 10 ns;

        -- 2. Test BCD count 0 through 9
        clock_pulse; assert q_bcd = "0001" report "FAIL: 7490 count 1 failed" severity error;
        clock_pulse; assert q_bcd = "0010" report "FAIL: 7490 count 2 failed" severity error;
        clock_pulse; assert q_bcd = "0011" report "FAIL: 7490 count 3 failed" severity error;
        clock_pulse; assert q_bcd = "0100" report "FAIL: 7490 count 4 failed" severity error;
        clock_pulse; assert q_bcd = "0101" report "FAIL: 7490 count 5 failed" severity error;
        clock_pulse; assert q_bcd = "0110" report "FAIL: 7490 count 6 failed" severity error;
        clock_pulse; assert q_bcd = "0111" report "FAIL: 7490 count 7 failed" severity error;
        clock_pulse; assert q_bcd = "1000" report "FAIL: 7490 count 8 failed" severity error;
        clock_pulse; assert q_bcd = "1001" report "FAIL: 7490 count 9 failed" severity error;
        clock_pulse; assert q_bcd = "0000" report "FAIL: 7490 count roll-over failed" severity error;

        -- 3. Test asynchronous set to 9 (R9_1 and R9_2 active high)
        r9_1 <= '1'; r9_2 <= '1';
        wait for 10 ns;
        assert q_bcd = "1001" report "FAIL: 7490 set to 9 failed" severity error;
        r9_1 <= '0'; r9_2 <= '0';
        wait for 10 ns;

        report "PASS: tb_ic7490 all decade counter and reset assertions succeeded" severity note;
        wait;
    end process;

    dut : entity work.ic7490
        port map (
            cka  => cka,
            ckb  => ckb,
            r0_1 => r0_1,
            r0_2 => r0_2,
            r9_1 => r9_1,
            r9_2 => r9_2,
            qa   => qa,
            qb   => qb,
            qc   => qc,
            qd   => qd
        );

end architecture test;
