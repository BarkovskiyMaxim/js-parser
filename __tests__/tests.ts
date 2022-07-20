import { execute, _execute } from '../sources/executors/executor';
import { ReplaceVariableProcessor } from '../sources/executors/processor';
import { OperandContext } from '../sources/operands/oparand-context';
import { OperandAssign } from '../sources/operands/operand-assign';
import { OperandBinary } from '../sources/operands/operand-binary';
import { OperandFunction } from '../sources/operands/operand-function';
import { OperandReturn } from '../sources/operands/operand-return';
import jsParser from '../sources/parser/js-parser';

test("binary operator number test", () => {
    expect(_execute(jsParser.parse("return 1 + 2"), [{}])).toEqual(3);

    expect(_execute(jsParser.parse("return 3 * 2"), [{}])).toEqual(6);

    expect(_execute(jsParser.parse("return 10 / 2"), [{}])).toEqual(5);

    expect(_execute(jsParser.parse("return 10 - 2"), [{}])).toEqual(8);
})

test("binary operator string test", () => {
    expect(_execute(jsParser.parse("return '1' + '2'"), [{}])).toEqual('12');
})


test("binary operator multiple operations test", () => {
    expect(_execute(jsParser.parse("return 5 * 10 + 'px'"), [{}])).toEqual('50px');
})


test("binary operator context test", () => {
    expect(_execute(jsParser.parse("return test + 2"), [{
        test: 1
    }])).toEqual(3);
})

test("binary operator assign test", () => {
    const str = "var myValue = test + 2;";
    const operand = jsParser.parse(str) as OperandAssign[];
    expect(Array.isArray(operand));
    expect(operand[0].type).toEqual('assign');
    expect(operand[0].assignTo).toEqual([{ 'name': 'myValue', 'type': 'context' }]);
    expect(operand[0].value.type).toEqual('binary');
    const context = { test: 1 };
    _execute(operand, [context]);
    expect(context).toEqual({
        test: 1,
        myValue: 3
    });
})

test('function test', () => {
    const str = `
        function(testa, testb) {
           return testa + testb; 
        }
    `
    const func = _execute(jsParser.parse(str))
    expect(func.apply(this, [1, 2])).toEqual(3);
})

test('function with assing test', () => {
    const str = `
        function(testa, testb) {
            var c = testa + testb; 
            return c * 10; 
        }
    `
    const func = _execute(jsParser.parse(str))
    expect(func.apply(this, [1, 2])).toEqual(30);
})

test("binary condition operator context test", () => {
    expect(_execute(jsParser.parse("return test > 2"), [{
        test: 1
    }])).toEqual(false);

    expect(_execute(jsParser.parse("return test > 2"), [{
        test: 3
    }])).toEqual(true);
})

test("call function test", () => {
    expect(_execute(jsParser.parse("return test(5) + 2"), [{
        test: (num: number) => num
    }])).toEqual(7);

    expect(_execute(jsParser.parse("return test() > 2"), [{
        test: () => 0
    }])).toEqual(false);
})

test("object test", () => {
    expect(_execute(jsParser.parse("return test({ a: 3, b: 4 })"), [{
        test: (obj: { a: number, b: number }) => obj.a + obj.b
    }])).toEqual(7);
})

test('$name test', () => {
    expect(_execute(jsParser.parse("function($data, $context){ return $data + $context; }")).apply(this, [1, 2])).toEqual(3);
})

test('with operator test', () => {
    expect(_execute(jsParser.parse(`
            var a = 0;
            with($context) { 
                a = $data;
            }
            return a;
            `
    ), [{ $context: { $data: 3 } }])).toEqual(3);

    expect(_execute(jsParser.parse(`
            function($context) {
                var a = 0;
                with($context) {
                    a = $data;
                }
                return a;
            }
    `)).apply(this, [{ $data: 3 }])).toEqual(3);
});

test('if/else operator test', () => {
    let funcBody = `
    var result = 0;
    if(a > 0) {
        result = 1;
    } else {
        result = 2;
    }
    return result;
`
    expect(_execute(jsParser.parse(funcBody), [{ a: 2 }])).toEqual(1);
    expect(_execute(jsParser.parse(funcBody), [{ a: -2 }])).toEqual(2);
})

test('if/else/if operator test', () => {
    const funcBody = `
    var result = 0;
    if(a > 0) {
        result = 1;
    } else if(a === 0) {
        result = 2;
    } else {
        result = 3;
    }
    return result;
`
    expect(_execute(jsParser.parse(funcBody), [{ a: 2 }])).toEqual(1);
    expect(_execute(jsParser.parse(funcBody), [{ a: 0 }])).toEqual(2);
    expect(_execute(jsParser.parse(funcBody), [{ a: -2 }])).toEqual(3);
})

test('ternary operator test', () => {
    const funcBody = `
    var result = a > 0 ? 1 : a === 0 ? 2 : 3;
    return result;
    `;

    expect(_execute(jsParser.parse(funcBody), [{ a: 2 }])).toEqual(1);
    expect(_execute(jsParser.parse(funcBody), [{ a: 0 }])).toEqual(2);
    expect(_execute(jsParser.parse(funcBody), [{ a: -2 }])).toEqual(3);
})

test('|| operator test', () => {
    const funcBody = `
    var a = b || 1;
    return a;
    `;

    expect(_execute(jsParser.parse(funcBody), [{ b: 0 }])).toEqual(1);
    expect(_execute(jsParser.parse(funcBody), [{ b: 2 }])).toEqual(2);
})

test('empty object test', () => {
    const funcBody = `
    var a = {};
    return a;
    `;

    expect(_execute(jsParser.parse(funcBody), [{}])).toEqual({});
})

test('object with single quote', () => {
    const funcBody = `
    var a = {'test': 'test'};
    return a;
    `;

    expect(_execute(jsParser.parse(funcBody), [{}])).toEqual({ 'test': 'test' });
})

test('object with function test', () => {
    const funcBody = `
    var a = { 
        test: 'test',
        func: () => {
            return 'a';
        }
    };
    return a;
    `
    const testRes = _execute(jsParser.parse(funcBody), [{}]) as any;
    expect(testRes['func']()).toEqual('a');
    expect(testRes['test']).toEqual('test');
})

test('return object test', () => {
    const funcBody = `
    return { 
        test: 'test',
        func: () => {
            return 'a';
        }
    };
    `
    const testRes = _execute(jsParser.parse(funcBody), [{}]) as any;
    expect(testRes['func']()).toEqual('a');
    expect(testRes['test']).toEqual('test');
})

test('use variable with point test', () => {
    const funcBody = `
        return 1 + a.b;
    `;
    expect(_execute(jsParser.parse(funcBody), [{ a: { b: 3 } }])).toEqual(4);
})

test('assign to object property test', () => {
    const funcBody = `
        var a = { b: 0 };
        a.b = 3;
        return a;
    `;
    expect(_execute(jsParser.parse(funcBody))).toEqual({ b: 3 });
})

test('return without EOL', () => {
    const funcBody = `
        return { a: 3 }
    `;
    expect(_execute(jsParser.parse(funcBody))).toEqual({ a: 3 });
})

test('call functions with point', () => {
    const funcBody = `
        return 'a.b.c'.split('.').join(',');
    `
    const operands = jsParser.parse(funcBody);
    expect(_execute(operands)).toEqual('a,b,c');
})


test('call functions with point and context parameter', () => {
    const funcBody = `
        return 'a.b.c'.split(a).join(b);
    `
    const operands = jsParser.parse(funcBody);
    expect(_execute(operands, [{ a: '.', b: ',' }])).toEqual('a,b,c');
})

test('parse big function', () => {
    const func = `function($context, $element) { 
        with($context) {
            with($data||{}) {
                return {
                    'checkedValue':function(){
                        return $data 
                    },
                    'checked':function(){
                        return $parent.currentTheme 
                    },
                    'attr':function(){
                        return {
                            'id':$data.split('.').join('')
                        } 
                    },'_ko_property_writers':function(){
                        return {
                            'checked':function(_z){
                                Object($parent).currentTheme=_z
                            } 
                        } 
                    }
                }
            }
        } 
    }`;
    expect(!!jsParser.parse(func)).toEqual(true);
})

test('return from inner context', () => {
    const funcBody = `
        if(a > 0) {
            return '1';
        } else {
            return '2';
        }
    `
    const operands = jsParser.parse(funcBody);
    expect(_execute(operands, [{ a: 1 }])).toEqual('1');
})

test('closure functional test', () => {
    const funcBody = `
        return () => {
            return a;
        }
    `
    const operands = jsParser.parse(funcBody);
    expect(_execute(operands, [{ a: 1 }])()).toEqual(1);
})

test('array operand test', () => {
    const funcBody = `
        return [a,b,3,4,'w']
    `
    expect(_execute(jsParser.parse(funcBody), [{ a: 1, b: 2 }])).toEqual(
        [1, 2, 3, 4, 'w']
    )
})

test('! operand test', () => {
    let funcBody = `
        return !a
    `
    expect(_execute(jsParser.parse(funcBody), [{ a: true }])).toEqual(false)

    funcBody = `
    return !a || b;
`
    expect(_execute(jsParser.parse(funcBody), [{ a: true, b: 3 }])).toEqual(3)
})

test('function case', () => {
    const func = `function($context, $element) { 
        with($context){
            with($data||{}){
                return{
                    'visible':function(){
                        return (!$data.designMode || designMode()) 
                    },
                    'cssArray':function(){
                        return [$data.rootStyle,{
                            'dx-rtl':$data.rtl,
                            'dx-ltr':!$data.rtl
                        }] 
                    }
                }
            }
        } 
    }`;

    expect(!!jsParser.parse(func)).toEqual(true);
})

test('function case2', () => {
    const func = `function($context, $element) {
         with($context){
            with($data||{}){
                return{
                    'attr':function(){
                        return {
                            'aria-label':$data.displayText && $data.displayText() || text,
                            'aria-hidden':ko.unwrap($data.visible) ?'false':'true',
                            'aria-disabled':ko.unwrap($data.disabled) ?'true':'false',
                            'aria-checked':$data.selected ?($data.selected() ?'true':'false'):null
                        } 
                    }
                }
            }
        } 
    }`;

    expect(!!jsParser.parse(func)).toEqual(true);
})

test("typeof test", () => {
    const func = `function(a) {
        return typeof a === 'function';
   }`;
    expect(_execute(jsParser.parse(func))(() => 1)).toEqual(true);
    expect(_execute(jsParser.parse(func))(2)).toEqual(false);
})

test("object with keyword fields test", () => {
    const func = `function(a) {
        return { 
            if: a
        }
   }`;
    expect(_execute(jsParser.parse(func))(2)).toEqual({ if: 2 });
})

test("function case3", () => {
    const func = `function($context, $element) {
         with($context){
            with($data||{}){
                return{
                    'template':function(){
                        return {
                             name:ko.unwrap($data.imageTemplateName),
                             if:!!ko.unwrap($data.imageTemplateName)
                            } 
                        },
                        'attr':function(){
                            return { 
                                class:'dxrd-toolbar-item-image dxd-state-normal dxd-icon-highlighted '+(ko.unwrap($data.imageClassName) ||''),
                                title:$data.displayText && $data.displayText() || text
                            } 
                        },
                        '}':function(){
                            return undefined 
                        },
                        'dxclick':function(){
                            return function(){ 
                                if((typeof $data.disabled ==='function') && !disabled() || !disabled){ 
                                    clickAction($root.model && $root.model());
                                }
                            } 
                        },
                        'css':function(){
                            return {
                                'dxrd-disabled-button':disabled,
                                'dxd-button-back-color dxd-back-highlighted dxd-state-active':$data.selected
                            } 
                        }
                    }
                }
            } 
        }`;

    expect(!!jsParser.parse(func)).toEqual(true);
})

test("this context test", () => {
    const func = `function() {
        return this.a(2);
   }`;
    const obj = {
        a: (val: number) => val
    }
    expect(_execute(jsParser.parse(func)).call(obj)).toEqual(2);
})

test("simple if operation", () => {
    const func = `function(a) {
        if(a > 0) 
            return 2;
   }`;
    expect(_execute(jsParser.parse(func))(2)).toEqual(2);
})

test("return from specific line", () => {
    const func = `function(a) {
        if(a > 0) 
            return 2;
        return 3;
   }`;
    expect(_execute(jsParser.parse(func))(0)).toEqual(3);
    expect(_execute(jsParser.parse(func))(2)).toEqual(2);
})

test("function case4", () => {
    const func = `function($context, $element) {
         with($context){
            with($data||{}){
                return{
                    'template':function(){
                        return 'dxrd-svg-toolbar-delete' 
                    },
                    'dxclick':function(){
                        return function(e){ toggleAppMenu()} 
                    },
                    'dxpointerenter':function(){
                        return function(_,e){
                              e.target.classList &&  e.target.classList.add('dxd-state-active')
                            } 
                    },
                    'dxpointerleave':function(){
                        return function(_,e){ 
                             e.target.classList &&  e.target.classList.remove('dxd-state-active')
                            } 
                        }
                    }
                }
            } 
        }`;
    expect(!!jsParser.parse(func)).toEqual(true);
})

test("right part in the line test", () => {
    const func = `function(a) {
        return a && a(2) || 3;
    }`
    expect(_execute(jsParser.parse(func))(() => 2)).toEqual(2);
    expect(_execute(jsParser.parse(func))()).toEqual(3);
})

test('[] in tail test', () => {
    const func = `function(a) {
        return a.test['b'].c;
    }`
    expect(_execute(jsParser.parse(func))({
        test: { b: { c: 2 } }
    })).toEqual(2);
})

test('[] with args in tail test', () => {
    const func = `function(a, d) {
        return a.test[d].c;
    }`
    expect(_execute(jsParser.parse(func))({
        test: { b: { c: 2 } }
    }, 'b')).toEqual(2);
})

test('[] with binary opeartor in tail test', () => {
    const func = `function(a, d) {
        return a.test[d - 1].c;
    }`
    expect(_execute(jsParser.parse(func))({
        test: [{ c: 1 }, { c: 2 }, { c: 3 }]
    }, 2)).toEqual(2);
})

class Test {
    constructor(public b = 2) { }
    c() {
        return this.b;
    }
}

test('call method from class in with operator test', () => {
    const func = `function(a) {
        with(a) {
            with(b) {
                return c();
            }
        }
    }`
    expect(_execute(jsParser.parse(func))({
        b: new Test()
    }
    )).toEqual(2);
})

test('object with useless , symbol test', () => {
    const func = `function() {
        return { a: { b: 1, }, c: 2 }
    }`
    expect(_execute(jsParser.parse(func))(
    )).toEqual({ a: { b: 1 }, c: 2 });
})

test('object with call this function test', () => {
    const func = `function() {
        return { a: this.test() }
    }`
    expect(_execute(jsParser.parse(func)).call({ test: () => 2 })).toEqual({ a: 2 });
})

test('function with context and closure', () => {
    const func = `function($context) {
        with($context) {
            with($data) {
                return {
                    attr: function() {
                        return 'a' + $data.test + 'c'
                    }
                }
            }
        }
    }`
    let result = _execute(jsParser.parse(func))({ $data: { test: 'b' } });
    expect(result.attr()).toEqual('abc');
})

test('variable is not in context test', () => {
    const func = `function($context) {
        with($context) {
            with($data) {
                return prop1;
            }
        }
    }`
    let result = _execute(jsParser.parse(func))({ $data: { test: 'b' } });
    expect(result).toEqual(undefined);
})

test('Stackoverflow fix test', () => {
    const func = `function($context) {
        with($context) {
            with($data) {
                return {
                    'visible':function(){return active() && visible() }
                };
            }
        }
    }`
    let result = _execute(jsParser.parse(func))({
        $data: {
            active: () => true,
            visible: () => true
        }
    });
    expect(result.visible()).toEqual(true);
})

test('!== test', () => {
    let func = `function() {
        return 2 != 3
    }`
    expect(_execute(jsParser.parse(func))()).toEqual(true);

    func = `function() {
        return 2 !== 2
    }`
    expect(_execute(jsParser.parse(func))()).toEqual(false);
})

test('x => test', () => {
    const func = `function(a) {
        return a.some(x => x === 2);
    }`
    expect(_execute(jsParser.parse(func))([1, 2, 3])).toEqual(true)
})

test('function case6', () => {
    const func = `function($context, $element) { 
        with($context){
            with($data||{}){
                return{
                    'dxSelectBox':function(){
                        return {
                            dataSource:$root.controlsStore.dataSource,
                            value:$root.editableObject,
                            displayExpr:function(value){
                                var showValue = value || $root.editableObject();
                                return $root.dx._static.getControlFullName(showValue)
                            },
                            dropDownOptions:{ 
                                container:$root.getPopupContainer($element)
                            },
                            useItemTextAsTitle:true
                        } 
                    }
                }
            }
        }
    }`
    let result = _execute(jsParser.parse(func))({
        $root: {
            editableObject: () => 'eo',
            controlsStore: { dataSource: 'ds' },
            getPopupContainer: () => 'el',
            dx: { _static: { getControlFullName: () => 'fn' } }
        }
    }, 'el');
    let selectBoxOptions = result.dxSelectBox();
    expect(selectBoxOptions.displayExpr(1)).toEqual('fn');
    expect(selectBoxOptions.displayExpr(0)).toEqual('fn');
})

test(`function case7`, () => {
    const func = `function($data) { 
        return $data.visibleItems !== undefined ?'dx-treelist-paginate':'dx-treelist-common' 
    }`;
    expect(_execute(jsParser.parse(func))({})).toEqual('dx-treelist-common');

    expect(_execute(jsParser.parse(func))({
        visibleItems: [1, 2, 3]
    })).toEqual('dx-treelist-paginate');
})

test(`parse string with " symbol`, () => {
    const func = `function() { 
        return "a";
    }`;
    expect(_execute(jsParser.parse(func))()).toEqual('a');
})

test("class test", () => {
    const func = `function($data) { 
        var inst = new $data.inst('1');
        return inst.c();
    }`;
    expect(_execute(jsParser.parse(func))({
        inst: Test
    })).toEqual('1');
})

test("return empty function test", () => {
    const func = `function() {
        return function() {}
    }`
    expect(_execute(jsParser.parse(func))()()).toEqual(undefined);
})


test("binary opration in '(' ')' test", () => {
    const func = `function(b) {
        return ('a' || b).toUpperCase();
    }`
    expect(_execute(jsParser.parse(func))('c')).toEqual('A');
})

test('return call function test', () => {
    let func = `function(getContainer) {
        return (getContainer || function(a) { return a; })('test')
    }`
    expect(_execute(jsParser.parse(func))()).toEqual('test');

    func = `function(getContainer) {
        return (getContainer || function(a) { return a; })('test')
    }`
    expect(_execute(jsParser.parse(func))(() => 'myTest')).toEqual('myTest');
})

test('window operation is disabled test', () => {
    let func = `function() {
        return Math.max(1,2);
    }`
    expect(_execute(jsParser.parse(func), undefined, {
        enabledWindowOperations: { 'Math': true },
        disabledOperations: {}
    })()).toEqual(2);

    `function() {
        return Math.max(1,2);
    }`
    try {
        _execute(jsParser.parse(func), undefined, {
            enabledWindowOperations: {},
            disabledOperations: {}
        })();
    } catch (e: any) {
        expect(e.message).toEqual("Math is not available from window");
    }
})

test('speific operand is not avaialbe test', () => {
    let func = `function() {
        return 1 > 2;
    }`
    try {
        _execute(jsParser.parse(func), undefined, {
            enabledWindowOperations: {},
            disabledOperations: {
                binary: true
            }
        })()
    } catch (e: any) {
        expect(e.message).toEqual("Operator binary is unavailable");
    }
})


test('property name with _ and $ symbol test', () => {
    let func = `function(a) {
        return a._$test;
    }`;
    expect(_execute(jsParser.parse(func))({ ['_$test']: 2 })).toEqual(2);

    func = `function(a) {
        return a._test;
    }`;
    expect(_execute(jsParser.parse(func))({ _test: 2 })).toEqual(2);

    func = `function(a) {
        return a.$test;
    }`;
    expect(_execute(jsParser.parse(func))({ $test: 2 })).toEqual(2);
})

test('get property from sequence test', () => {
    let func = `function(a) {
        var b = {};
        return b.a;
    }`;
    expect(_execute(jsParser.parse(func))({ test: '1' })).toEqual(undefined);
})

test('throw if property not found in sequence test', () => {
    let func = `function(a) {
        var b = {};
        return b.c.a;
    }`;
    try {
        _execute(jsParser.parse(func))({ test: '1' });
        expect(true).toEqual(false);
    } catch (e: any) {
        expect(e.message).toEqual("Property {\"name\":\"a\",\"type\":\"context\"} doesn't exists in context after evaluate [{\"name\":\"b\",\"type\":\"context\"},{\"name\":\"c\",\"type\":\"context\"},{\"name\":\"a\",\"type\":\"context\"}]")
    }
})

test('fix context for empty string', () => {
    let func = `function(a) {
        var b = { a: '' };
        return b.a.length;
    }`;
    expect(_execute(jsParser.parse(func))([[1, 2]])).toEqual(0);
})

test('replace processor collect names test', () => {
    let func = `function($context, $element) { 
        return {
            'dxSelectBox':function(){
                return {
                    dataSource:$root.controlsStore.dataSource,
                    value:editableObject,
                    displayExpr: function(value){
                        var showValue = value || $root.editableObject();
                        return $root.dx._static.getControlFullName(showValue)
                    },
                    dropDownOptions:{ 
                        container:$root.getPopupContainer($element, testVar)
                    },
                    useItemTextAsTitle:true
                } 
            }
        }
    }`;
    const names: string[] = [];
    const existsNames: string[] = [];
    new ReplaceVariableProcessor([], (name, exists) => {
        if (!exists) {
            names.push(name);
        } else {
            existsNames.push(name);
        }
        return name;
    }).process(func);
    expect(names).toEqual(['$root', 'editableObject', '$root', '$root', '$root', 'testVar'])
    expect(existsNames).toEqual(['value', 'showValue', '$element'])
})

test('replace processor replace names test', () => {
    let func = `function($context, $element) { 
        return {
            'dxSelectBox':function(){
                return {
                    dataSource:$root.controlsStore.dataSource,
                    value:editableObject,
                    displayExpr: function(value){
                        var showValue = value || $root.editableObject();
                        return $root.dx._static.getControlFullName(showValue)
                    },
                    dropDownOptions:{ 
                        container:$root.getPopupContainer($element, testVar)
                    },
                    useItemTextAsTitle:true
                } 
            }
        }
    }`;
    const result = new ReplaceVariableProcessor([], (name, exists) => {
        if (!exists) {
            return 'notex.' + name;
        } else {
            return 'ex.' + name;
        }
    }).process(func);
    expect(result).toEqual(`function($context,$element){ return {'dxSelectBox':function(){ return {'dataSource':notex.$root.controlsStore.dataSource,'value':notex.editableObject,'displayExpr':function(value){ var showValue = ex.value || notex.$root.editableObject();return notex.$root.dx._static.getControlFullName(ex.showValue) },'dropDownOptions':{'container':notex.$root.getPopupContainer(ex.$element,notex.testVar)},'useItemTextAsTitle':true} }} }`)
})

test('replace processor replace names in if operator test', () => {
    let func = `function($context, $element) { 
        if(a > $context) {
            return a;
        } else if(a < $context) {
            return $context;
        }
        return a > $context ? 1 : 2;
    }`;
    const result = new ReplaceVariableProcessor([], (name, exists) => {
        if (!exists) {
            return 'notex.' + name;
        } else {
            return 'ex.' + name;
        }
    }).process(func);
    expect(result).toEqual(`function($context,$element){ if(notex.a > ex.$context){ return notex.a }else { if(notex.a < ex.$context){ return ex.$context } };return notex.a > ex.$context ? 1 : 2 }`)
})

test('replace processor replace names in [] test', () => {
    let result = new ReplaceVariableProcessor([], (name, exists) => {
        if (!exists) {
            return 'notex.' + name;
        } else {
            return 'ex.' + name;
        }
    }).process(`function(a) {
        return a.test['b'].c;
    }`);
    expect(result).toEqual(`function(a){ return ex.a.test['b'].c }`)

    result = new ReplaceVariableProcessor([], (name, exists) => {
        if (!exists) {
            return 'notex.' + name;
        } else {
            return 'ex.' + name;
        }
    }).process(`function(a, d) {
        return a.test[d].c;
    }`);
    expect(result).toEqual(`function(a,d){ return ex.a.test[ex.d].c }`)
})

test('serialize undefined and null value test', () => {
    const processor = new ReplaceVariableProcessor();
    expect(processor.process(`function(a) {
        return null;
    }`)).toEqual(`function(a){ return null }`);
    expect(processor.process(`function(a) {
        return undefined;
    }`)).toEqual(`function(a){ return undefined }`);
})

test('minus parse test', () => {
    let func = `function(a) {
        return -3 * a;
    }`;
    expect(_execute(jsParser.parse(func))(2)).toEqual(-6);
})