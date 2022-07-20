import { BinaryExecutor } from "../executors/executor";
import { BaseOperand } from "./baseOperand";
import { Operands } from "./operand-mapper";

export type OperandBinary = BaseOperand & {
    left: Operands,
    right: Operands,
    operation: keyof BinaryExecutor,
    type: 'binary'
}