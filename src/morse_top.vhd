-- MDIT221 Unit V: Structural Model - Digital Morse Decoder Top-Level System
-- Comprehensive structural integration of:
--   1. 2-Stage Key Synchroniser (synchroniser)
--   2. Edge Detector (edge_detector)
--   3. 4-Bit Width Counter (width_counter)
--   4. Dash Discriminator with Sticky Flag (comparator_dash)
--   5. 5-Bit Gap Counter with Cascaded 7485 Comparators (gap_counter)
--   6. 4-State Gray-Encoded FSM (morse_fsm)
--   7. 5-Bit SIPO Symbol Register from JK-FFs (symbol_reg)
--   8. 3-Bit Length Counter with Sticky Overflow Flag (length_counter)
--   9. Word Space Generator with Letter-Seen Guard (word_space)
--  10. Output Latch Register (output_reg)
--  11. 74138-Based Morse Character & Error Decoder (morse_decoder_74138)
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity morse_top is
    port (
        clk         : in  std_logic;
        clr_n       : in  std_logic;
        raw_key     : in  std_logic;
        char_onehot : out std_logic_vector(35 downto 0); -- A-Z (0-25), 0-9 (26-35)
        space       : out std_logic;                     -- Single-cycle word space strobe
        err         : out std_logic;                     -- Invalid character or overflow error
        char_code   : out std_logic_vector(5 downto 0);  -- Optional 6-bit LCD bus (0-35, 63=None)
        fsm_state   : out std_logic_vector(1 downto 0)   -- FSM state monitor (00=IDLE, 01=MEAS, 11=GAP, 10=DEC)
    );
end entity morse_top;

architecture structural of morse_top is
    ----------------------------------------------------------------------------
    -- Component Declarations
    ----------------------------------------------------------------------------
    component synchroniser is
        port (
            clk      : in  std_logic;
            clr_n    : in  std_logic;
            raw_key  : in  std_logic;
            key_sync : out std_logic
        );
    end component;

    component edge_detector is
        port (
            clk      : in  std_logic;
            clr_n    : in  std_logic;
            key_sync : in  std_logic;
            press    : out std_logic;
            release  : out std_logic
        );
    end component;

    component width_counter is
        port (
            clk      : in  std_logic;
            clr_n    : in  std_logic;
            press    : in  std_logic;
            count_en : in  std_logic;
            count    : out std_logic_vector(3 downto 0)
        );
    end component;

    component comparator_dash is
        port (
            clk       : in  std_logic;
            clr_n     : in  std_logic;
            press     : in  std_logic;
            width     : in  std_logic_vector(3 downto 0);
            dash_flag : out std_logic
        );
    end component;

    component gap_counter is
        port (
            clk        : in  std_logic;
            clr_n      : in  std_logic;
            press      : in  std_logic;
            release    : in  std_logic;
            count_en   : in  std_logic;
            letter_end : out std_logic;
            word_end   : out std_logic
        );
    end component;

    component morse_fsm is
        port (
            clk           : in  std_logic;
            clr_n         : in  std_logic;
            press         : in  std_logic;
            release       : in  std_logic;
            letter_end    : in  std_logic;
            state_out     : out std_logic_vector(1 downto 0);
            in_measure    : out std_logic;
            in_gap        : out std_logic;
            shift_en      : out std_logic;
            decode_strobe : out std_logic;
            clear_regs    : out std_logic
        );
    end component;

    component symbol_reg is
        port (
            clk      : in  std_logic;
            clr_n    : in  std_logic;
            clear    : in  std_logic;
            shift_en : in  std_logic;
            d_in     : in  std_logic;
            q        : out std_logic_vector(4 downto 0)
        );
    end component;

    component length_counter is
        port (
            clk      : in  std_logic;
            clr_n    : in  std_logic;
            clear    : in  std_logic;
            inc_en   : in  std_logic;
            length   : out std_logic_vector(2 downto 0);
            overflow : out std_logic
        );
    end component;

    component word_space is
        port (
            clk           : in  std_logic;
            clr_n         : in  std_logic;
            decode_strobe : in  std_logic;
            word_end      : in  std_logic;
            space_strobe  : out std_logic
        );
    end component;

    component output_reg is
        port (
            clk           : in  std_logic;
            clr_n         : in  std_logic;
            latch_en      : in  std_logic;
            length_in     : in  std_logic_vector(2 downto 0);
            symbol_in     : in  std_logic_vector(4 downto 0);
            overflow_in   : in  std_logic;
            length_out    : out std_logic_vector(2 downto 0);
            symbol_out    : out std_logic_vector(4 downto 0);
            overflow_out  : out std_logic;
            has_decoded   : out std_logic
        );
    end component;

    component morse_decoder_74138 is
        port (
            length      : in  std_logic_vector(2 downto 0);
            symbol_bits : in  std_logic_vector(4 downto 0);
            overflow    : in  std_logic;
            char_onehot : out std_logic_vector(35 downto 0);
            char_code   : out std_logic_vector(5 downto 0);
            err         : out std_logic
        );
    end component;

    -- Configuration specifications for explicit component binding
    for all : synchroniser use entity work.synchroniser(structural);
    for all : edge_detector use entity work.edge_detector(structural);
    for all : width_counter use entity work.width_counter(structural);
    for all : comparator_dash use entity work.comparator_dash(structural);
    for all : gap_counter use entity work.gap_counter(structural);
    for all : morse_fsm use entity work.morse_fsm(structural);
    for all : symbol_reg use entity work.symbol_reg(structural);
    for all : length_counter use entity work.length_counter(structural);
    for all : word_space use entity work.word_space(structural);
    for all : output_reg use entity work.output_reg(structural);
    for all : morse_decoder_74138 use entity work.morse_decoder_74138(structural);

    ----------------------------------------------------------------------------
    -- Internal Interconnect Signals
    ----------------------------------------------------------------------------
    signal key_sync       : std_logic;
    signal key_up         : std_logic;
    signal press          : std_logic;
    signal release        : std_logic;

    signal in_measure     : std_logic;
    signal in_gap         : std_logic;
    signal shift_en       : std_logic;
    signal decode_strobe  : std_logic;
    signal clear_regs     : std_logic;
    signal fsm_st         : std_logic_vector(1 downto 0);

    signal width_count    : std_logic_vector(3 downto 0);
    signal width_count_en : std_logic;
    signal dash_flag      : std_logic;

    signal letter_end     : std_logic;
    signal word_end       : std_logic;

    signal symbol_bits    : std_logic_vector(4 downto 0);
    signal length_count   : std_logic_vector(2 downto 0);
    signal length_ovf     : std_logic;

    signal space_strobe   : std_logic;

    -- Latched output signals
    signal latched_len    : std_logic_vector(2 downto 0);
    signal latched_sym    : std_logic_vector(4 downto 0);
    signal latched_ovf    : std_logic;
    signal has_decoded    : std_logic;

    -- Raw decoded signals from 74138 network
    signal dec_onehot     : std_logic_vector(35 downto 0);
    signal dec_code       : std_logic_vector(5 downto 0);
    signal dec_err        : std_logic;
begin
    fsm_state <= fsm_st;
    key_up    <= not key_sync;

    ----------------------------------------------------------------------------
    -- 1. Synchroniser: 2 DFFs + SR-latch front-end
    ----------------------------------------------------------------------------
    u_sync : synchroniser
        port map (
            clk      => clk,
            clr_n    => clr_n,
            raw_key  => raw_key,
            key_sync => key_sync
        );

    ----------------------------------------------------------------------------
    -- 2. Edge Detector: DFF + Gates -> PRESS / RELEASE
    ----------------------------------------------------------------------------
    u_edge : edge_detector
        port map (
            clk      => clk,
            clr_n    => clr_n,
            key_sync => key_sync,
            press    => press,
            release  => release
        );

    ----------------------------------------------------------------------------
    -- 3. 4-Bit Synchronous Width Counter
    ----------------------------------------------------------------------------
    width_count_en <= key_sync or release;

    u_width : width_counter
        port map (
            clk      => clk,
            clr_n    => clr_n,
            press    => press,
            count_en => width_count_en,
            count    => width_count
        );

    ----------------------------------------------------------------------------
    -- 4. Dash Discriminator: 7485 Comparator against 2T (8) + Sticky Flag
    ----------------------------------------------------------------------------
    u_dash_cmp : comparator_dash
        port map (
            clk       => clk,
            clr_n     => clr_n,
            press     => press,
            width     => width_count,
            dash_flag => dash_flag
        );

    ----------------------------------------------------------------------------
    -- 5. 5-Bit Synchronous Gap Counter with Cascaded 7485 Comparators
    ----------------------------------------------------------------------------
    u_gap : gap_counter
        port map (
            clk        => clk,
            clr_n      => clr_n,
            press      => press,
            release    => release,
            count_en   => key_up,
            letter_end => letter_end,
            word_end   => word_end
        );

    ----------------------------------------------------------------------------
    -- 6. 4-State Gray-Encoded Control FSM
    ----------------------------------------------------------------------------
    u_fsm : morse_fsm
        port map (
            clk           => clk,
            clr_n         => clr_n,
            press         => press,
            release       => release,
            letter_end    => letter_end,
            state_out     => fsm_st,
            in_measure    => in_measure,
            in_gap        => in_gap,
            shift_en      => shift_en,
            decode_strobe => decode_strobe,
            clear_regs    => clear_regs
        );

    ----------------------------------------------------------------------------
    -- 7. 5-Bit SIPO Symbol Register from JK Flip-Flops
    ----------------------------------------------------------------------------
    u_sym_reg : symbol_reg
        port map (
            clk      => clk,
            clr_n    => clr_n,
            clear    => clear_regs,
            shift_en => shift_en,
            d_in     => dash_flag,
            q        => symbol_bits
        );

    ----------------------------------------------------------------------------
    -- 8. 3-Bit Length Counter with Sticky Overflow Flag
    ----------------------------------------------------------------------------
    u_len_cnt : length_counter
        port map (
            clk      => clk,
            clr_n    => clr_n,
            clear    => clear_regs,
            inc_en   => shift_en,
            length   => length_count,
            overflow => length_ovf
        );

    ----------------------------------------------------------------------------
    -- 9. Word Space Generator with LETTER_SEEN Guard
    ----------------------------------------------------------------------------
    u_space : word_space
        port map (
            clk           => clk,
            clr_n         => clr_n,
            decode_strobe => decode_strobe,
            word_end      => word_end,
            space_strobe  => space_strobe
        );

    space <= space_strobe;

    ----------------------------------------------------------------------------
    -- 10. Output Latch Register (holds display across inter-character gaps)
    ----------------------------------------------------------------------------
    u_out_reg : output_reg
        port map (
            clk          => clk,
            clr_n        => clr_n,
            latch_en     => decode_strobe,
            length_in    => length_count,
            symbol_in    => symbol_bits,
            overflow_in  => length_ovf,
            length_out   => latched_len,
            symbol_out   => latched_sym,
            overflow_out => latched_ovf,
            has_decoded  => has_decoded
        );

    ----------------------------------------------------------------------------
    -- 11. 74138-Based Morse Character & Error Decoder Network
    ----------------------------------------------------------------------------
    u_decoder : morse_decoder_74138
        port map (
            length      => latched_len,
            symbol_bits => latched_sym,
            overflow    => latched_ovf,
            char_onehot => dec_onehot,
            char_code   => dec_code,
            err         => dec_err
        );

    -- Gate final outputs with has_decoded flag for clean power-up
    char_onehot <= dec_onehot when (has_decoded = '1') else (others => '0');
    err         <= dec_err    when (has_decoded = '1') else '0';
    char_code   <= dec_code   when (has_decoded = '1') else "111111";

end architecture structural;
