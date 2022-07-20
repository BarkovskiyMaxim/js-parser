import { BaseOperand } from "./baseOperand";

export type OperandValue = BaseOperand & {
    value: any;
    type: 'value';
}

