import { Operands } from "./operand-mapper"
import { OperandSequence } from "./operand-sequence"

export type OperandCall = {
    func: string  | OperandSequence,
    type: 'call',
    args: Operands[]
}