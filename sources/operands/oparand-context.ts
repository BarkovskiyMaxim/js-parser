import { OperandSequence } from "./operand-sequence";

export type OperandContext = {
    name: string | OperandSequence;
    type: 'context';
}