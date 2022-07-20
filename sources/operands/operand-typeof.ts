import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

export type OperandTypeOf = BaseOperand & {
    value: Operands | Operands[],
    type: 'typeof'
}