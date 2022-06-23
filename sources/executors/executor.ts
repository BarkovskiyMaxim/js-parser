import { jsContext } from "../operands/js-context";
import { OperandContext } from "../operands/oparand-context";
import { OperandAssign } from "../operands/operand-assign";
import { OperandBinary } from "../operands/operand-binary";
import { OperandCall } from "../operands/operand-call";
import { OperandFunction } from "../operands/operand-function";
import { IsArray, IsAssign, IsBinary, IsCall, IsContext, IsFunction, IsIf, IsNot, IsObject, IsReturn, IsSequence, IsTypeOf, IsValue, IsWith, Operands } from "../operands/operand-mapper";
import { OperandObject } from "../operands/operand-object";

export type BinaryCommands = '+' | '-' | '/' | '*' | '<' | '<=' | '>' | '>=' | '==' | '===' | '||' | '&&';

export type BinaryExecutor = {
    [K in BinaryCommands]: (this: any, operand: OperandBinary, context: jsContext) => any;
}

export var binaryCommands: BinaryExecutor = {
    '+': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) + executeSingleOperation.call(this, operand.right, context);
    },
    '-': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) - executeSingleOperation.call(this, operand.right, context);
    },
    '/': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) / executeSingleOperation.call(this, operand.right, context);
    },
    '*': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) * executeSingleOperation.call(this, operand.right, context);
    },
    '<': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) < executeSingleOperation.call(this, operand.right, context);
    },
    '<=': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) <= executeSingleOperation.call(this, operand.right, context);
    },
    '>': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) > executeSingleOperation.call(this, operand.right, context);
    },
    '>=': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) >= executeSingleOperation.call(this, operand.right, context);
    },
    '==': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) == executeSingleOperation.call(this, operand.right, context);
    },
    '===': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) === executeSingleOperation.call(this, operand.right, context);
    },
    '||': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) || executeSingleOperation.call(this, operand.right, context);
    },
    '&&': function (this: any, operand: OperandBinary, context: jsContext) {
        return executeSingleOperation.call(this, operand.left, context) && executeSingleOperation.call(this, operand.right, context);
    }
}

export function generateFunction(operand: OperandFunction, context: jsContext = {}) {
    return function (this: any) {
        let innerContext: jsContext = {};
        for (var i = 0; i < operand.args.length; i++) {
            innerContext[operand.args[i]] = arguments[i];
        }
        const newContext = {
            ...context,
            ...innerContext
        };
        delete newContext['___result'];
        let result = execute.call(this, operand.body, newContext);
        if (result != undefined) {
            return result;
        }
    }
}

export function generateObject(this: any, operand: OperandObject, context: jsContext) {
    let result: { [key: string]: any } = {};
    operand.fields.forEach((x) => {
        result[x.name] = execute.call(this, x.value, context);
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

export function getAssignFunc(this: any, context: jsContext, operands: OperandContext[]) {
    let result = context;
    let latestOperand = operands.pop() as OperandContext;
    for (let i = 0; i < operands.length; i++) {
        if (operands[i].name === 'this') {
            result = this;
        } else result = result[operands[i].name];
    }
    return (val: any) => {
        result[latestOperand.name] = val;
    };
}

export function getContext(this: any, operand: OperandCall | OperandContext, context: any = {}, currentObj: any = {}) {
    let propertyName = IsContext(operand) ? operand.name : operand.func;
    if (typeof currentObj === 'object' && propertyName in currentObj) {
        return currentObj;
    } else if(!!currentObj[propertyName]) {
        return currentObj;
    } else if (propertyName in currentObj) {
        return context;
    } else if (this && this[propertyName] != undefined) {
        return this;
    } else {
        return window;
    }
}

export function executeSingleOperation(this: any, operand: Operands, context: jsContext = {}, currentObj?: any): any {
    if ('___result' in context) return context["___result"];
    if (IsFunction(operand)) {
        return generateFunction(operand, context);
    } else if (IsAssign(operand)) {
        return getAssignFunc.call(this, context, operand.assignTo)(execute.call(this, operand.value, context));
    } else if (IsContext(operand)) {
        if (operand.name === 'this') {
            return this;
        }
        return getContext.call(this, operand, context, currentObj)[operand.name];
    } else if (IsValue(operand)) {
        return operand.value;
    } else if (IsBinary(operand)) {
        return binaryCommands[operand.operation].call(this, operand, context);
    } else if (IsCall(operand)) {
        return getContext.call(this, operand, context, currentObj)[operand.func](...operand.args.map(x => execute.call(this, x, context)));
    } else if (IsObject(operand)) {
        return generateObject.call(this, operand, context);
    } else if (IsWith(operand)) {
        let innerContext = {
            ...context,
            ...(execute.call(this, operand.context, context))
        }
        let result = execute.call(this, operand.body, innerContext);
        for (let name in context) {
            context[name] = innerContext[name];
        }
        return result;
    } else if (IsIf(operand)) {
        if (execute.call(this, operand.condition, context)) {
            return execute.call(this, operand.true, context);
        } else {
            return execute.call(this, operand.false, context);
        }
    } else if (IsSequence(operand)) {
        let result = context;
        for (let i = 0; i < operand.operands.length; i++) {
            result = execute.call(this, operand.operands[i], context, result);
        }
        return result;
    } else if (IsReturn(operand)) {
        context['___result'] = execute.call(this, operand.value, context, currentObj);
        return context['___result'];
    } else if (IsArray(operand)) {
        return operand.values.map(x => execute.call(this, x, context, currentObj));
    } else if (IsNot(operand)) {
        return !execute.call(this, operand.value, context, currentObj);
    } else if (IsTypeOf(operand)) {
        let _res = execute.call(this, operand.value, context, currentObj);
        return typeof _res;
    } else {
        return null;
    }
}

export function execute(this: any, operands: Operands[] | Operands, context: jsContext = {}, currentObj?: any) {
    if ('___result' in context) {
        return context['___result'];
    }
    if (Array.isArray(operands)) {
        let __result = undefined;
        for (var i = 0; i < operands.length; i++) {
            __result = executeSingleOperation.call(this, operands[i], context, currentObj);
            if ('__result' in context) {
                return context['___result'];
            }
        }
        return __result;
    } else {
        return executeSingleOperation.call(this, operands, context, currentObj);
    }
}