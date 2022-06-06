import { Operands } from "./operand-mapper";

export type OperandFunction = {
    body: Operands[],
    args: string[],
    type: 'func'
}