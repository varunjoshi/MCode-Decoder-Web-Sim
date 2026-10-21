-- MDIT221 Unit V: Dataflow Model - 7483 4-Bit Binary Full Adder with Fast Carry
-- Datasheet features:
--   4-bit binary adder with internal lookahead carry generation.
--   Pure dataflow concurrent logic equations, synthesizable VHDL-93, ieee.std_logic_1164.

library ieee;
use ieee.std_logic_1164.all;

entity ic7483 is
    port (
        a  : in  std_logic_vector(3 downto 0);
        b  : in  std_logic_vector(3 downto 0);
        c0 : in  std_logic;
        s  : out std_logic_vector(3 downto 0);
        c4 : out std_logic
    );
end entity ic7483;

architecture dataflow of ic7483 is
    signal p, g : std_logic_vector(3 downto 0);
    signal c    : std_logic_vector(4 downto 0);
begin
    -- Carry generate and propagate
    g <= a and b;
    p <= a xor b;

    -- Lookahead carry equations
    c(0) <= c0;
    c(1) <= g(0) or (p(0) and c(0));
    c(2) <= g(1) or (p(1) and g(0)) or (p(1) and p(0) and c(0));
    c(3) <= g(2) or (p(2) and g(1)) or (p(2) and p(1) and g(0)) or (p(2) and p(1) and p(0) and c(0));
    c(4) <= g(3) or (p(3) and g(2)) or (p(3) and p(2) and g(1)) or (p(3) and p(2) and p(1) and g(0)) or (p(3) and p(2) and p(1) and p(0) and c(0));

    -- Sum bits and final carry out
    s(0) <= p(0) xor c(0);
    s(1) <= p(1) xor c(1);
    s(2) <= p(2) xor c(2);
    s(3) <= p(3) xor c(3);
    c4   <= c(4);

end architecture dataflow;
