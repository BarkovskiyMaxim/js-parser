import { jsContext } from "../operands/js-context";
import { OperandContext } from "../operands/oparand-context";
import { OperandBinary } from "../operands/operand-binary";
import { OperandCall } from "../operands/operand-call";
import { OperandFunction } from "../operands/operand-function";
import { IsArray, IsAssign, IsBinary, IsCall, IsContext, IsFunction, IsIf, IsNot, IsObject, IsReturn, IsSequence, IsTypeOf, IsValue, IsWith, Operands } from "../operands/operand-mapper";
import { OperandObject } from "../operands/operand-object";

export type BinaryCommands = '+' | '-' | '/' | '*' | '<' | '<=' | '>' | '>=' | '==' | '===' | '||' | '&&';

export type BinaryExecutor = {
    [K in BinaryCommands]: (operand: OperandBinary, context: jsContext[]) => any;
}

export class Evaluator {
    thisContext: any;
    isReturnCalled: boolean = false;
    ___result = null;
    constructor(thisContext: any) {
        this.thisContext = thisContext;
    }
    binaryCommands: BinaryExecutor = {
        '+': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) + this.executeSingleOperation(operand.right, context);
        },
        '-': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) - this.executeSingleOperation(operand.right, context);
        },
        '/': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) / this.executeSingleOperation(operand.right, context);
        },
        '*': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) * this.executeSingleOperation(operand.right, context);
        },
        '<': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) < this.executeSingleOperation(operand.right, context);
        },
        '<=': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) <= this.executeSingleOperation(operand.right, context);
        },
        '>': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) > this.executeSingleOperation(operand.right, context);
        },
        '>=': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) >= this.executeSingleOperation(operand.right, context);
        },
        '==': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) == this.executeSingleOperation(operand.right, context);
        },
        '===': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) === this.executeSingleOperation(operand.right, context);
        },
        '||': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) || this.executeSingleOperation(operand.right, context);
        },
        '&&': (operand: OperandBinary, context: jsContext[]) => {
            return this.executeSingleOperation(operand.left, context) && this.executeSingleOperation(operand.right, context);
        }
    }

    generateFunction(operand: OperandFunction, context: jsContext[] = [{}]) {
        return function (this: any) {
            let innerContext: jsContext = {};
            for (var i = 0; i < operand.args.length; i++) {
                innerContext[operand.args[i]] = arguments[i];
            }
            return new Evaluator(this)._execute(operand.body, [...context, innerContext]);
        }
    }

    generateObject(operand: OperandObject, context: jsContext[]) {
        let result: { [key: string]: any } = {};
        operand.fields.forEach((x) => {
            result[x.name] = this._execute(x.value, context);
        })
        return result;
    }

    getAssignFunc(context: jsContext[], operands: OperandContext[]) {
        let result = this.getContext(operands[0], context) || context[context.length - 1];
        let latestOperand = operands.pop() as OperandContext;
        for (let i = 0; i < operands.length; i++) {
            if (operands[i].name === 'this') result = this.thisContext;
            else if (typeof operands[i].name === 'string') result = result[operands[i].name as string];
            else result = result[this._execute(operands[i].name as Operands, context) as string]
        }
        return (val: any) => {
            if (typeof latestOperand.name === 'string') result[latestOperand.name] = val;
            else result[this._execute(latestOperand.name as Operands, context) as string]
        };
    }

    getContext(operand: OperandCall | OperandContext, context: any[]) {
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

    executeSingleOperation(operand: Operands, context: jsContext[]): any {
        if (this.isReturnCalled)
            return this.___result;
        if (IsFunction(operand)) {
            return this.generateFunction(operand, context);
        } else if (IsAssign(operand)) {
            return this.getAssignFunc(context, operand.assignTo)(this._execute(operand.value, context));
        } else if (IsContext(operand)) {
            if (operand.name === 'this') return this.thisContext;
            let name = operand.name;
            if (typeof name !== 'string') {
                name = this._execute(operand.name as Operands, context);
            }
            let currentContext = this.getContext(operand, context); 
            return currentContext && currentContext[name as string];
        } else if (IsValue(operand)) {
            return operand.value;
        } else if (IsBinary(operand)) {
            return this.binaryCommands[operand.operation](operand, context);
        } else if (IsCall(operand)) {
            let func = operand.func;
            if (typeof func !== 'string') {
                func = this._execute(func, context);
            }
            return this.getContext(operand, context)[func as string](...operand.args.map(x => this._execute(x, context)));
        } else if (IsObject(operand)) {
            return this.generateObject(operand, context);
        } else if (IsWith(operand)) {
            let result = this._execute(operand.body, [
                ...context,
                this._execute(operand.context, context)
            ]);
            return result;
        } else if (IsIf(operand)) {
            if (this._execute(operand.condition, context)) {
                return this._execute(operand.true, context);
            } else {
                return this._execute(operand.false, context);
            }
        } else if (IsSequence(operand)) {
            let newContext = [...context];
            for (let i = 0; i < operand.operands.length; i++) {
                newContext.push(this._execute(operand.operands[i], newContext));
            }
            return newContext[newContext.length - 1];
        } else if (IsReturn(operand)) {
            this.___result = this._execute(operand.value, context);
            this.isReturnCalled = true;
            return this.___result;
        } else if (IsArray(operand)) {
            return operand.values.map(x => this._execute(x, context));
        } else if (IsNot(operand)) {
            return !this._execute(operand.value, context);
        } else if (IsTypeOf(operand)) {
            let _res = this._execute(operand.value, context);
            return typeof _res;
        } else {
            return null;
        }
    }

    _execute(operands: Operands[] | Operands, context: any[] = [{}]) {
        if (this.isReturnCalled) {
            return this.___result;
        }
        if (Array.isArray(operands)) {
            let __result = undefined;
            for (var i = 0; i < operands.length; i++) {
                __result = this.executeSingleOperation(operands[i], context);
                if (this.isReturnCalled) {
                    return this.___result;
                }
            }
            return __result;
        } else {
            return this.executeSingleOperation(operands, context);
        }
    }
}

export function execute(this: any, operands: Operands[] | Operands, context: jsContext = {}) {
    return new Evaluator(this)._execute(operands, [window, context]);
}

export function _execute(this: any, operands: Operands[] | Operands, context: any[] = [{}]) {
    return new Evaluator(this)._execute(operands, context)
}