import { BinaryExecutor } from "../executors/executor";
import { OperandBase } from "./operand-base";
import { Operands } from "./operand-mapper";

export type OperandBinary = OperandBase & {
    left: Operands,
    right: Operands,
    operation: keyof BinaryExecutor,
    type: 'binary'
}