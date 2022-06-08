import { Operands } from "./operand-mapper"

export type OperandWith = {
    context: Operands,
    type: 'with',
    body: Operands[]
}