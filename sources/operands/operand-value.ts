import { OperandBase } from "./operand-base";

export type OperandValue = OperandBase & {
    value: any;
    type: 'value';
}

