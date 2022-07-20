import { BaseOperand } from "./baseOperand"
import { OperandSequence } from "./operand-sequence"

export type OperandClass = BaseOperand & {
    ctor: OperandSequence,
    type: 'class',
}