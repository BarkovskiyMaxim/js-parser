import { OperandBase } from "./operand-base";

export type OperandContext = OperandBase & {
    name: string;
    type: 'context';
}