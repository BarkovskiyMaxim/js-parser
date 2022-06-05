import { execute } from '../sources/executors/binaryExecutor';
import { OperandAssign } from '../sources/operands/operand-assign';
import jsParser from '../sources/parser/js-parser';

test("binary operator number test", () => {
    expect(execute(jsParser.parse("1 + 2"), {})).toEqual(3);

    expect(execute(jsParser.parse("3 * 2"), {})).toEqual(6);

    expect(execute(jsParser.parse("10 / 2"), {})).toEqual(5);

    expect(execute(jsParser.parse("10 - 2"), {})).toEqual(8);
})

test("binary operator string test", () => {
    expect(execute(jsParser.parse("'1' + '2'"), {})).toEqual('12');
})


test("binary operator multiple operations test", () => {
    expect(execute(jsParser.parse("5 * 10 + 'px'"), {})).toEqual('50px');
})


test("binary operator context test", () => {
    expect(execute(jsParser.parse("test + 2"), {
        test: 1
    })).toEqual(3);
})

test("binary operator assign test", () => {
    const str = "var myValue = test + 2;";
    const operand = jsParser.parse(str) as OperandAssign[];
    expect(Array.isArray(operand));
    expect(operand[0].type).toEqual('assign');
    expect(operand[0].assignTo).toEqual('myValue');
    expect(operand[0].value.type).toEqual('binary');
    const context = { test: 1 };
    execute(operand, context);
    expect(context).toEqual({
        test: 1,
        myValue: 3
    });
})
