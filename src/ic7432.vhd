-- MDIT221 Unit V: Dataflow Model - 7432 Quad 2-Input OR Gate (Individual Gate)
-- Synthesizable VHDL-93 standard, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity ic7432 is
    port (
        a : in  std_logic;
        b : in  std_logic;
        y : out std_logic
    );
end entity ic7432;

architecture dataflow of ic7432 is
begin
    y <= a or b;
end architecture dataflow;
