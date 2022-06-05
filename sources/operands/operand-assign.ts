import { OperandBase } from "./operand-base"
import { Operands } from "./operand-mapper"

export type OperandAssign = OperandBase & {
    assignTo: string,
    value: Operands,
    type: 'assign'
}