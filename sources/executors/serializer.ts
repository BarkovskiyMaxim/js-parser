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

export class Serializer {

    serializeFunction(operand: OperandFunction) {
        return `function(${operand.args.join(',')}){ ${this.serialize(operand.body)} }`;
    }

    serializeAssign(operand: OperandAssign) {
        var prefix = operand.new ? 'var ' : '';
        return prefix + this.serialize(operand.assignTo) + ' = ' + this.serialize(operand.value);
    }

    serializeContext(operand: OperandContext) {
        if (typeof operand.name === 'string') {
            return operand.name;
        }
        return this.serialize(operand.name);
    }

    serializeValue(operand: OperandValue) {
        if (typeof operand.value === 'string')
            return `'${operand.value}'`;
        if(operand.value === null)
            return 'null';
        if(operand.value === undefined)
            return 'undefined';
        return operand.value
    }

    serializeBinary(operand: OperandBinary) {
        return [this.serialize(operand.left), operand.operation, this.serialize(operand.right)].join(' ');
    }

    serializeCall(operand: OperandCall) {
        let func = operand.func;
        if (typeof func !== 'string') {
            func = this.serialize(func);
        }
        return `${func}(${operand.args.map(x => this.serialize(x)).join(',')})`;
    }

    serializeObject(operand: OperandObject) {
        return `{${operand.fields.map(x => { return `'${x.name}':${this.serialize(x.value)}` }).join(',')}}`;
    }

    serializeWith(operand: OperandWith) {
        return `with(${this.serialize(operand.context)}){ ${this.serialize(operand.body)} })`
    }

    serializeIf(operand: OperandIf) {
        if(operand.ternar) {
            return `${this.serialize(operand.condition)} ? ${this.serialize(operand.true)} : ${this.serialize(operand.false)}`
        }
        let result = `if(${this.serialize(operand.condition)}){ ${this.serialize(operand.true)} }`;
        if(operand.false.length > 0) {
            result += `else { ${this.serialize(operand.false)} }`
        };
        return result;
    }

    serializeSequence(operand: OperandSequence) {
        let result = this.serialize(operand.operands[0]);
        for(var i = 1; i < operand.operands.length; i++) {
            let currentOperand = this.serialize(operand.operands[i]);
            if(!operand.operands[i].enumerable) {
                result += '.' + currentOperand;
            } else {
                result += currentOperand;
            }
        } 
        return result;
    }

    serializeReturn(operand: OperandReturn) {
       return `return ${this.serialize(operand.value)}`;
    }

    serialzeArray(operand: OperandArray) {
        return `[${operand.values.map(x => this.serialize(x))}]`;
    }

    serializeNot(operand: OperandNot) {
        return `!${this.serialize(operand.value)}`;
    }

    serializeTypeof(operand: OperandTypeOf) {
        return `typeof ${this.serialize(operand.value)}`;
    }

    serializeClass(operand: OperandClass) {
        return `new ${this.serialize(operand.ctor)}`
    }

    serializeSingle(operand: Operands): string {
        let result = '';
        if (IsFunction(operand)) result = this.serializeFunction(operand);
        if (IsAssign(operand)) result = this.serializeAssign(operand);
        if (IsContext(operand)) result = this.serializeContext(operand);
        if (IsValue(operand)) result = this.serializeValue(operand);
        if (IsBinary(operand)) result = this.serializeBinary(operand);
        if (IsCall(operand)) result = this.serializeCall(operand);
        if (IsObject(operand)) result = this.serializeObject(operand);
        if (IsWith(operand)) result = this.serializeWith(operand);
        if (IsIf(operand)) result = this.serializeIf(operand);
        if (IsSequence(operand)) result = this.serializeSequence(operand);
        if (IsReturn(operand)) result = this.serializeReturn(operand);
        if (IsArray(operand)) result = this.serialzeArray(operand);
        if (IsNot(operand)) result = this.serializeNot(operand);
        if (IsTypeOf(operand)) result = this.serializeTypeof(operand);
        if (IsClass(operand)) result = this.serializeClass(operand);
        if(operand.braced) return `(${result})`;
        if(operand.enumerable) return `[${result}]`;
        return result;
    }

    serialize(operands: Operands[] | Operands) {
        if (Array.isArray(operands)) {
            let __result: string[] = [];
            for (var i = 0; i < operands.length; i++) {
                __result.push(this.serializeSingle(operands[i]));
            }
            return __result.join(';');
        } else {
            return this.serializeSingle(operands);
        }
    }
}