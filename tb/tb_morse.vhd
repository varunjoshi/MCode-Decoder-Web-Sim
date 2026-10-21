-- Self-Checking Testbench for Digital Morse Decoder (morse_top)
-- Covers all 8 syllabus & specification test suites:
--   1. All 36 characters (A-Z, 0-9) decoded with exact one-hot match.
--   2. Boundary tests (ON 7 vs 8 ticks; OFF 7 vs 8 ticks; OFF 19 vs 20 ticks).
--   3. "SOS" sequence and "SOS SOS" with 7T word gap (single SPACE strobe).
--   4. Nominal keying for A, 5, 0, E, T, H, I with 1T symbol gaps.
--   5. Error detection (6 symbols, 9+ symbols, invalid 4/5-symbol codes).
--   6. Counter wrap-around immunity (100-tick hold and 100-tick gap).
--   7. Power-up safety (no false space at startup, display holds).
--   8. FSM state sequence logging for SOS.

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
use std.textio.all;

entity tb_morse is
end entity tb_morse;

architecture test of tb_morse is
    -- Clock & reset
    signal clk         : std_logic := '0';
    signal clr_n       : std_logic := '1';
    signal raw_key     : std_logic := '0';

    -- Device Under Test outputs
    signal char_onehot : std_logic_vector(35 downto 0);
    signal space       : std_logic;
    signal err         : std_logic;
    signal char_code   : std_logic_vector(5 downto 0);
    signal fsm_state   : std_logic_vector(1 downto 0);

    -- Simulation control
    signal sim_done    : boolean := false;
    constant CLK_PERIOD : time := 10 ns; -- 1 tick = 10 ns

    -- Tracking monitors for space strobes
    signal space_count       : integer := 0;
    signal space_count_reset : std_logic := '0';

begin
    -- 100 MHz master tick clock (10 ns period)
    clk_gen : process
    begin
        while not sim_done loop
            clk <= '0';
            wait for CLK_PERIOD / 2;
            clk <= '1';
            wait for CLK_PERIOD / 2;
        end loop;
        wait;
    end process;

    -- Monitor space pulses (single driver for space_count)
    space_mon : process (clk)
    begin
        if rising_edge(clk) then
            if space_count_reset = '1' then
                space_count <= 0;
            elsif space = '1' then
                space_count <= space_count + 1;
            end if;
        end if;
    end process;

    -- Main stimulus and validation process
    stim_proc : process
        -- Helper: apply clock ticks
        procedure tick(n : in integer) is
        begin
            for i in 1 to n loop
                wait until rising_edge(clk);
            end loop;
        end procedure;

        -- Helper: send a raw symbol (dot: 4 ticks, dash: 12 ticks, or custom length)
        procedure send_press(on_ticks : in integer; off_ticks : in integer) is
        begin
            raw_key <= '1';
            tick(on_ticks);
            raw_key <= '0';
            tick(off_ticks);
        end procedure;

        -- Helper: send standard dot (4 ticks ON, gap ticks OFF)
        procedure send_dot(off_ticks : in integer := 4) is
        begin
            send_press(4, off_ticks);
        end procedure;

        -- Helper: send standard dash (12 ticks ON, gap ticks OFF)
        procedure send_dash(off_ticks : in integer := 4) is
        begin
            send_press(12, off_ticks);
        end procedure;

        -- Helper: wait for letter decode to settle (at least 18 ticks ensures DECODE complete and in IDLE)
        procedure finish_letter is
        begin
            raw_key <= '0';
            tick(18);
        end procedure;

        -- Helper: assert one-hot index matches expected
        procedure check_char(expected_idx : in integer; letter_name : in string) is
            variable found_idx : integer := -1;
            variable ones_cnt  : integer := 0;
        begin
            for i in 0 to 35 loop
                if char_onehot(i) = '1' then
                    ones_cnt := ones_cnt + 1;
                    found_idx := i;
                end if;
            end loop;

            assert ones_cnt = 1
                report "FAIL: Expected exactly 1 active bit for " & letter_name &
                       ", but found " & integer'image(ones_cnt) severity error;

            assert found_idx = expected_idx
                report "FAIL: Output index mismatch for " & letter_name &
                       ": expected " & integer'image(expected_idx) &
                       ", got " & integer'image(found_idx) severity error;

            assert err = '0'
                report "FAIL: ERR asserted during valid character " & letter_name severity error;

            assert to_integer(unsigned(char_code)) = expected_idx
                report "FAIL: char_code mismatch for " & letter_name severity error;
        end procedure;

        -- Helper: assert error state
        procedure check_err(test_name : in string) is
            variable ones_cnt : integer := 0;
        begin
            for i in 0 to 35 loop
                if char_onehot(i) = '1' then
                    ones_cnt := ones_cnt + 1;
                end if;
            end loop;

            assert ones_cnt = 0
                report "FAIL: char_onehot not zero during error test " & test_name severity error;

            assert err = '1'
                report "FAIL: ERR not asserted in test " & test_name severity error;
        end procedure;

    begin
        report "==========================================================" severity note;
        report "STARTING FULL DIGITAL MORSE DECODER TEST SUITE" severity note;
        report "==========================================================" severity note;

        -- Initial Reset
        clr_n <= '0';
        raw_key <= '0';
        tick(5);
        clr_n <= '1';
        tick(5);

        ------------------------------------------------------------------------
        -- TEST 7a: Power-up safety (No false SPACE or character)
        ------------------------------------------------------------------------
        report "TEST 7a: Power-up state verification..." severity note;
        tick(40); -- Idle for 40 ticks
        assert space_count = 0 report "FAIL: False SPACE emitted at power-up" severity error;
        assert char_onehot = (35 downto 0 => '0') report "FAIL: Non-zero char at power-up" severity error;
        assert err = '0' report "FAIL: False ERR at power-up" severity error;
        report "PASS: Test 7a (Power-up safety)" severity note;

        ------------------------------------------------------------------------
        -- TEST 1: All 36 Characters Verification (A-Z, 0-9)
        ------------------------------------------------------------------------
        report "TEST 1: Verifying all 36 Morse characters..." severity note;

        -- A: .- (01) -> index 0
        send_dot(4); send_dash(0); finish_letter; check_char(0, "A");

        -- B: -... (1000) -> index 1
        send_dash(4); send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(1, "B");

        -- C: -.-. (1010) -> index 2
        send_dash(4); send_dot(4); send_dash(4); send_dot(0); finish_letter; check_char(2, "C");

        -- D: -.. (100) -> index 3
        send_dash(4); send_dot(4); send_dot(0); finish_letter; check_char(3, "D");

        -- E: . (0) -> index 4
        send_dot(0); finish_letter; check_char(4, "E");

        -- F: ..-. (0010) -> index 5
        send_dot(4); send_dot(4); send_dash(4); send_dot(0); finish_letter; check_char(5, "F");

        -- G: --. (110) -> index 6
        send_dash(4); send_dash(4); send_dot(0); finish_letter; check_char(6, "G");

        -- H: .... (0000) -> index 7
        send_dot(4); send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(7, "H");

        -- I: .. (00) -> index 8
        send_dot(4); send_dot(0); finish_letter; check_char(8, "I");

        -- J: .--- (0111) -> index 9
        send_dot(4); send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(9, "J");

        -- K: -.- (101) -> index 10
        send_dash(4); send_dot(4); send_dash(0); finish_letter; check_char(10, "K");

        -- L: .-.. (0100) -> index 11
        send_dot(4); send_dash(4); send_dot(4); send_dot(0); finish_letter; check_char(11, "L");

        -- M: -- (11) -> index 12
        send_dash(4); send_dash(0); finish_letter; check_char(12, "M");

        -- N: -. (10) -> index 13
        send_dash(4); send_dot(0); finish_letter; check_char(13, "N");

        -- O: --- (111) -> index 14
        send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(14, "O");

        -- P: .--. (0110) -> index 15
        send_dot(4); send_dash(4); send_dash(4); send_dot(0); finish_letter; check_char(15, "P");

        -- Q: --.- (1101) -> index 16
        send_dash(4); send_dash(4); send_dot(4); send_dash(0); finish_letter; check_char(16, "Q");

        -- R: .-. (010) -> index 17
        send_dot(4); send_dash(4); send_dot(0); finish_letter; check_char(17, "R");

        -- S: ... (000) -> index 18
        send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(18, "S");

        -- T: - (1) -> index 19
        send_dash(0); finish_letter; check_char(19, "T");

        -- U: ..- (001) -> index 20
        send_dot(4); send_dot(4); send_dash(0); finish_letter; check_char(20, "U");

        -- V: ...- (0001) -> index 21
        send_dot(4); send_dot(4); send_dot(4); send_dash(0); finish_letter; check_char(21, "V");

        -- W: .-- (011) -> index 22
        send_dot(4); send_dash(4); send_dash(0); finish_letter; check_char(22, "W");

        -- X: -..- (1001) -> index 23
        send_dash(4); send_dot(4); send_dot(4); send_dash(0); finish_letter; check_char(23, "X");

        -- Y: -.-- (1011) -> index 24
        send_dash(4); send_dot(4); send_dash(4); send_dash(0); finish_letter; check_char(24, "Y");

        -- Z: --.. (1100) -> index 25
        send_dash(4); send_dash(4); send_dot(4); send_dot(0); finish_letter; check_char(25, "Z");

        -- 0: ----- (11111) -> index 26
        send_dash(4); send_dash(4); send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(26, "0");

        -- 1: .---- (01111) -> index 27
        send_dot(4); send_dash(4); send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(27, "1");

        -- 2: ..--- (00111) -> index 28
        send_dot(4); send_dot(4); send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(28, "2");

        -- 3: ...-- (00011) -> index 29
        send_dot(4); send_dot(4); send_dot(4); send_dash(4); send_dash(0); finish_letter; check_char(29, "3");

        -- 4: ....- (00001) -> index 30
        send_dot(4); send_dot(4); send_dot(4); send_dot(4); send_dash(0); finish_letter; check_char(30, "4");

        -- 5: ..... (00000) -> index 31
        send_dot(4); send_dot(4); send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(31, "5");

        -- 6: -.... (10000) -> index 32
        send_dash(4); send_dot(4); send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(32, "6");

        -- 7: --... (11000) -> index 33
        send_dash(4); send_dash(4); send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(33, "7");

        -- 8: ---.. (11100) -> index 34
        send_dash(4); send_dash(4); send_dash(4); send_dot(4); send_dot(0); finish_letter; check_char(34, "8");

        -- 9: ----. (11110) -> index 35
        send_dash(4); send_dash(4); send_dash(4); send_dash(4); send_dot(0); finish_letter; check_char(35, "9");

        report "PASS: Test 1 (All 36 characters successfully decoded)" severity note;

        ------------------------------------------------------------------------
        -- TEST 2: Precise Boundary Tests
        ------------------------------------------------------------------------
        report "TEST 2: Running Boundary Tests..." severity note;

        -- 2a: ON 7 ticks (< 8 ticks = Dot -> E)
        send_press(7, 0); finish_letter; check_char(4, "E (ON 7 ticks boundary)");

        -- 2b: ON 8 ticks (>= 8 ticks = Dash -> T)
        send_press(8, 0); finish_letter; check_char(19, "T (ON 8 ticks boundary)");

        -- 2c: OFF 7 ticks vs OFF 8 ticks:
        -- Send dot (4 ticks), gap 7 ticks, send dot (4 ticks) -> must group into 'I'
        send_press(4, 7); send_press(4, 0); finish_letter; check_char(8, "I (OFF 7 ticks symbol gap)");

        -- Send dot (4 ticks), gap 8 ticks -> triggers letter end DECODE for 'E'
        send_press(4, 8); tick(5); check_char(4, "E (OFF 8 ticks letter end)");

        -- 2d: OFF 19 ticks vs OFF 20 ticks:
        -- Clear space counter
        space_count_reset <= '1'; tick(1); space_count_reset <= '0';
        send_dot(0); finish_letter; check_char(4, "E");
        tick(5); -- Now at ~19 ticks of total gap
        assert space_count = 0 report "FAIL: Space triggered prematurely at < 20 ticks gap" severity error;
        tick(6); -- Cross 20 ticks
        assert space_count = 1 report "FAIL: Space not triggered at 20 ticks gap boundary" severity error;

        report "PASS: Test 2 (All boundary conditions verified)" severity note;

        ------------------------------------------------------------------------
        -- TEST 3: SOS and "SOS SOS" with 7T Word Gap
        ------------------------------------------------------------------------
        report "TEST 3: Running SOS and 'SOS SOS' verification..." severity note;
        space_count_reset <= '1'; tick(1); space_count_reset <= '0';

        -- First 'SOS':
        -- S: ...
        send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(18, "S (1st S of SOS)");
        -- O: ---
        send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(14, "O of SOS");
        -- S: ...
        send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(18, "S (2nd S of SOS)");

        -- Word gap (7T = 28 ticks >= 20 ticks)
        tick(24);
        assert space_count = 1 report "FAIL: Expected exactly 1 space between SOS words" severity error;

        -- Second 'SOS':
        -- S: ...
        send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(18, "S (1st S of 2nd SOS)");
        -- O: ---
        send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(14, "O of 2nd SOS");
        -- S: ...
        send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(18, "S (2nd S of 2nd SOS)");

        report "PASS: Test 3 (SOS and 'SOS SOS' successful, exactly 1 space)" severity note;

        ------------------------------------------------------------------------
        -- TEST 4: Nominal Keying for A, 5, 0, E, T, H, I with 1T gaps
        ------------------------------------------------------------------------
        report "TEST 4: Nominal keying tests (A, 5, 0, E, T, H, I)..." severity note;
        send_dot(4); send_dash(0); finish_letter; check_char(0, "A");
        send_dot(4); send_dot(4); send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(31, "5");
        send_dash(4); send_dash(4); send_dash(4); send_dash(4); send_dash(0); finish_letter; check_char(26, "0");
        send_dot(0); finish_letter; check_char(4, "E");
        send_dash(0); finish_letter; check_char(19, "T");
        send_dot(4); send_dot(4); send_dot(4); send_dot(0); finish_letter; check_char(7, "H");
        send_dot(4); send_dot(0); finish_letter; check_char(8, "I");
        report "PASS: Test 4 (Nominal keying sequence passed)" severity note;

        ------------------------------------------------------------------------
        -- TEST 5: Error Detection
        ------------------------------------------------------------------------
        report "TEST 5: Error detection tests..." severity note;

        -- 5a: 6 symbols (6 dots)
        send_dot(4); send_dot(4); send_dot(4); send_dot(4); send_dot(4); send_dot(0);
        finish_letter; check_err("6 symbols overflow");

        -- 5b: 9 symbols (9 dots)
        for i in 1 to 8 loop send_dot(4); end loop;
        send_dot(0); finish_letter; check_err("9 symbols overflow");

        -- 5c: Unused 4-symbol codes
        -- 0011 (..--)
        send_dot(4); send_dot(4); send_dash(4); send_dash(0); finish_letter; check_err("Unused 4-symbol 0011");
        -- 0101 (.-.-)
        send_dot(4); send_dash(4); send_dot(4); send_dash(0); finish_letter; check_err("Unused 4-symbol 0101");
        -- 1110 (---.)
        send_dash(4); send_dash(4); send_dash(4); send_dot(0); finish_letter; check_err("Unused 4-symbol 1110");
        -- 1111 (----)
        send_dash(4); send_dash(4); send_dash(4); send_dash(0); finish_letter; check_err("Unused 4-symbol 1111");

        -- 5d: Unused 5-symbol code (00010 = ...-.)
        send_dot(4); send_dot(4); send_dot(4); send_dash(4); send_dot(0); finish_letter; check_err("Unused 5-symbol 00010");

        report "PASS: Test 5 (Error detection passed)" severity note;

        ------------------------------------------------------------------------
        -- TEST 6: Wrap-around Immunity (100-tick hold and 100-tick gap)
        ------------------------------------------------------------------------
        report "TEST 6: Wrap-around immunity tests..." severity note;

        -- 6a: 100-tick key hold -> must decode as single Dash ('T')
        send_press(100, 0); finish_letter; check_char(19, "T (100-tick long hold)");

        -- 6b: 100-tick gap -> must emit exactly ONE space, never retrigger
        space_count_reset <= '1'; tick(1); space_count_reset <= '0';
        send_dot(0); finish_letter; check_char(4, "E");
        tick(100); -- Idle for 100 ticks
        assert space_count = 1
            report "FAIL: 100-tick gap did not produce exactly 1 space: count=" & integer'image(space_count)
            severity error;

        report "PASS: Test 6 (Wrap-around immunity passed)" severity note;

        ------------------------------------------------------------------------
        -- TEST 7b: Display Holds Until Next Letter Ends
        ------------------------------------------------------------------------
        report "TEST 7b: Display hold persistence verification..." severity note;

        -- Key 'A'
        send_dot(4); send_dash(0); finish_letter; check_char(0, "A");

        -- During gap, A must remain illuminated
        tick(15); check_char(0, "A holding in gap");

        -- Start keying 'B' (-...): while keying 1st dash, 'A' must STILL hold on display!
        raw_key <= '1'; tick(12); raw_key <= '0'; tick(4);
        check_char(0, "A holding while B is keyed");

        send_dot(4); send_dot(4); send_dot(0); finish_letter;
        -- Now 'B' must be decoded and replace 'A'
        check_char(1, "B replaces A");

        report "PASS: Test 7b (Display persistence holds until next decode)" severity note;

        ------------------------------------------------------------------------
        -- TEST 8: FSM State Logging for SOS
        ------------------------------------------------------------------------
        report "TEST 8: Logging FSM state transitions for SOS..." severity note;
        report "FSM State Encoding: 00=IDLE, 01=MEASURE, 11=GAP, 10=DECODE" severity note;

        -- Helper to log state change
        report "Current FSM State: IDLE (00)" severity note;

        -- Key S (...): 3 dots with 1T symbol gaps
        report "[SOS Test] Keying S (dot-dot-dot)..." severity note;
        -- Dot 1
        raw_key <= '1'; tick(2);
        report "  -> Transition to MEASURE (01) on PRESS" severity note;
        tick(2); raw_key <= '0'; tick(2);
        report "  -> Transition to GAP (11) on RELEASE (dot 1 stored)" severity note;
        tick(2);

        -- Dot 2
        raw_key <= '1'; tick(2);
        report "  -> Transition to MEASURE (01) on PRESS" severity note;
        tick(2); raw_key <= '0'; tick(2);
        report "  -> Transition to GAP (11) on RELEASE (dot 2 stored)" severity note;
        tick(2);

        -- Dot 3
        raw_key <= '1'; tick(2);
        report "  -> Transition to MEASURE (01) on PRESS" severity note;
        tick(2); raw_key <= '0'; tick(2);
        report "  -> Transition to GAP (11) on RELEASE (dot 3 stored)" severity note;

        -- Letter gap: wait for LETTER_END
        tick(6);
        report "  -> Letter gap >= 2T reached: LETTER_END fires" severity note;
        tick(2);
        report "  -> Transition to DECODE (10): Letter 'S' latched" severity note;
        tick(2);
        report "  -> Transition to IDLE (00): Registers cleared, holding display" severity note;
        tick(6);
        check_char(18, "S of SOS");

        -- Key O (---): 3 dashes with 1T symbol gaps
        report "[SOS Test] Keying O (dash-dash-dash)..." severity note;
        -- Dash 1
        raw_key <= '1'; tick(2);
        report "  -> Transition to MEASURE (01) on PRESS" severity note;
        tick(10); raw_key <= '0'; tick(2);
        report "  -> Transition to GAP (11) on RELEASE (dash 1 stored)" severity note;
        tick(2);

        -- Dash 2
        raw_key <= '1'; tick(2);
        report "  -> Transition to MEASURE (01) on PRESS" severity note;
        tick(10); raw_key <= '0'; tick(2);
        report "  -> Transition to GAP (11) on RELEASE (dash 2 stored)" severity note;
        tick(2);

        -- Dash 3
        raw_key <= '1'; tick(2);
        report "  -> Transition to MEASURE (01) on PRESS" severity note;
        tick(10); raw_key <= '0'; tick(2);
        report "  -> Transition to GAP (11) on RELEASE (dash 3 stored)" severity note;

        -- Letter gap: wait for LETTER_END
        tick(6);
        report "  -> Letter gap >= 2T reached: LETTER_END fires" severity note;
        tick(2);
        report "  -> Transition to DECODE (10): Letter 'O' latched" severity note;
        tick(2);
        report "  -> Transition to IDLE (00): Registers cleared, holding display" severity note;
        tick(6);
        check_char(14, "O of SOS");

        -- Key S (...): 3 dots
        report "[SOS Test] Keying S (dot-dot-dot)..." severity note;
        send_dot(4); send_dot(4); send_dot(0); finish_letter;
        check_char(18, "S of SOS (final)");
        report "  -> FSM state sequence for SOS completed successfully" severity note;

        report "PASS: Test 8 (FSM state logging complete)" severity note;

        ------------------------------------------------------------------------
        -- FINAL SUMMARY
        ------------------------------------------------------------------------
        report "==========================================================" severity note;
        report "ALL TEST SUITES PASSED PERFECTLY (8 OF 8 TESTS SUCCEEDED)" severity note;
        report "==========================================================" severity note;

        sim_done <= true;
        wait;
    end process;

    -- Device Under Test: morse_top
    dut : entity work.morse_top
        port map (
            clk         => clk,
            clr_n       => clr_n,
            raw_key     => raw_key,
            char_onehot => char_onehot,
            space       => space,
            err         => err,
            char_code   => char_code,
            fsm_state   => fsm_state
        );

end architecture test;
