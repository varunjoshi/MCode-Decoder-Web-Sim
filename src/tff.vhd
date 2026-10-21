-- MDIT221 Unit IV: Behavioral Model - T Flip-Flop
-- Features: Rising edge clock, asynchronous active-low clear, toggle enable T.
-- Synthesizable VHDL-93 standard, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity tff is
    port (
        clk   : in  std_logic;
        clr_n : in  std_logic;
        t     : in  std_logic;
        q     : out std_logic;
        qn    : out std_logic
    );
end entity tff;

architecture behavioral of tff is
    signal q_reg : std_logic := '0';
begin
    process (clk, clr_n)
    begin
        if clr_n = '0' then
            q_reg <= '0';
        elsif rising_edge(clk) then
            if t = '1' then
                q_reg <= not q_reg;
            end if;
        end if;
    end process;

    q  <= q_reg;
    qn <= not q_reg;
end architecture behavioral;
