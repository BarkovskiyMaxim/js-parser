import { Operands } from "./operand-mapper"

export type OperandAssign = {
    assignTo: string,
    value: Operands,
    type: 'assign'
}