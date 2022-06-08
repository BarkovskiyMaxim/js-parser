import { OperandContext } from "./oparand-context";
import { OperandAssign } from "./operand-assign";
import { OperandBinary } from "./operand-binary";
import { OperandCall } from "./operand-call";
import { OperandFunction } from "./operand-function";
import { OperandObject } from "./operand-object";
import { OperandReturn } from "./operand-return";
import { OperandValue } from "./operand-value";
import { OperandWith } from "./operand-with";

export type Operands = OperandBinary |
                       OperandValue |
                       OperandContext |
                       OperandAssign | 
                       OperandReturn |
                       OperandFunction |
                       OperandObject |
                       OperandWith |
                       OperandCall;

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

export function IsFunction(operand: Operands): operand is OperandFunction {
    return operand.type === 'func';
}

export function IsReturn(operand: Operands): operand is OperandReturn {
    return operand.type === 'return';
}

export function IsCall(operand: Operands): operand is OperandCall {
    return operand.type === 'call';
}

export function IsObject(operand: Operands): operand is OperandObject {
    return operand.type === 'obj';
}

export function IsWith(operand: Operands): operand is OperandWith {
    return operand.type === 'with';
}