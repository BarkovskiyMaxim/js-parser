import { OperandContext } from "../operands/oparand-context";
import { OperandArray } from "../operands/operand-array";
import { OperandAssign } from "../operands/operand-assign";
import { OperandBinary } from "../operands/operand-binary";
import { OperandCall } from "../operands/operand-call";
import { OperandClass } from "../operands/operand-class";
import { OperandFunction } from "../operands/operand-function";
import { OperandIf } from "../operands/operand-if";
import { IsArray, IsAssign, IsBinary, IsCall, IsClass, IsContext, IsFunction, IsIf, IsNot, IsObject, IsReturn, IsSequence, IsTypeOf, Operands } from "../operands/operand-mapper";
import { OperandNot } from "../operands/operand-not";
import { OperandObject } from "../operands/operand-object";
import { OperandReturn } from "../operands/operand-return";
import { OperandSequence } from "../operands/operand-sequence";
import { OperandTypeOf } from "../operands/operand-typeof";

export class ReplaceVariableProcessor {
    constructor(private _functionArgs: string[] = [], private _replaceName: (variableName: string, existsInFunctionArgs: boolean) => void = (_) => void 0) {
    }

    processFunction(operand: OperandFunction) {
        new ReplaceVariableProcessor([
            ...this._functionArgs,
            ...operand.args,
        ], this._replaceName).process(operand.body);
    }

    replaceName(name: string) {
        this._replaceName(name, this._functionArgs.indexOf(name) !== -1);
    }

    processAssign(operand: OperandAssign) {
        if (typeof operand.assignTo[0].name === 'string') {
            if (operand.new) {
                this._functionArgs.push(operand.assignTo[0].name);
            } else
                this.replaceName(operand.assignTo[0].name);

        } else {
            this.process(operand.assignTo[0].name);
        }
        this.process(operand.value);
    }

    processContext(operand: OperandContext) {
        if (typeof operand.name !== 'string') {
            this.process(operand.name as Operands);
        } else {
            this.replaceName(operand.name);
        }
    }

    processBinary(operand: OperandBinary) {
        this.process(operand.left);
        this.process(operand.right);
    }

    processCall(operand: OperandCall) {
        let func = operand.func;
        if (typeof func !== 'string') {
            this.process(func);
        } else {
            this.replaceName(func);
        }
        operand.args.map(x => this.process(x));
    }

    processObject(operand: OperandObject) {
        operand.fields.forEach((x) => {
            this.process(x.value);
        })
    }

    processIf(operand: OperandIf) {
        this.process(operand.condition);
        this.process(operand.true);
        this.process(operand.false);
    }

    processSequence(operand: OperandSequence) {
        this.process(operand.operands.splice(0, 1))
        operand.operands.forEach((x => {
            if (IsCall(x)) this.process(x.args)
        }))
    }

    processReturn(operand: OperandReturn) {
        this.process(operand.value);
    }

    processArray(operand: OperandArray) {
        operand.values.forEach(x => this.process(x));
    }

    processNot(operand: OperandNot) {
        this.process(operand.value);
    }

    processTypeOf(operand: OperandTypeOf) {
        this.process(operand.value);
    }

    processClass(operand: OperandClass) {
        let ctorClone = <OperandSequence>{
            operands: [...operand.ctor.operands],
            type: 'sequence'
        };
        let callOperand = ctorClone.operands.pop() as OperandCall;
        this.process(ctorClone);
        callOperand.args.forEach(x => this.process(x));
    }

    processSignleOperation(operand: Operands): void {
        if (IsFunction(operand)) this.processFunction(operand);
        if (IsAssign(operand)) this.processAssign(operand);
        if (IsContext(operand)) this.processContext(operand);
        if (IsBinary(operand)) this.processBinary(operand);
        if (IsCall(operand)) this.processCall(operand);
        if (IsObject(operand)) this.processObject(operand);
        if (IsIf(operand)) this.processIf(operand);
        if (IsSequence(operand)) this.processSequence(operand);
        if (IsReturn(operand)) this.processReturn(operand);
        if (IsArray(operand)) this.processArray(operand);
        if (IsNot(operand)) this.processNot(operand);
        if (IsTypeOf(operand)) this.processTypeOf(operand);
        if (IsClass(operand)) this.processClass(operand);
    }

    process(operands: Operands[] | Operands) {
        if (Array.isArray(operands)) {
            for (var i = 0; i < operands.length; i++) {
                this.processSignleOperation(operands[i]);
            }
        } else {
            return this.processSignleOperation(operands);
        }
    }
}
