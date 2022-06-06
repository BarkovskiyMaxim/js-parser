import { BinaryExecutor } from "../executors/executor";
import { Operands } from "./operand-mapper";

export type OperandBinary = {
    left: Operands,
    right: Operands,
    operation: keyof BinaryExecutor,
    type: 'binary'
}