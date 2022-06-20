import { jsContext } from "../operands/js-context";
import { OperandContext } from "../operands/oparand-context";
import { OperandAssign } from "../operands/operand-assign";
import { OperandBinary } from "../operands/operand-binary";
import { OperandCall } from "../operands/operand-call";
import { OperandFunction } from "../operands/operand-function";
import { IsAssign, IsBinary, IsCall, IsContext, IsFunction, IsIf, IsObject, IsReturn, IsSequence, IsValue, IsWith, Operands } from "../operands/operand-mapper";
import { OperandObject } from "../operands/operand-object";

export type BinaryCommands = '+' | '-' | '/' | '*' | '<' | '<=' | '>' | '>=' | '==' | '===' | '||' | '&&';

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
    },
    '||': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) || executeSingleOperation(operand.right, context);
    },
    '&&': (operand: OperandBinary, context: jsContext) => {
        return executeSingleOperation(operand.left, context) && executeSingleOperation(operand.right, context);
    }
}

export function generateFunction(operand: OperandFunction, context: jsContext = {}) {
    return function () {
        let innerContext: jsContext = {};
        for (var i = 0; i < arguments.length; i++) {
            innerContext[operand.args[i]] = arguments[i];
        }
        let result = execute(operand.body, { 
            ...context,
            ...innerContext
        });
        if (result != undefined) {
            return result;
        }
    }
}

export function generateObject(operand: OperandObject, context: jsContext) {
    let result: { [key: string]: any } = {};
    operand.fields.forEach((x) => {
        result[x.name] = execute(x.value, context);
    })
    return result;
}

export function getPropertyByName(context: jsContext, name: string) {
    let propertyPath = name.split('.');
    let result = context;
    for (let i = 0; i < propertyPath.length; i++) {
        result = result[propertyPath[i]];
    }
    return result;
}

export function getAssignFunc(context: jsContext, operands: OperandContext[]) {
    let result = context;
    let latestOperand = operands.pop() as OperandContext;
    for (let i = 0; i < operands.length; i++) {
        result = result[operands[i].name];
    }
    return (val: any) => {
        result[latestOperand.name] = val;
    };
}

export function getContext(operand: OperandCall | OperandContext, context: any = {}, currentObj: any = {}) {
    let propertyName = IsContext(operand) ? operand.name : operand.func;
    if (currentObj[propertyName] !== undefined) {
        return currentObj;
    } else if (context[propertyName] !== undefined) {
        return context;
    } else {
        return (window as any);
    }
}

export function executeSingleOperation(operand: Operands, context: jsContext = {}, currentObj?: any): any {
    if (IsFunction(operand)) {
        return generateFunction(operand, context);
    } else if (IsAssign(operand)) {
        return getAssignFunc(context, operand.assignTo)(execute(operand.value, context));
    } else if (IsContext(operand)) {
        return getContext(operand, context, currentObj)[operand.name];
    } else if (IsValue(operand)) {
        return operand.value;
    } else if (IsBinary(operand)) {
        return binaryCommands[operand.operation](operand, context);
    } else if (IsCall(operand)) {
        return getContext(operand, context, currentObj)[operand.func](...operand.args.map(x => execute(x, context)));
    } else if (IsObject(operand)) {
        return generateObject(operand, context);
    } else if (IsWith(operand)) {
        let innerContext = {
            ...context,
            ...(execute(operand.context, context))
        }
        let result = execute(operand.body, innerContext);
        for (let name in context) {
            context[name] = innerContext[name];
        }
        return result;
    } else if (IsIf(operand)) {
        if (execute(operand.condition, context)) {
            return execute(operand.true, context);
        } else {
            return execute(operand.false, context);
        }
    } else if (IsSequence(operand)) {
        let result = context;
        for (let i = 0; i < operand.operands.length; i++) {
            result = execute(operand.operands[i], context, result);
        }
        return result;
    } else if (IsReturn(operand)) {
        return execute(operand.value, context, currentObj);
    } else {
        return null;
    }
}

export function execute(operands: Operands[] | Operands, context: jsContext = {}, currentObj?: any) {
    if (Array.isArray(operands)) {
        let __result = undefined;
        operands.forEach((operand) => {
            __result = executeSingleOperation(operand, context, currentObj);
        })
        return __result;
    } else {
        return executeSingleOperation(operands, context, currentObj);
    }
}