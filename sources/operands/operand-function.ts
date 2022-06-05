import { OperandBase } from "./operand-base";
import { Operands } from "./operand-mapper";

export type OperandFunction = OperandBase & {
    body: Operands[],
    args: string[],
    type: 'func'
}