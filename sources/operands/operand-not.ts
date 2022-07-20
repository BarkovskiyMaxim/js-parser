import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

export type OperandNot = BaseOperand & {
    type: 'not',
    value: Operands[] | Operands
}