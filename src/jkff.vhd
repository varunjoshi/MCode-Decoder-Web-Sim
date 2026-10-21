-- MDIT221 Unit IV: Behavioral Model - J-K Flip-Flop
-- Features: Rising edge clock, asynchronous active-low clear, standard JK excitation.
-- Synthesizable VHDL-93 standard, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity jkff is
    port (
        clk   : in  std_logic;
        clr_n : in  std_logic;
        j     : in  std_logic;
        k     : in  std_logic;
        q     : out std_logic;
        qn    : out std_logic
    );
end entity jkff;

architecture behavioral of jkff is
    signal q_reg : std_logic := '0';
begin
    process (clk, clr_n)
    begin
        if clr_n = '0' then
            q_reg <= '0';
        elsif rising_edge(clk) then
            if (j = '0' and k = '0') then
                q_reg <= q_reg;         -- Hold
            elsif (j = '0' and k = '1') then
                q_reg <= '0';           -- Reset
            elsif (j = '1' and k = '0') then
                q_reg <= '1';           -- Set
            elsif (j = '1' and k = '1') then
                q_reg <= not q_reg;     -- Toggle
            end if;
        end if;
    end process;

    q  <= q_reg;
    qn <= not q_reg;
end architecture behavioral;
