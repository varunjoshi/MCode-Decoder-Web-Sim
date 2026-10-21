-- MDIT221 Unit V: Dataflow Model - 74151 8-to-1 Line Data Selector/Multiplexer
-- Datasheet features:
--   8 inputs D0 through D7, 3 select lines S(2..0), active-low strobe G_n.
--   Complementary outputs Y and W_n (inverted Y).
--   Pure dataflow concurrent logic equations, synthesizable VHDL-93, ieee.std_logic_1164.

library ieee;
use ieee.std_logic_1164.all;

entity ic74151 is
    port (
        d   : in  std_logic_vector(7 downto 0);
        s   : in  std_logic_vector(2 downto 0);
        g_n : in  std_logic;
        y   : out std_logic;
        w_n : out std_logic
    );
end entity ic74151;

architecture dataflow of ic74151 is
    signal y_int : std_logic;
begin
    y_int <= not g_n and (
        (d(0) and not s(2) and not s(1) and not s(0)) or
        (d(1) and not s(2) and not s(1) and     s(0)) or
        (d(2) and not s(2) and     s(1) and not s(0)) or
        (d(3) and not s(2) and     s(1) and     s(0)) or
        (d(4) and     s(2) and not s(1) and not s(0)) or
        (d(5) and     s(2) and not s(1) and     s(0)) or
        (d(6) and     s(2) and     s(1) and not s(0)) or
        (d(7) and     s(2) and     s(1) and     s(0))
    );

    y   <= y_int;
    w_n <= not y_int;

end architecture dataflow;
