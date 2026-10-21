-- MDIT221 Unit V: Dataflow Model - 74153 Dual 4-to-1 Line Data Selector/Multiplexer
-- Datasheet features:
--   Common select inputs S(1..0).
--   Separate active-low strobes 1G_n, 2G_n and separate multiplexers.
--   Pure dataflow concurrent logic equations, synthesizable VHDL-93, ieee.std_logic_1164.

library ieee;
use ieee.std_logic_1164.all;

entity ic74153 is
    port (
        c0    : in  std_logic_vector(3 downto 0); -- First 4:1 data inputs 1C0..1C3
        c1    : in  std_logic_vector(3 downto 0); -- Second 4:1 data inputs 2C0..2C3
        s     : in  std_logic_vector(1 downto 0); -- Common select lines B, A
        g0_n  : in  std_logic;                    -- Active-low strobe 1G_n
        g1_n  : in  std_logic;                    -- Active-low strobe 2G_n
        y0    : out std_logic;                    -- Output 1Y
        y1    : out std_logic                     -- Output 2Y
    );
end entity ic74153;

architecture dataflow of ic74153 is
begin
    y0 <= not g0_n and (
        (c0(0) and not s(1) and not s(0)) or
        (c0(1) and not s(1) and     s(0)) or
        (c0(2) and     s(1) and not s(0)) or
        (c0(3) and     s(1) and     s(0))
    );

    y1 <= not g1_n and (
        (c1(0) and not s(1) and not s(0)) or
        (c1(1) and not s(1) and     s(0)) or
        (c1(2) and     s(1) and not s(0)) or
        (c1(3) and     s(1) and     s(0))
    );

end architecture dataflow;
