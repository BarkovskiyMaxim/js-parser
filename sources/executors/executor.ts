import { jsContext } from "../operands/js-context";
import { OperandBinary } from "../operands/operand-binary";
import { OperandFunction } from "../operands/operand-function";
import { IsAssign, IsBinary, IsContext, IsFunction, IsReturn, IsValue, Operands } from "../operands/operand-mapper";

export type BinaryCommands = '+' | '-' | '/' | '*' | '<' | '<=' | '>' | '>=' | '==' | '===' ;

export type BinaryExecutor = {
    [K in BinaryCommands]: (operand: OperandBinary, context: jsContext) => any;
}

export var binaryCommands: BinaryExecutor = {
    '+': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) + executeSingleOperation(operand.right, context);
    },
    '-': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) - executeSingleOperation(operand.right, context);
    },
    '/': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) / executeSingleOperation(operand.right, context);
    },
    '*': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) * executeSingleOperation(operand.right, context);
    },
    '<': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) < executeSingleOperation(operand.right, context);
    },
    '<=': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) <= executeSingleOperation(operand.right, context);
    },
    '>': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) > executeSingleOperation(operand.right, context);
    },
    '>=': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) >= executeSingleOperation(operand.right, context);
    },
    '==': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) == executeSingleOperation(operand.right, context);
    },
    '===': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) === executeSingleOperation(operand.right, context);
    }
}

export function generateFunction(operand: OperandFunction) {
    return function() {
        let context: jsContext = {};
        for (var i = 0; i < arguments.length; i++) {
            context[operand.args[i]] = arguments[i];
        }
        let result = execute(operand.body, context);
        if (result != undefined) {
            return result;
        }
    }
}

export function executeSingleOperation(operand: Operands, context: jsContext = {}) {
    if (IsFunction(operand)) {
        return generateFunction(operand);
    } else if (IsContext(operand)) {
        return context[operand.name];
    } else if (IsValue(operand)) {
        return operand.value;
    } else if (IsBinary(operand)) {
        return binaryCommands[operand.operation](operand, context);
    } else {
        return null;
    }
}

export function execute(operands: Operands[] | Operands, context: jsContext = {}) {
    if (Array.isArray(operands)) {
        let __result = undefined;
        operands.forEach((operand) => {
            if (IsAssign(operand)) {
                context[operand.assignTo] = execute(operand.value, context);
            } else if (IsReturn(operand)) {
                __result = executeSingleOperation(operand.value, context);
            }
        });
        return __result;
    } else {
        return executeSingleOperation(operands, context);
    }
}