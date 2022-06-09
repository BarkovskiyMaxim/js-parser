import { jsContext } from "../operands/js-context";
import { OperandBinary } from "../operands/operand-binary";
import { OperandFunction } from "../operands/operand-function";
import { IsAssign, IsBinary, IsCall, IsContext, IsFunction, IsIf, IsObject, IsReturn, IsValue, IsWith, Operands } from "../operands/operand-mapper";
import { OperandObject } from "../operands/operand-object";

export type BinaryCommands = '+' | '-' | '/' | '*' | '<' | '<=' | '>' | '>=' | '==' | '===';

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
    return function () {
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

export function generateObject(operand: OperandObject, context: jsContext) {
    var result: { [key: string]: any } = {};
    operand.fields.forEach((x) => {
        result[x.name] = execute(x.value, context);
    })
    return result;
}

export function executeSingleOperation(operand: Operands, context: jsContext = {}): any {
    if (IsFunction(operand)) {
        return generateFunction(operand);
    } else if (IsAssign(operand)) {
        context[operand.assignTo] = execute(operand.value, context);
    } else if (IsContext(operand)) {
        return context[operand.name];
    } else if (IsValue(operand)) {
        return operand.value;
    } else if (IsBinary(operand)) {
        return binaryCommands[operand.operation](operand, context);
    } else if (IsCall(operand)) {
        return context[operand.func](...operand.args.map(x => execute(x, context)));
    } else if (IsObject(operand)) {
        return generateObject(operand, context);
    } else if (IsWith(operand)) {
        var innerContext = {
            ...context,
            ...(execute(operand.context, context))
        }
        var result = execute(operand.body, innerContext);
        for (var name in context) {
            context[name] = innerContext[name];
        }
        return result;
    } else if (IsIf(operand)) {
        if (execute(operand.condition, context)) {
            return execute(operand.true, context);
        } else {
            return execute(operand.false, context);
        }
    } else {
        return null;
    }
}

export function execute(operands: Operands[] | Operands, context: jsContext = {}) {
    if (Array.isArray(operands)) {
        let __result = undefined;
        operands.forEach((operand) => {
            if (IsReturn(operand)) {
                __result = executeSingleOperation(operand.value, context);
            } else {
                executeSingleOperation(operand, context);
            }
        })
        return __result;
    } else {
        return executeSingleOperation(operands, context);
    }
}