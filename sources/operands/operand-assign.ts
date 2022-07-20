import { BaseOperand } from "./baseOperand"
import { OperandContext } from "./oparand-context"
import { Operands } from "./operand-mapper"

export type OperandAssign = BaseOperand & {
    assignTo: OperandContext[],
    value: Operands,
    new: boolean,
    type: 'assign'
}