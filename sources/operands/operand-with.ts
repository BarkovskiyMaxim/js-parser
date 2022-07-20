import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

export type OperandWith = BaseOperand & {
    context: Operands,
    type: 'with',
    body: Operands[]
}