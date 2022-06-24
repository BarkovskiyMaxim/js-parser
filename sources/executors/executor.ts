import { jsContext } from "../operands/js-context";
import { OperandContext } from "../operands/oparand-context";
import { OperandAssign } from "../operands/operand-assign";
import { OperandBinary } from "../operands/operand-binary";
import { OperandCall } from "../operands/operand-call";
import { OperandFunction } from "../operands/operand-function";
import { IsArray, IsAssign, IsBinary, IsCall, IsContext, IsFunction, IsIf, IsNot, IsObject, IsReturn, IsSequence, IsTypeOf, IsValue, IsWith, Operands } from "../operands/operand-mapper";
import { OperandObject } from "../operands/operand-object";
import { OperandSequence } from "../operands/operand-sequence";

export type BinaryCommands = '+' | '-' | '/' | '*' | '<' | '<=' | '>' | '>=' | '==' | '===' | '||' | '&&';

export type BinaryExecutor = {
    [K in BinaryCommands]: (this: any, operand: OperandBinary, context: jsContext[]) => any;
}

export var binaryCommands: BinaryExecutor = {
    '+': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) + executeSingleOperation.call(this, operand.right, context);
    },
    '-': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) - executeSingleOperation.call(this, operand.right, context);
    },
    '/': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) / executeSingleOperation.call(this, operand.right, context);
    },
    '*': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) * executeSingleOperation.call(this, operand.right, context);
    },
    '<': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) < executeSingleOperation.call(this, operand.right, context);
    },
    '<=': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) <= executeSingleOperation.call(this, operand.right, context);
    },
    '>': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) > executeSingleOperation.call(this, operand.right, context);
    },
    '>=': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) >= executeSingleOperation.call(this, operand.right, context);
    },
    '==': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) == executeSingleOperation.call(this, operand.right, context);
    },
    '===': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) === executeSingleOperation.call(this, operand.right, context);
    },
    '||': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) || executeSingleOperation.call(this, operand.right, context);
    },
    '&&': function (this: any, operand: OperandBinary, context: jsContext[]) {
        return executeSingleOperation.call(this, operand.left, context) && executeSingleOperation.call(this, operand.right, context);
    }
}

export function generateFunction(operand: OperandFunction, context: jsContext[] = [{}]) {
    return function (this: any) {
        let innerContext: jsContext = {};
        for (var i = 0; i < operand.args.length; i++) {
            innerContext[operand.args[i]] = arguments[i];
        }
        let result = _execute.call(this, operand.body, [...context, innerContext]);
        if (result != undefined) {
            return result;
        }
    }
}

export function generateObject(this: any, operand: OperandObject, context: jsContext[]) {
    let result: { [key: string]: any } = {};
    operand.fields.forEach((x) => {
        result[x.name] = _execute.call(this, x.value, context);
    })
    return result;
}

export function getAssignFunc(this: any, context: jsContext[], operands: OperandContext[]) {
    let result = getContext(operands[0], context) || context[context.length - 1];
    let latestOperand = operands.pop() as OperandContext;
    for (let i = 0; i < operands.length; i++) {
        if (operands[i].name === 'this') result = this;
        else if (typeof operands[i].name === 'string') result = result[operands[i].name as string];
        else result = result[_execute.call(this, operands[i].name as Operands, context) as string]
    }
    return (val: any) => {
        if (typeof latestOperand.name === 'string') result[latestOperand.name] = val;
        else result[_execute.call(this, latestOperand.name as Operands, context) as string]
    };
}

export function getContext(this: any, operand: OperandCall | OperandContext, context: any[]) {
    let propertyName = IsContext(operand) ? operand.name : operand.func;
    if (typeof propertyName !== "string") return context[context.length - 1];
    for (var i = context.length - 1; i >= 0; i--) {
        if (typeof context[i] === 'object' && propertyName in context[i]) {
            return context[i]
        } else if (!!context[i][propertyName]) {
            return context[i];
        }
    }
}

export function executeSingleOperation(this: any, operand: Operands, context: jsContext[]): any {
    if (typeof context[context.length - 1] === 'object' && '___result' in context[context.length - 1])
        return context[context.length - 1]["___result"];
    if (IsFunction(operand)) {
        return generateFunction(operand, context);
    } else if (IsAssign(operand)) {
        return getAssignFunc.call(this, context, operand.assignTo)(_execute.call(this, operand.value, context));
    } else if (IsContext(operand)) {
        if (operand.name === 'this') return this;
        let name = operand.name;
        if (typeof name !== 'string') {
            name = _execute.call(this, operand.name as Operands, context);
        }
        return getContext.call(this, operand, context)[name as string];
    } else if (IsValue(operand)) {
        return operand.value;
    } else if (IsBinary(operand)) {
        return binaryCommands[operand.operation].call(this, operand, context);
    } else if (IsCall(operand)) {
        let func = operand.func;
        if (typeof func !== 'string') {
            func = _execute.call(this, func, context);
        }
        return getContext.call(this, operand, context)[func as string](...operand.args.map(x => _execute.call(this, x, context)));
    } else if (IsObject(operand)) {
        return generateObject.call(this, operand, context);
    } else if (IsWith(operand)) {
        let result = _execute.call(this, operand.body, [
            ...context,
            _execute.call(this, operand.context, context)
        ]);
        return result;
    } else if (IsIf(operand)) {
        if (_execute.call(this, operand.condition, context)) {
            return _execute.call(this, operand.true, context);
        } else {
            return _execute.call(this, operand.false, context);
        }
    } else if (IsSequence(operand)) {
        let newContext = [...context];
        for (let i = 0; i < operand.operands.length; i++) {
            newContext.push(_execute.call(this, operand.operands[i], newContext));
        }
        return newContext[newContext.length - 1];
    } else if (IsReturn(operand)) {
        context[context.length - 1]['___result'] = _execute.call(this, operand.value, context);
        return context[context.length - 1]['___result'];
    } else if (IsArray(operand)) {
        return operand.values.map(x => _execute.call(this, x, context));
    } else if (IsNot(operand)) {
        return !_execute.call(this, operand.value, context);
    } else if (IsTypeOf(operand)) {
        let _res = _execute.call(this, operand.value, context);
        return typeof _res;
    } else {
        return null;
    }
}

export function execute(this: any, operands: Operands[] | Operands, context: jsContext = {}) {
    return _execute.call(this, operands, [window, context]);
}

export function _execute(this: any, operands: Operands[] | Operands, context: any[] = [{}]) {
    if (typeof context[context.length - 1] === 'object' && '___result' in context[context.length - 1]) {
        return context[context.length - 1]['___result'];
    }
    if (Array.isArray(operands)) {
        let __result = undefined;
        for (var i = 0; i < operands.length; i++) {
            __result = executeSingleOperation.call(this, operands[i], context);
            if ('__result' in context[context.length - 1]) {
                return context[context.length - 1]['___result'];
            }
        }
        return __result;
    } else {
        return executeSingleOperation.call(this, operands, context);
    }
}