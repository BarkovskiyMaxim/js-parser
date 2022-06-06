import { Operands } from "./operand-mapper"

type ObjectFields = { 
    name: string,
    value: Operands
}

export type OperandObject = {
    type: 'obj',
    fields: ObjectFields[]
}