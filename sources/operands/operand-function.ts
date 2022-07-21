import { BaseOperand } from "./baseOperand";
import { Operands } from "./operand-mapper";

export type OperandFunction = BaseOperand & {
    body: Operands[],
    args: string[],
    type: 'func',
    arrow: 'name' | 'braced' | undefined;
    return: boolean
}