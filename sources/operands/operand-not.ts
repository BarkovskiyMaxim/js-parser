import { Operands } from "./operand-mapper"

export type OperandNot = {
    type: 'not',
    value: Operands[] | Operands
}