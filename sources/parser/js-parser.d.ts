export declare function parse(criteria: string): any;
export declare const Parser: {
  parse: (criteria: string) => any;
};

declare const jsParser: {
  parse: typeof parse;
  Parser: typeof Parser;
};

export default jsParser;
