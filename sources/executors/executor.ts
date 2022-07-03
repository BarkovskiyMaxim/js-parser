import { jsContext } from "../operands/js-context";
import { OperandContext } from "../operands/oparand-context";
import { OperandArray } from "../operands/operand-array";
import { OperandAssign } from "../operands/operand-assign";
import { OperandBinary } from "../operands/operand-binary";
import { OperandCall } from "../operands/operand-call";
import { OperandClass } from "../operands/operand-class";
import { OperandFunction } from "../operands/operand-function";
import { OperandIf } from "../operands/operand-if";
import { IsArray, IsAssign, IsBinary, IsCall, IsClass, IsContext, IsFunction, IsIf, IsNot, IsObject, IsReturn, IsSequence, IsTypeOf, IsValue, IsWith, Operands } from "../operands/operand-mapper";
import { OperandNot } from "../operands/operand-not";
import { OperandObject } from "../operands/operand-object";
import { OperandReturn } from "../operands/operand-return";
import { OperandSequence } from "../operands/operand-sequence";
import { OperandTypeOf } from "../operands/operand-typeof";
import { OperandValue } from "../operands/operand-value";
import { OperandWith } from "../operands/operand-with";

export type BinaryCommands = '+' | '-' | '/' | '*' | '<' | '<=' | '>' | '>=' | '==' | '===' | '||' | '&&' | '!=' | '!==';

export type BinaryExecutor = {
    [K in BinaryCommands]: (operand: OperandBinary, context: jsContext[]) => any;
}

export type Settings = {
    enabledWindowOperations: {
        [key: string]: true
    }
    disabledOperations: {
        [K in Operands['type']]?: true;
    }
}

export class Evaluator {
    isReturnCalled: boolean = false;
    ___result = null;
    constructor(private _thisContext: any, private _settings: Settings = {
        enabledWindowOperations: {},
        disabledOperations: {}
    }) {
    }
    private _getPropertyName(operand: OperandCall | OperandContext | OperandClass) {
        if (IsCall(operand)) return operand.func;
        if (IsContext(operand)) return operand.name;
        if (IsClass(operand)) return operand.ctor;
    }

    private _checkWindowOperation(context: any, name: string) {
        if (context === window && (!this._settings.enabledWindowOperations[name as any]) && !!window[name as any]) {
            throw new Error(`${name} is not available from window`)
        }
    }

    private _throwOperationUnavailableError(type: Operands['type']) {
        throw Error(`Operator ${type} is unavailable`);
    }
    binaryCommands: BinaryExecutor = {
        '+': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) + this.evalSingleOperation(operand.right, context);
        },
        '-': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) - this.evalSingleOperation(operand.right, context);
        },
        '/': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) / this.evalSingleOperation(operand.right, context);
        },
        '*': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) * this.evalSingleOperation(operand.right, context);
        },
        '<': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) < this.evalSingleOperation(operand.right, context);
        },
        '<=': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) <= this.evalSingleOperation(operand.right, context);
        },
        '>': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) > this.evalSingleOperation(operand.right, context);
        },
        '>=': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) >= this.evalSingleOperation(operand.right, context);
        },
        '==': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) == this.evalSingleOperation(operand.right, context);
        },
        '===': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) === this.evalSingleOperation(operand.right, context);
        },
        '||': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) || this.evalSingleOperation(operand.right, context);
        },
        '&&': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) && this.evalSingleOperation(operand.right, context);
        },
        '!=': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) != this.evalSingleOperation(operand.right, context);
        },
        '!==': (operand: OperandBinary, context: jsContext[]) => {
            return this.evalSingleOperation(operand.left, context) !== this.evalSingleOperation(operand.right, context);
        }
    }

    evalFunction(operand: OperandFunction, context: jsContext[] = [{}]) {
        let cloneContext = [...context];
        let self = this;
        return function (this: any) {
            let innerContext: jsContext = {};
            for (var i = 0; i < operand.args.length; i++) {
                innerContext[operand.args[i]] = arguments[i];
            }
            return new Evaluator(this, self._settings)._eval(operand.body, [...cloneContext, innerContext]);
        }
    }

    evalAssign(operand: OperandAssign, context: jsContext[]) {
        return this.getAssignFunc(context, operand.assignTo)(this._eval(operand.value, context));
    }

    evalContext(operand: OperandContext, context: jsContext[], _currentContext: any) {
        if (operand.name === 'this') return this._thisContext;
        let name = operand.name;
        if (typeof name !== 'string') {
            name = this._eval(operand.name as Operands, context);
        }
        let currentContext = _currentContext !== undefined ? _currentContext : this.getContext(operand, context);
        this._checkWindowOperation(currentContext, name as string);
        if(currentContext === undefined) return undefined;
        return currentContext[name as string];
    }

    evalValue(operand: OperandValue, context: jsContext[]) {
        return operand.value;
    }

    evalBinary(operand: OperandBinary, context: jsContext[]) {
        return this.binaryCommands[operand.operation](operand, context);
    }

    evalCall(operand: OperandCall, context: jsContext[], _currentContext: jsContext) {
        let func = operand.func;
        if (typeof func !== 'string') {
            func = this._eval(func, context);
        }
        if (typeof func === 'function')
            return (func as Function)(...operand.args.map(x => this._eval(x, context)));
        let currentContext = _currentContext !== undefined ? _currentContext : this.getContext(operand, context);
        this._checkWindowOperation(currentContext, func as string);
        return currentContext[func as string](...operand.args.map(x => this._eval(x, context)));
    }

    evalObject(operand: OperandObject, context: jsContext[]) {
        let result: { [key: string]: any } = {};
        operand.fields.forEach((x) => {
            result[x.name] = this._eval(x.value, context);
        })
        return result;
    }

    evalWith(operand: OperandWith, context: jsContext[]) {
        let result = this._eval(operand.body, [
            ...context,
            this._eval(operand.context, context)
        ]);
        return result;
    }

    evalIf(operand: OperandIf, context: jsContext[]) {
        if (this._eval(operand.condition, context)) {
            return this._eval(operand.true, context);
        } else {
            return this._eval(operand.false, context);
        }
    }

    evalSequence(operand: OperandSequence, context: jsContext[]) {
        let result = undefined;
        for (let i = 0; i < operand.operands.length; i++) {
            result = this._eval(operand.operands[i], context, result);
            if(result === undefined && i < operand.operands.length - 1) {
                throw new Error(`Property ${JSON.stringify(operand.operands[i+1])} doesn't exists in context after evaluate ${JSON.stringify(operand.operands)}`)
            }
        }
        return result;
    }

    evalReturn(operand: OperandReturn, context: jsContext[]) {
        this.___result = this._eval(operand.value, context);
        this.isReturnCalled = true;
        return this.___result;
    }

    evalArray(operand: OperandArray, context: jsContext[]) {
        return operand.values.map(x => this._eval(x, context));
    }

    evalNot(operand: OperandNot, context: jsContext[]) {
        return !this._eval(operand.value, context);
    }

    evalTypeof(operand: OperandTypeOf, context: jsContext[]) {
        let _res = this._eval(operand.value, context);
        return typeof _res;
    }

    evalClass(operand: OperandClass, context: jsContext[]) {
        let ctorClone = <OperandSequence>{
            operands: [...operand.ctor.operands],
            type: 'sequence'
        };
        let callOperand = ctorClone.operands.pop() as OperandCall;
        let result = this._eval(ctorClone, context);
        let func = callOperand.func;
        if (typeof func !== 'string') {
            func = this._eval(func, context);
        }
        let signature = result[func as string];
        return new signature(...callOperand.args.map(x => this._eval(x, context)));
    }

    getAssignFunc(context: jsContext[], operands: OperandContext[]) {
        let result = this.getContext(operands[0], context) || context[context.length - 1];
        let latestOperand = operands[operands.length - 1] as OperandContext;
        for (let i = 0; i < operands.length - 1; i++) {
            if (operands[i].name === 'this') result = this._thisContext;
            else if (typeof operands[i].name === 'string') result = result[operands[i].name as string];
            else result = result[this._eval(operands[i].name as Operands, context) as string]
        }
        return (val: any) => {
            if (typeof latestOperand.name === 'string') result[latestOperand.name] = val;
            else result[this._eval(latestOperand.name as Operands, context) as string]
        };
    }



    getContext(operand: OperandCall | OperandContext | OperandClass, context: any[]) {
        let propertyName = this._getPropertyName(operand);
        if (typeof propertyName !== "string") return context[context.length - 1];
        for (var i = context.length - 1; i >= 0; i--) {
            if (typeof context[i] === 'object' && propertyName in context[i]) {
                return context[i]
            } else if (!!context[i][propertyName]) {
                return context[i];
            }
        }
    }

    evalSingleOperation(operand: Operands, context: jsContext[], _currentContext?: any): any {
        if (this.isReturnCalled) return this.___result;
        if (this._settings.disabledOperations[operand.type]) this._throwOperationUnavailableError(operand.type);
        if (IsFunction(operand)) return this.evalFunction(operand, context);
        if (IsAssign(operand)) return this.evalAssign(operand, context);
        if (IsContext(operand)) return this.evalContext(operand, context, _currentContext);
        if (IsValue(operand)) return this.evalValue(operand, context);
        if (IsBinary(operand)) return this.evalBinary(operand, context);
        if (IsCall(operand)) return this.evalCall(operand, context, _currentContext);
        if (IsObject(operand)) return this.evalObject(operand, context);
        if (IsWith(operand)) return this.evalWith(operand, context);
        if (IsIf(operand)) return this.evalIf(operand, context);
        if (IsSequence(operand)) return this.evalSequence(operand, context);
        if (IsReturn(operand)) return this.evalReturn(operand, context);
        if (IsArray(operand)) return this.evalArray(operand, context);
        if (IsNot(operand)) return this.evalNot(operand, context);
        if (IsTypeOf(operand)) return this.evalTypeof(operand, context);
        if (IsClass(operand)) return this.evalClass(operand, context);
    }

    _eval(operands: Operands[] | Operands, context: any[] = [{}], _currentContext?: any) {
        if (this.isReturnCalled) {
            return this.___result;
        }
        if (Array.isArray(operands)) {
            let __result = undefined;
            for (var i = 0; i < operands.length; i++) {
                __result = this.evalSingleOperation(operands[i], context, _currentContext);
                if (this.isReturnCalled) {
                    return this.___result;
                }
            }
            return __result;
        } else {
            return this.evalSingleOperation(operands, context, _currentContext);
        }
    }
}

export function execute(this: any, operands: Operands[] | Operands, context: jsContext = {}, settings: Settings = {
    disabledOperations: {},
    enabledWindowOperations: {},
}) {
    return new Evaluator(this, settings)._eval(operands, [window, context]);
}

export function _execute(this: any, operands: Operands[] | Operands, context: any[] = [window, {}], settings: Settings = {
    disabledOperations: {},
    enabledWindowOperations: {},
}) {
    return new Evaluator(this, settings)._eval(operands, context)
}