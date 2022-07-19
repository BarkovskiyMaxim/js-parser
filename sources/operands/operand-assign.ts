import { OperandContext } from "./oparand-context"
import { Operands } from "./operand-mapper"

export type OperandAssign = {
    assignTo: OperandContext[],
    value: Operands,
    new: boolean,
    type: 'assign'
}