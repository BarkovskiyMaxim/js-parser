import { OperandContext } from "./oparand-context";
import { OperandArray } from "./operand-array";
import { OperandAssign } from "./operand-assign";
import { OperandBinary } from "./operand-binary";
import { OperandCall } from "./operand-call";
import { OperandClass } from "./operand-class";
import { OperandFunction } from "./operand-function";
import { OperandIf } from "./operand-if";
import { OperandNot } from "./operand-not";
import { OperandObject } from "./operand-object";
import { OperandReturn } from "./operand-return";
import { OperandSequence } from "./operand-sequence";
import { OperandTypeOf } from "./operand-typeof";
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
                       OperandIf |
                       OperandSequence |
                       OperandNot |
                       OperandArray |
                       OperandTypeOf |
                       OperandClass |
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

export function IsIf(operand: Operands): operand is OperandIf {
    return operand.type === 'if';
}

export function IsSequence(operand: Operands): operand is OperandSequence {
    return operand.type === 'sequence';
}

export function IsArray(operand: Operands): operand is OperandArray {
    return operand.type === 'array';
}

export function IsNot(operand: Operands): operand is OperandNot {
    return operand.type === 'not';
}

export function IsTypeOf(operand: Operands): operand is OperandTypeOf {
    return operand.type === 'typeof';
}

export function IsClass(operand: Operands): operand is OperandClass {
    return operand.type === 'class';
}