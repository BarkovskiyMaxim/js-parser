import { OperandContext } from "./oparand-context";
import { OperandAssign } from "./operand-assign";
import { OperandBase } from "./operand-base";
import { OperandBinary } from "./operand-binary";
import { OperandValue } from "./operand-value";

export type Operands = OperandBinary | OperandValue | OperandContext | OperandAssign | OperandBase;

export function IsBinary(operand: Operands): operand is OperandBinary {
    return operand.type === 'binary';
}

export function IsContext(operand: Operands): operand is OperandContext {
    return operand.type === 'context';
}

export function IsValue(operand: Operands): operand is OperandValue {
    return operand.type === 'value';
}

export function IsAssign(operand: Operands): operand is OperandAssign {
    return operand.type === 'assign';
}