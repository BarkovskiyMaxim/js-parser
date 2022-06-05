import { jsContext } from "../operands/js-context";
import { OperandBinary } from "../operands/operand-binary";
import { IsAssign, IsBinary, IsContext, IsValue, Operands } from "../operands/operand-mapper";

export type BinaryCommands = '+' | '-' | '/' | '*';

export type BinaryExecutor = {
    [K in BinaryCommands]: (operand: OperandBinary, context: jsContext) => any;
}

function getValue(operand: Operands, context: jsContext): any {
    if (IsContext(operand)) {
        return context[operand.name];
    } else if (IsValue(operand)) {
        return operand.value;
    } else if (IsBinary(operand)) {
        return execute([operand], context);
    }
    return null;
}

export var binaryCommands: BinaryExecutor = {
    '+': (operand: OperandBinary, context: jsContext) => {
        return getValue(operand.left, context) + getValue(operand.right, context);
    },
    '-': (operand: OperandBinary, context: jsContext) => {
        return getValue(operand.left, context) - getValue(operand.right, context);
    },
    '/': (operand: OperandBinary, context: jsContext) => {
        return getValue(operand.left, context) / getValue(operand.right, context);
    },
    '*': (operand: OperandBinary, context: jsContext) => {
        return getValue(operand.left, context) * getValue(operand.right, context);
    }
}

export function execute(operands: Operands[] | Operands, context: jsContext) {
    var ___result = 0;
    if (Array.isArray(operands)) {
        operands.forEach((operand) => {
            if (IsBinary(operand)) {
                ___result = binaryCommands[operand.operation](operand, context)
            } else if(IsAssign(operand)) {
                context[operand.assignTo] = execute(operand.value, context);
            }
        });
    } else {
        if(IsBinary(operands)) {
            ___result = binaryCommands[operands.operation](operands, context)
        }
    }
    return ___result;
}