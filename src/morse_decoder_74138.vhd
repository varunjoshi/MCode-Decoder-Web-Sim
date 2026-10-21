-- MDIT221 Unit V: Structural Model - 74138-Based Morse Character & Error Decoder
-- Features:
--   Exclusively uses syllabus ic74138 decoders and 7404/7408/7432 logic gates.
--   Total of 6 ic74138 ICs (minimized chip count):
--     1x 74138 for Length Decoder (/L1 through /L5).
--     1x 74138 for n=1 characters (E, T) with unused B and C address inputs grounded.
--     1x 74138 for n=2 characters (I, A, N, M) with unused C address input grounded.
--     1x 74138 for n=3 characters (S, U, R, W, D, K, G, O).
--     2x 74138 forming a 4-to-16 decoder on bits Q(3..0) shared between:
--       - n=4 letters (H, V, F, L, P, J, B, X, C, Y, Z, Q; unused codes -> ERR).
--       - n=5 digits (0-9) qualified by bit Q(4) with 7408/7432 gates.
--   Outputs:
--     char_onehot(35 downto 0): 0..25 = A..Z, 26..35 = 0..9.
--     char_code(5 downto 0): 6-bit binary character index (0-35, 63 for None/ERR).
--     err: asserts for unused codes, overflow (>=6 symbols), or invalid keying.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity morse_decoder_74138 is
    port (
        length      : in  std_logic_vector(2 downto 0);
        symbol_bits : in  std_logic_vector(4 downto 0);
        overflow    : in  std_logic;
        char_onehot : out std_logic_vector(35 downto 0);
        char_code   : out std_logic_vector(5 downto 0);
        err         : out std_logic
    );
end entity morse_decoder_74138;

architecture structural of morse_decoder_74138 is
    component ic74138 is
        port (
            a     : in  std_logic;
            b     : in  std_logic;
            c     : in  std_logic;
            g1    : in  std_logic;
            g2a_n : in  std_logic;
            g2b_n : in  std_logic;
            y_n   : out std_logic_vector(7 downto 0)
        );
    end component;

    for all : ic74138 use entity work.ic74138(dataflow);

    -- Decoded active-low length lines
    signal y_len_n : std_logic_vector(7 downto 0);
    signal l1_n, l2_n, l3_n, l4_n, l5_n : std_logic;

    -- n=1 decoded outputs (active-low)
    signal y_n1_n : std_logic_vector(7 downto 0);

    -- n=2 decoded outputs (active-low)
    signal y_n2_n : std_logic_vector(7 downto 0);

    -- n=3 decoded outputs (active-low)
    signal y_n3_n : std_logic_vector(7 downto 0);

    -- 4-to-16 decoded outputs on Q(3..0) shared between n=4 and n=5
    signal l45_en_n : std_logic;
    signal y_qlo_n  : std_logic_vector(7 downto 0);
    signal y_qhi_n  : std_logic_vector(7 downto 0);

    -- Active-high decoded character lines
    signal char_active : std_logic_vector(35 downto 0);
    signal any_char    : std_logic;

    -- Bit 4 inverted
    signal q4_n : std_logic;

    -- Active-high line signals for 4-to-16 decoder outputs
    signal q_dec : std_logic_vector(15 downto 0);
begin
    ----------------------------------------------------------------------------
    -- 1. Length Decoder (U_LEN: 1x 74138)
    ----------------------------------------------------------------------------
    u_len_dec : ic74138
        port map (
            a     => length(0),
            b     => length(1),
            c     => length(2),
            g1    => '1',
            g2a_n => '0',
            g2b_n => '0',
            y_n   => y_len_n
        );

    l1_n <= y_len_n(1);
    l2_n <= y_len_n(2);
    l3_n <= y_len_n(3);
    l4_n <= y_len_n(4);
    l5_n <= y_len_n(5);

    ----------------------------------------------------------------------------
    -- 2. n=1 Letters Decoder (U_N1: 1x 74138)
    -- E=0, T=1. Address inputs B and C grounded.
    ----------------------------------------------------------------------------
    u_n1_dec : ic74138
        port map (
            a     => symbol_bits(0),
            b     => '0',
            c     => '0',
            g1    => '1',
            g2a_n => l1_n,
            g2b_n => '0',
            y_n   => y_n1_n
        );

    ----------------------------------------------------------------------------
    -- 3. n=2 Letters Decoder (U_N2: 1x 74138)
    -- I=00 (Y0), A=01 (Y1), N=10 (Y2), M=11 (Y3). Address input C grounded.
    ----------------------------------------------------------------------------
    u_n2_dec : ic74138
        port map (
            a     => symbol_bits(0),
            b     => symbol_bits(1),
            c     => '0',
            g1    => '1',
            g2a_n => l2_n,
            g2b_n => '0',
            y_n   => y_n2_n
        );

    ----------------------------------------------------------------------------
    -- 4. n=3 Letters Decoder (U_N3: 1x 74138)
    -- S=000, U=001, R=010, W=011, D=100, K=101, G=110, O=111.
    ----------------------------------------------------------------------------
    u_n3_dec : ic74138
        port map (
            a     => symbol_bits(0),
            b     => symbol_bits(1),
            c     => symbol_bits(2),
            g1    => '1',
            g2a_n => l3_n,
            g2b_n => '0',
            y_n   => y_n3_n
        );

    ----------------------------------------------------------------------------
    -- 5 & 6. 4-to-16 Decoder on Q(3..0) (U_N4_LO & U_N4_HI: 2x 74138)
    -- Enabled when length is 4 OR length is 5 (l4_n and l5_n = '0').
    ----------------------------------------------------------------------------
    l45_en_n <= l4_n and l5_n; -- Active low when either /L4 or /L5 is active

    -- Lower 8 lines: Q(3) = '0'
    u_qlo_dec : ic74138
        port map (
            a     => symbol_bits(0),
            b     => symbol_bits(1),
            c     => symbol_bits(2),
            g1    => '1',
            g2a_n => l45_en_n,
            g2b_n => symbol_bits(3),
            y_n   => y_qlo_n
        );

    -- Upper 8 lines: Q(3) = '1'
    u_qhi_dec : ic74138
        port map (
            a     => symbol_bits(0),
            b     => symbol_bits(1),
            c     => symbol_bits(2),
            g1    => symbol_bits(3),
            g2a_n => l45_en_n,
            g2b_n => '0',
            y_n   => y_qhi_n
        );

    -- Convert 4-to-16 outputs to active-high
    q_dec(0)  <= not y_qlo_n(0);
    q_dec(1)  <= not y_qlo_n(1);
    q_dec(2)  <= not y_qlo_n(2);
    q_dec(3)  <= not y_qlo_n(3);
    q_dec(4)  <= not y_qlo_n(4);
    q_dec(5)  <= not y_qlo_n(5);
    q_dec(6)  <= not y_qlo_n(6);
    q_dec(7)  <= not y_qlo_n(7);
    q_dec(8)  <= not y_qhi_n(0);
    q_dec(9)  <= not y_qhi_n(1);
    q_dec(10) <= not y_qhi_n(2);
    q_dec(11) <= not y_qhi_n(3);
    q_dec(12) <= not y_qhi_n(4);
    q_dec(13) <= not y_qhi_n(5);
    q_dec(14) <= not y_qhi_n(6);
    q_dec(15) <= not y_qhi_n(7);

    q4_n <= not symbol_bits(4);

    ----------------------------------------------------------------------------
    -- Character Mapping to char_active(35 downto 0)
    -- Indices: A=0 .. Z=25, 0=26 .. 9=35
    ----------------------------------------------------------------------------
    -- n=1
    char_active(4)  <= not y_n1_n(0); -- E (0)
    char_active(19) <= not y_n1_n(1); -- T (1)

    -- n=2
    char_active(0)  <= not y_n2_n(1); -- A (01)
    char_active(8)  <= not y_n2_n(0); -- I (00)
    char_active(12) <= not y_n2_n(3); -- M (11)
    char_active(13) <= not y_n2_n(2); -- N (10)

    -- n=3
    char_active(3)  <= not y_n3_n(4); -- D (100)
    char_active(6)  <= not y_n3_n(6); -- G (110)
    char_active(10) <= not y_n3_n(5); -- K (101)
    char_active(14) <= not y_n3_n(7); -- O (111)
    char_active(17) <= not y_n3_n(2); -- R (010)
    char_active(18) <= not y_n3_n(0); -- S (000)
    char_active(20) <= not y_n3_n(1); -- U (001)
    char_active(22) <= not y_n3_n(3); -- W (011)

    -- n=4 (qualified by /L4 = '0')
    char_active(1)  <= q_dec(8)  and (not l4_n); -- B (1000)
    char_active(2)  <= q_dec(10) and (not l4_n); -- C (1010)
    char_active(5)  <= q_dec(2)  and (not l4_n); -- F (0010)
    char_active(7)  <= q_dec(0)  and (not l4_n); -- H (0000)
    char_active(9)  <= q_dec(7)  and (not l4_n); -- J (0111)
    char_active(11) <= q_dec(4)  and (not l4_n); -- L (0100)
    char_active(15) <= q_dec(6)  and (not l4_n); -- P (0110)
    char_active(16) <= q_dec(13) and (not l4_n); -- Q (1101)
    char_active(21) <= q_dec(1)  and (not l4_n); -- V (0001)
    char_active(23) <= q_dec(9)  and (not l4_n); -- X (1001)
    char_active(24) <= q_dec(11) and (not l4_n); -- Y (1011)
    char_active(25) <= q_dec(12) and (not l4_n); -- Z (1100)

    -- n=5 Digits (qualified by /L5 = '0' and bit 4)
    char_active(26) <= q_dec(15) and symbol_bits(4) and (not l5_n); -- 0 (11111)
    char_active(27) <= q_dec(15) and q4_n           and (not l5_n); -- 1 (01111)
    char_active(28) <= q_dec(7)  and q4_n           and (not l5_n); -- 2 (00111)
    char_active(29) <= q_dec(3)  and q4_n           and (not l5_n); -- 3 (00011)
    char_active(30) <= q_dec(1)  and q4_n           and (not l5_n); -- 4 (00001)
    char_active(31) <= q_dec(0)  and q4_n           and (not l5_n); -- 5 (00000)
    char_active(32) <= q_dec(0)  and symbol_bits(4) and (not l5_n); -- 6 (10000)
    char_active(33) <= q_dec(8)  and symbol_bits(4) and (not l5_n); -- 7 (11000)
    char_active(34) <= q_dec(12) and symbol_bits(4) and (not l5_n); -- 8 (11100)
    char_active(35) <= q_dec(14) and symbol_bits(4) and (not l5_n); -- 9 (11110)

    ----------------------------------------------------------------------------
    -- Error and Output Logic
    ----------------------------------------------------------------------------
    any_char <= char_active(0)  or char_active(1)  or char_active(2)  or char_active(3)  or
                char_active(4)  or char_active(5)  or char_active(6)  or char_active(7)  or
                char_active(8)  or char_active(9)  or char_active(10) or char_active(11) or
                char_active(12) or char_active(13) or char_active(14) or char_active(15) or
                char_active(16) or char_active(17) or char_active(18) or char_active(19) or
                char_active(20) or char_active(21) or char_active(22) or char_active(23) or
                char_active(24) or char_active(25) or char_active(26) or char_active(27) or
                char_active(28) or char_active(29) or char_active(30) or char_active(31) or
                char_active(32) or char_active(33) or char_active(34) or char_active(35);

    -- If overflow occurred, suppress character outputs and set err
    char_onehot <= (others => '0') when (overflow = '1') else char_active;

    -- Error condition: overflow or unrecognized/unused pattern
    err <= overflow or (not any_char);

    -- 6-bit binary code output (0-35, or 63 for invalid/idle)
    process (char_active, overflow, any_char)
    begin
        if overflow = '1' or any_char = '0' then
            char_code <= "111111"; -- 63 = None/Error
        else
            if    char_active(0)  = '1' then char_code <= "000000"; -- A (0)
            elsif char_active(1)  = '1' then char_code <= "000001"; -- B (1)
            elsif char_active(2)  = '1' then char_code <= "000010"; -- C (2)
            elsif char_active(3)  = '1' then char_code <= "000011"; -- D (3)
            elsif char_active(4)  = '1' then char_code <= "000100"; -- E (4)
            elsif char_active(5)  = '1' then char_code <= "000101"; -- F (5)
            elsif char_active(6)  = '1' then char_code <= "000110"; -- G (6)
            elsif char_active(7)  = '1' then char_code <= "000111"; -- H (7)
            elsif char_active(8)  = '1' then char_code <= "001000"; -- I (8)
            elsif char_active(9)  = '1' then char_code <= "001001"; -- J (9)
            elsif char_active(10) = '1' then char_code <= "001010"; -- K (10)
            elsif char_active(11) = '1' then char_code <= "001011"; -- L (11)
            elsif char_active(12) = '1' then char_code <= "001100"; -- M (12)
            elsif char_active(13) = '1' then char_code <= "001101"; -- N (13)
            elsif char_active(14) = '1' then char_code <= "001110"; -- O (14)
            elsif char_active(15) = '1' then char_code <= "001111"; -- P (15)
            elsif char_active(16) = '1' then char_code <= "010000"; -- Q (16)
            elsif char_active(17) = '1' then char_code <= "010001"; -- R (17)
            elsif char_active(18) = '1' then char_code <= "010010"; -- S (18)
            elsif char_active(19) = '1' then char_code <= "010011"; -- T (19)
            elsif char_active(20) = '1' then char_code <= "010100"; -- U (20)
            elsif char_active(21) = '1' then char_code <= "010101"; -- V (21)
            elsif char_active(22) = '1' then char_code <= "010110"; -- W (22)
            elsif char_active(23) = '1' then char_code <= "010111"; -- X (23)
            elsif char_active(24) = '1' then char_code <= "011000"; -- Y (24)
            elsif char_active(25) = '1' then char_code <= "011001"; -- Z (25)
            elsif char_active(26) = '1' then char_code <= "011010"; -- 0 (26)
            elsif char_active(27) = '1' then char_code <= "011011"; -- 1 (27)
            elsif char_active(28) = '1' then char_code <= "011100"; -- 2 (28)
            elsif char_active(29) = '1' then char_code <= "011101"; -- 3 (29)
            elsif char_active(30) = '1' then char_code <= "011110"; -- 4 (30)
            elsif char_active(31) = '1' then char_code <= "011111"; -- 5 (31)
            elsif char_active(32) = '1' then char_code <= "100000"; -- 6 (32)
            elsif char_active(33) = '1' then char_code <= "100001"; -- 7 (33)
            elsif char_active(34) = '1' then char_code <= "100010"; -- 8 (34)
            elsif char_active(35) = '1' then char_code <= "100011"; -- 9 (35)
            else                              char_code <= "111111";
            end if;
        end if;
    end process;

end architecture structural;
