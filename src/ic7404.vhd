-- MDIT221 Unit V: Dataflow Model - 7404 Hex Inverter (Individual Gate)
-- Synthesizable VHDL-93 standard, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity ic7404 is
    port (
        a : in  std_logic;
        y : out std_logic
    );
end entity ic7404;

architecture dataflow of ic7404 is
begin
    y <= not a;
end architecture dataflow;
