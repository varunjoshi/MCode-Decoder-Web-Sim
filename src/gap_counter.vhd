-- MDIT221 Unit V: Structural Model - 5-Bit Gap Counter with Cascaded 7485 Comparators
-- Features:
--   5-bit synchronous counter built from syllabus T flip-flops (tff).
--   Cleared on RELEASE or PRESS pulse.
--   Counts while key is UP (count_en = '1').
--   Cascaded ic7485 comparators against 2T (8 ticks) and 5T (20 ticks).
--   Sticky LETTER_END and WORD_END flags (cleared on PRESS, wrap-around immune).
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity gap_counter is
    port (
        clk        : in  std_logic;
        clr_n      : in  std_logic;
        press      : in  std_logic;
        release    : in  std_logic;
        count_en   : in  std_logic; -- Active when key is UP
        letter_end : out std_logic;
        word_end   : out std_logic
    );
end entity gap_counter;

architecture structural of gap_counter is
    component tff is
        port (
            clk   : in  std_logic;
            clr_n : in  std_logic;
            t     : in  std_logic;
            q     : out std_logic;
            qn    : out std_logic
        );
    end component;

    component ic7485 is
        port (
            a          : in  std_logic_vector(3 downto 0);
            b          : in  std_logic_vector(3 downto 0);
            a_gt_b_in  : in  std_logic;
            a_lt_b_in  : in  std_logic;
            a_eq_b_in  : in  std_logic;
            a_gt_b_out : out std_logic;
            a_lt_b_out : out std_logic;
            a_eq_b_out : out std_logic
        );
    end component;

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

    for all : tff use entity work.tff(behavioral);
    for all : ic7485 use entity work.ic7485(dataflow);
    for all : dff use entity work.dff(behavioral);

    signal clr_eff_n      : std_logic;
    signal q_int          : std_logic_vector(4 downto 0);
    signal qn_int         : std_logic_vector(4 downto 0);
    signal t0, t1, t2, t3, t4 : std_logic;

    -- Cascaded comparator signals for 2T = 8 ("01000")
    signal cmp2t_lo_gt, cmp2t_lo_lt, cmp2t_lo_eq : std_logic;
    signal cmp2t_hi_gt, cmp2t_hi_lt, cmp2t_hi_eq : std_logic;
    signal ge_2t          : std_logic;

    -- Cascaded comparator signals for 5T = 20 ("10100")
    signal cmp5t_lo_gt, cmp5t_lo_lt, cmp5t_lo_eq : std_logic;
    signal cmp5t_hi_gt, cmp5t_hi_lt, cmp5t_hi_eq : std_logic;
    signal ge_5t          : std_logic;

    -- Sticky flag registers
    signal letter_sticky_d, letter_sticky_q, letter_sticky_qn : std_logic;
    signal word_sticky_d, word_sticky_q, word_sticky_qn     : std_logic;
    signal flag_clr_n : std_logic;

    -- Intermediate signal for VHDL-93 compliant port mapping
    signal q_hi_padded : std_logic_vector(3 downto 0);
begin
    q_hi_padded <= "000" & q_int(4);

    -- Clear counter on reset, on release (start of gap), or on press
    clr_eff_n <= clr_n and (not release) and (not press);

    -- 5-bit synchronous counter toggle logic
    t0 <= count_en;
    t1 <= count_en and q_int(0);
    t2 <= count_en and q_int(0) and q_int(1);
    t3 <= count_en and q_int(0) and q_int(1) and q_int(2);
    t4 <= count_en and q_int(0) and q_int(1) and q_int(2) and q_int(3);

    u_tff0 : tff port map (clk => clk, clr_n => clr_eff_n, t => t0, q => q_int(0), qn => qn_int(0));
    u_tff1 : tff port map (clk => clk, clr_n => clr_eff_n, t => t1, q => q_int(1), qn => qn_int(1));
    u_tff2 : tff port map (clk => clk, clr_n => clr_eff_n, t => t2, q => q_int(2), qn => qn_int(2));
    u_tff3 : tff port map (clk => clk, clr_n => clr_eff_n, t => t3, q => q_int(3), qn => qn_int(3));
    u_tff4 : tff port map (clk => clk, clr_n => clr_eff_n, t => t4, q => q_int(4), qn => qn_int(4));

    ----------------------------------------------------------------------------
    -- Comparator 2T = 8 ticks (boundary threshold = 7 ticks: "00111")
    -- Lower 4 bits: Q(3..0) vs "0111"
    u_cmp2t_lo : ic7485
        port map (
            a          => q_int(3 downto 0),
            b          => "0111",
            a_gt_b_in  => '0',
            a_lt_b_in  => '0',
            a_eq_b_in  => '1',
            a_gt_b_out => cmp2t_lo_gt,
            a_lt_b_out => cmp2t_lo_lt,
            a_eq_b_out => cmp2t_lo_eq
        );

    -- Upper stage: q_hi_padded vs "0000" cascaded from lower stage
    u_cmp2t_hi : ic7485
        port map (
            a          => q_hi_padded,
            b          => "0000",
            a_gt_b_in  => cmp2t_lo_gt,
            a_lt_b_in  => cmp2t_lo_lt,
            a_eq_b_in  => cmp2t_lo_eq,
            a_gt_b_out => cmp2t_hi_gt,
            a_lt_b_out => cmp2t_hi_lt,
            a_eq_b_out => cmp2t_hi_eq
        );

    ge_2t <= cmp2t_hi_gt or cmp2t_hi_eq;

    ----------------------------------------------------------------------------
    -- Comparator 5T = 20 ticks (boundary threshold = 19 ticks: "10011")
    -- Lower 4 bits: Q(3..0) vs "0011"
    u_cmp5t_lo : ic7485
        port map (
            a          => q_int(3 downto 0),
            b          => "0011",
            a_gt_b_in  => '0',
            a_lt_b_in  => '0',
            a_eq_b_in  => '1',
            a_gt_b_out => cmp5t_lo_gt,
            a_lt_b_out => cmp5t_lo_lt,
            a_eq_b_out => cmp5t_lo_eq
        );

    -- Upper stage: q_hi_padded vs "0001" cascaded from lower stage
    u_cmp5t_hi : ic7485
        port map (
            a          => q_hi_padded,
            b          => "0001",
            a_gt_b_in  => cmp5t_lo_gt,
            a_lt_b_in  => cmp5t_lo_lt,
            a_eq_b_in  => cmp5t_lo_eq,
            a_gt_b_out => cmp5t_hi_gt,
            a_lt_b_out => cmp5t_hi_lt,
            a_eq_b_out => cmp5t_hi_eq
        );

    ge_5t <= cmp5t_hi_gt or cmp5t_hi_eq;

    ----------------------------------------------------------------------------
    -- Sticky Flags: Cleared when new press occurs or system reset
    flag_clr_n <= clr_n and (not press);

    letter_sticky_d <= letter_sticky_q or ge_2t;
    u_letter_ff : dff
        port map (
            clk   => clk,
            clr_n => flag_clr_n,
            pre_n => '1',
            d     => letter_sticky_d,
            q     => letter_sticky_q,
            qn    => letter_sticky_qn
        );

    word_sticky_d <= word_sticky_q or ge_5t;
    u_word_ff : dff
        port map (
            clk   => clk,
            clr_n => flag_clr_n,
            pre_n => '1',
            d     => word_sticky_d,
            q     => word_sticky_q,
            qn    => word_sticky_qn
        );

    letter_end <= letter_sticky_q or ge_2t;
    word_end   <= word_sticky_q or ge_5t;

end architecture structural;
