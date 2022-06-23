import { Operands } from "./operand-mapper"

export type OperandCall = {
    func: string  | Operands,
    type: 'call',
    args: Operands[]
}