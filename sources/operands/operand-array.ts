import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

export type OperandArray= BaseOperand & {
    type: 'array',
    values: Operands[]
}