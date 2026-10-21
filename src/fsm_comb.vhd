-- MDIT221 Unit V: Dataflow Model - FSM Combinational Logic
-- Derives next-state equations and control strobes for Gray-encoded Morse FSM:
--   IDLE    = "00"
--   MEASURE = "01"
--   GAP     = "11"
--   DECODE  = "10"
-- Pure dataflow concurrent logic equations derived via Karnaugh maps.
-- Synthesizable VHDL-93, ieee.std_logic_1164 only.

library ieee;
use ieee.std_logic_1164.all;

entity fsm_comb is
    port (
        q1            : in  std_logic;
        q0            : in  std_logic;
        press         : in  std_logic;
        release       : in  std_logic;
        letter_end    : in  std_logic;
        d1            : out std_logic;
        d0            : out std_logic;
        in_measure    : out std_logic;
        in_gap        : out std_logic;
        shift_en      : out std_logic;
        decode_strobe : out std_logic;
        clear_regs    : out std_logic
    );
end entity fsm_comb;

architecture dataflow of fsm_comb is
    signal q1_n, q0_n : std_logic;
begin
    q1_n <= not q1;
    q0_n <= not q0;

    -- Next-State D1 Equation:
    -- D1 = (~Q1 * Q0 * release) + (Q1 * Q0 * ~press)
    d1 <= (q1_n and q0 and release) or (q1 and q0 and not press);

    -- Next-State D0 Equation:
    -- D0 = (~Q1 * ~Q0 * press) + (~Q1 * Q0) + (Q1 * Q0 * (press or ~letter_end))
    d0 <= (q1_n and q0_n and press) or
          (q1_n and q0) or
          (q1 and q0 and (press or not letter_end));

    -- Control Strobes & Level Indicators
    in_measure    <= q1_n and q0;             -- State MEASURE (01)
    in_gap        <= q1 and q0;               -- State GAP (11)
    decode_strobe <= q1 and q0_n;             -- State DECODE (10)
    clear_regs    <= q1 and q0_n;             -- Synchronously clears shift register when leaving DECODE

    -- Shift enable: fire on RELEASE while in MEASURE
    shift_en      <= q1_n and q0 and release;

end architecture dataflow;
