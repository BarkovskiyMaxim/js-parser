import { OperandContext } from "./oparand-context"
import { Operands } from "./operand-mapper"

export type OperandAssign = {
    assignTo: OperandContext[],
    value: Operands,
    type: 'assign'
}