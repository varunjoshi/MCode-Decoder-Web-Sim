-- MDIT221 Unit V: Dataflow Model - 74138 3-to-8 Line Decoder / Demultiplexer
-- Datasheet features:
--   Three enable inputs (G1 active-high, G2A_n active-low, G2B_n active-low).
--   Eight mutually exclusive active-low outputs (Y0_n through Y7_n).
--   Pure dataflow concurrent logic equations, synthesizable VHDL-93, ieee.std_logic_1164.

library ieee;
use ieee.std_logic_1164.all;

entity ic74138 is
    port (
        a     : in  std_logic; -- Select input A (LSB)
        b     : in  std_logic; -- Select input B
        c     : in  std_logic; -- Select input C (MSB)
        g1    : in  std_logic; -- Active-high enable
        g2a_n : in  std_logic; -- Active-low enable
        g2b_n : in  std_logic; -- Active-low enable
        y_n   : out std_logic_vector(7 downto 0) -- Active-low decoded outputs
    );
end entity ic74138;

architecture dataflow of ic74138 is
    signal en : std_logic;
begin
    -- Master enable: G1 and /G2A and /G2B
    en <= g1 and (not g2a_n) and (not g2b_n);

    -- Active-low outputs generated via concurrent dataflow equations
    y_n(0) <= not (en and (not c) and (not b) and (not a));
    y_n(1) <= not (en and (not c) and (not b) and a);
    y_n(2) <= not (en and (not c) and b and (not a));
    y_n(3) <= not (en and (not c) and b and a);
    y_n(4) <= not (en and c and (not b) and (not a));
    y_n(5) <= not (en and c and (not b) and a);
    y_n(6) <= not (en and c and b and (not a));
    y_n(7) <= not (en and c and b and a);

end architecture dataflow;
