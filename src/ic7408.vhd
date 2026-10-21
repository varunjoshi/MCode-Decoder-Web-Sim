-- MDIT221 Unit V: Dataflow Model - 7408 Quad 2-Input AND Gate (Individual Gate)
-- Synthesizable VHDL-93 standard, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity ic7408 is
    port (
        a : in  std_logic;
        b : in  std_logic;
        y : out std_logic
    );
end entity ic7408;

architecture dataflow of ic7408 is
begin
    y <= a and b;
end architecture dataflow;
