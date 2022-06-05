var fs = require("fs"),
    path = require("path"),
    grammar = fs.readFileSync(path.join(__dirname, "js-parser.jison"), "utf8"),
    parserSource = new require("jison")
        .Parser(grammar)
        .generate({ moduleName: "js-parser", moduleType: "js" });

var header = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
`

var footer = `
exports.jsParser = jsParser;
exports.parse = function(test) { return jsParser.parse(test) };
`
fs.writeFileSync(path.join(__dirname, 'js-parser.js'), header + parserSource + footer, 'utf8');

var dtssource = `
export declare function parse(criteria: string): any;
export declare var jsParser: {
    parse: (criteria: string) => any
};
`
fs.writeFileSync(path.join(__dirname, 'jsParser.d.ts'), dtssource, 'utf8');