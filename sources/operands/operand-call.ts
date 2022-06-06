import { Operands } from "./operand-mapper"

export type OperandCall = {
    func: string,
    type: 'call',
    args: Operands[]
}