import { Operands } from "./operand-mapper";

export type OperandContext = {
    name: string | Operands;
    type: 'context';
}