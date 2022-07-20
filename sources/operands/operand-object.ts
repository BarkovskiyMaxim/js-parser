import { BaseOperand } from "./baseOperand"
import { Operands } from "./operand-mapper"

type ObjectFields = { 
    name: string,
    value: Operands
}

export type OperandObject = BaseOperand & {
    type: 'obj',
    fields: ObjectFields[]
}