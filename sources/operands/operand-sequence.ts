import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

export type OperandSequence = BaseOperand & {
    operands: Operands[],
    type: 'sequence'
}