-- MDIT221 Unit IV: Behavioral Model - 7490 Decade/MOD-N Counter
-- Datasheet features:
--   Independent MOD-2 (CKA -> QA) and MOD-5 (CKB -> QD, QC, QB) counters.
--   Asynchronous gated resets: R0_1 and R0_2 reset to 0 ("0000"); R9_1 and R9_2 set to 9 ("1001").
--   Synthesizable VHDL-93 standard, ieee.std_logic_1164 only (no arithmetic libraries).

library ieee;
use ieee.std_logic_1164.all;

entity ic7490 is
    port (
        cka  : in  std_logic;
        ckb  : in  std_logic;
        r0_1 : in  std_logic;
        r0_2 : in  std_logic;
        r9_1 : in  std_logic;
        r9_2 : in  std_logic;
        qa   : out std_logic;
        qb   : out std_logic;
        qc   : out std_logic;
        qd   : out std_logic
    );
end entity ic7490;

architecture behavioral of ic7490 is
    signal qa_reg : std_logic := '0';
    signal qb_reg : std_logic := '0';
    signal qc_reg : std_logic := '0';
    signal qd_reg : std_logic := '0';
begin
    -- Asynchronous reset logic and MOD-2 section (CKA falling edge)
    process (cka, r0_1, r0_2, r9_1, r9_2)
    begin
        if (r9_1 = '1' and r9_2 = '1') then
            qa_reg <= '1';
        elsif (r0_1 = '1' and r0_2 = '1') then
            qa_reg <= '0';
        elsif falling_edge(cka) then
            qa_reg <= not qa_reg;
        end if;
    end process;

    -- Asynchronous reset logic and MOD-5 section (CKB falling edge)
    -- QD, QC, QB state transitions: 000 -> 001 -> 010 -> 011 -> 100 -> 000
    process (ckb, r0_1, r0_2, r9_1, r9_2)
    begin
        if (r9_1 = '1' and r9_2 = '1') then
            qd_reg <= '1';
            qc_reg <= '0';
            qb_reg <= '0';
        elsif (r0_1 = '1' and r0_2 = '1') then
            qd_reg <= '0';
            qc_reg <= '0';
            qb_reg <= '0';
        elsif falling_edge(ckb) then
            if qd_reg = '0' and qc_reg = '0' and qb_reg = '0' then
                qd_reg <= '0'; qc_reg <= '0'; qb_reg <= '1';
            elsif qd_reg = '0' and qc_reg = '0' and qb_reg = '1' then
                qd_reg <= '0'; qc_reg <= '1'; qb_reg <= '0';
            elsif qd_reg = '0' and qc_reg = '1' and qb_reg = '0' then
                qd_reg <= '0'; qc_reg <= '1'; qb_reg <= '1';
            elsif qd_reg = '0' and qc_reg = '1' and qb_reg = '1' then
                qd_reg <= '1'; qc_reg <= '0'; qb_reg <= '0';
            else -- 100 or other
                qd_reg <= '0'; qc_reg <= '0'; qb_reg <= '0';
            end if;
        end if;
    end process;

    qa <= qa_reg;
    qb <= qb_reg;
    qc <= qc_reg;
    qd <= qd_reg;

end architecture behavioral;
