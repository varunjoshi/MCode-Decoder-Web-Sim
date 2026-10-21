-- MDIT221 Unit V: Dataflow Model - 7485 4-Bit Magnitude Comparator
-- Datasheet features:
--   Compares two 4-bit binary words (A, B).
--   Cascadable expansion inputs (A_gt_B_in, A_lt_B_in, A_eq_B_in).
--   Three mutually exclusive/definitive outputs: A_gt_B_out, A_lt_B_out, A_eq_B_out.
--   Pure dataflow concurrent logic equations, synthesizable VHDL-93, ieee.std_logic_1164.

library ieee;
use ieee.std_logic_1164.all;

entity ic7485 is
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
end entity ic7485;

architecture dataflow of ic7485 is
    signal eq3, eq2, eq1, eq0 : std_logic;
    signal a_eq_b_int         : std_logic;
    signal a_gt_b_int         : std_logic;
    signal a_lt_b_int         : std_logic;
begin
    -- Bit-level equivalence
    eq3 <= not (a(3) xor b(3));
    eq2 <= not (a(2) xor b(2));
    eq1 <= not (a(1) xor b(1));
    eq0 <= not (a(0) xor b(0));

    -- Full 4-bit internal equality
    a_eq_b_int <= eq3 and eq2 and eq1 and eq0;

    -- Internal A > B evaluation (MSB down to LSB)
    a_gt_b_int <= (a(3) and not b(3)) or
                  (eq3 and a(2) and not b(2)) or
                  (eq3 and eq2 and a(1) and not b(1)) or
                  (eq3 and eq2 and eq1 and a(0) and not b(0));

    -- Internal A < B evaluation (MSB down to LSB)
    a_lt_b_int <= (not a(3) and b(3)) or
                  (eq3 and not a(2) and b(2)) or
                  (eq3 and eq2 and not a(1) and b(1)) or
                  (eq3 and eq2 and eq1 and not a(0) and b(0));

    -- Datasheet output gating with cascade inputs
    a_gt_b_out <= a_gt_b_int or
                  (a_eq_b_int and a_gt_b_in and not a_lt_b_in) or
                  (a_eq_b_int and not a_gt_b_in and not a_lt_b_in and not a_eq_b_in);

    a_lt_b_out <= a_lt_b_int or
                  (a_eq_b_int and not a_gt_b_in and a_lt_b_in) or
                  (a_eq_b_int and not a_gt_b_in and not a_lt_b_in and not a_eq_b_in);

    a_eq_b_out <= a_eq_b_int and a_eq_b_in and not a_gt_b_in and not a_lt_b_in;

end architecture dataflow;
