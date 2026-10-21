-- MDIT221 Unit V: Structural Model - Word Space Generator
-- Uses a LETTER_SEEN syllabus D flip-flop (dff) to guard against spurious space generation:
--   1. Never emits a SPACE at power-up (LETTER_SEEN = 0).
--   2. Emits exactly one SPACE strobe when WORD_END fires after a decoded letter.
--   3. Clears LETTER_SEEN immediately upon space generation, preventing repeated spaces per gap.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity word_space is
    port (
        clk           : in  std_logic;
        clr_n         : in  std_logic;
        decode_strobe : in  std_logic;
        word_end      : in  std_logic;
        space_strobe  : out std_logic
    );
end entity word_space;

architecture structural of word_space is
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

    for all : dff use entity work.dff(behavioral);

    signal letter_seen_d  : std_logic;
    signal letter_seen_q  : std_logic;
    signal letter_seen_qn : std_logic;
    signal space_active   : std_logic;
begin
    -- SPACE strobe is high when WORD_END fires and a letter has been seen
    space_active <= word_end and letter_seen_q;
    space_strobe <= space_active;

    -- LETTER_SEEN D excitation:
    -- Set to '1' by decode_strobe.
    -- Cleared to '0' on space_active (when space fires).
    -- Otherwise holds previous value.
    letter_seen_d <= (decode_strobe or letter_seen_q) and (not space_active);

    u_letter_seen_ff : dff
        port map (
            clk   => clk,
            clr_n => clr_n,
            pre_n => '1',
            d     => letter_seen_d,
            q     => letter_seen_q,
            qn    => letter_seen_qn
        );

end architecture structural;
