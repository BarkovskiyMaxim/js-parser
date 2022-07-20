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
import { parse } from "../parser/js-parser";
import { Serializer } from "./serializer";

export class ReplaceVariableProcessor {
    constructor(private _functionArgs: string[] = [], private _replaceName: (variableName: string, existsInFunctionArgs: boolean) => string = (_) => _) {
    }

    processFunction(operand: OperandFunction) {
        new ReplaceVariableProcessor([
            ...this._functionArgs,
            ...operand.args,
        ], this._replaceName)._process(operand.body);
    }

    replaceName(name: string) {
        return this._replaceName(name, this._functionArgs.indexOf(name) !== -1);
    }

    processAssign(operand: OperandAssign) {
        if (typeof operand.assignTo[0].name === 'string') {
            if (operand.new) {
                this._functionArgs.push(operand.assignTo[0].name);
            } else
                operand.assignTo[0].name = this.replaceName(operand.assignTo[0].name);

        } else {
            this._process(operand.assignTo[0].name);
        }
        this._process(operand.value);
    }

    processContext(operand: OperandContext) {
        if (typeof operand.name !== 'string') {
            this._process(operand.name as Operands);
        } else {
            operand.name = this.replaceName(operand.name);
        }
    }

    processBinary(operand: OperandBinary) {
        this._process(operand.left);
        this._process(operand.right);
    }

    processCall(operand: OperandCall) {
        let func = operand.func;
        if (typeof func !== 'string') {
            this._process(func);
        } else {
            operand.func = this.replaceName(func);
        }
        operand.args.map(x => this._process(x));
    }

    processObject(operand: OperandObject) {
        operand.fields.forEach((x) => {
            this._process(x.value);
        })
    }

    processIf(operand: OperandIf) {
        this._process(operand.condition);
        this._process(operand.true);
        this._process(operand.false);
    }

    processSequence(operand: OperandSequence) {
        this._process(operand.operands[0]);
        for(var i = 1; i < operand.operands.length; i++) {
            if (IsCall(operand.operands[i])) this._process((operand.operands[i] as OperandCall).args)
            else if (operand.operands[i].enumerable) this._process(operand.operands[i]);
        };
    }

    processReturn(operand: OperandReturn) {
        this._process(operand.value);
    }

    processArray(operand: OperandArray) {
        operand.values.forEach(x => this._process(x));
    }

    processNot(operand: OperandNot) {
        this._process(operand.value);
    }

    processTypeOf(operand: OperandTypeOf) {
        this._process(operand.value);
    }

    processClass(operand: OperandClass) {
        let ctorClone = <OperandSequence>{
            operands: [...operand.ctor.operands],
            type: 'sequence'
        };
        let callOperand = ctorClone.operands.pop() as OperandCall;
        this._process(ctorClone);
        callOperand.args.forEach(x => this._process(x));
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

    _process(operands: Operands[] | Operands) {
        if (Array.isArray(operands)) {
            for (var i = 0; i < operands.length; i++) {
                this.processSignleOperation(operands[i]);
            }
        } else {
            return this.processSignleOperation(operands);
        }
    }

    process(jscode: string): string {
        var operands = parse(jscode);
        this._process(operands);
        return new Serializer().serialize(operands)
    }
}
