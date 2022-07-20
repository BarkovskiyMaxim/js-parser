import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

export type OperandCall = BaseOperand & {
    func: string  | Operands,
    type: 'call',
    args: Operands[]
}