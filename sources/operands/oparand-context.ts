import { BaseOperand } from "./baseOperand";
import { Operands } from "./operand-mapper";

export type OperandContext = BaseOperand & {
    name: string | Operands;
    type: 'context';
}