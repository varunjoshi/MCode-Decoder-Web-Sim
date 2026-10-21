-- MDIT221 Unit IV: Behavioral Model - S-R Latch
-- Features: Level-sensitive Set-Reset latch with enable, behavioral description.
-- Synthesizable VHDL-93 standard, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity srlatch is
    port (
        en : in  std_logic;
        s  : in  std_logic;
        r  : in  std_logic;
        q  : out std_logic;
        qn : out std_logic
    );
end entity srlatch;

architecture behavioral of srlatch is
    signal q_reg : std_logic := '0';
begin
    process (en, s, r, q_reg)
    begin
        if en = '1' then
            if s = '0' and r = '0' then
                q_reg <= q_reg;
            elsif s = '0' and r = '1' then
                q_reg <= '0';
            elsif s = '1' and r = '0' then
                q_reg <= '1';
            else -- s = '1' and r = '1'
                q_reg <= '0'; -- Deterministic resolution of forbidden state
            end if;
        end if;
    end process;

    q  <= q_reg;
    qn <= not q_reg;
end architecture behavioral;
