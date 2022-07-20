import { BaseOperand } from "./baseOperand";
import { Operands } from "./operand-mapper";

export type OperandReturn = BaseOperand & {
    value: Operands;
    type: 'return'
}