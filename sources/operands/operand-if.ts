import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

export type OperandIf = BaseOperand & {
    type: 'if',
    true: Operands[],
    ternar: boolean,
    false: Operands[],
    condition: Operands
}