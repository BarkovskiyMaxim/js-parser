import { OperandBase } from "./operand-base";
import { Operands } from "./operand-mapper";

export type OperandReturn = OperandBase & {
    value: Operands;
    type: 'return'
}