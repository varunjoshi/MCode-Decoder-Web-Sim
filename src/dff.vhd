-- MDIT221 Unit IV: Behavioral Model - Edge-Triggered D Flip-Flop
-- Features: Rising edge clock, asynchronous active-low clear and preset.
-- Synthesizable VHDL-93 standard, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity dff is
    port (
        clk   : in  std_logic;
        clr_n : in  std_logic; -- Async active-low clear
        pre_n : in  std_logic; -- Async active-low preset
        d     : in  std_logic;
        q     : out std_logic;
        qn    : out std_logic
    );
end entity dff;

architecture behavioral of dff is
    signal q_reg : std_logic := '0';
begin
    process (clk, clr_n, pre_n)
    begin
        if clr_n = '0' and pre_n = '0' then
            q_reg <= '1'; -- Both active (standard hardware response)
        elsif clr_n = '0' then
            q_reg <= '0';
        elsif pre_n = '0' then
            q_reg <= '1';
        elsif rising_edge(clk) then
            q_reg <= d;
        end if;
    end process;

    q  <= q_reg;
    qn <= not q_reg;
end architecture behavioral;
