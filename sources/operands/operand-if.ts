import { Operands } from "./operand-mapper"

export type OperandIf = {
    type: 'if',
    true: Operands[],
    false: Operands[],
    condition: Operands
}