import { parse } from '@babel/parser';
import type { ParserPlugin } from '@babel/parser';
import type {
  NormalizedProgram,
  SourceType,
  SyntaxPlugin,
} from './ast';

export interface ParseProgramOptions {
  sourceType: SourceType;
  filename?: string;
  syntax?: readonly SyntaxPlugin[];
}

const syntaxPlugins: Readonly<Record<SyntaxPlugin, ParserPlugin>> = {
  jsx: 'jsx',
  typescript: 'typescript',
};

export function parseProgram(
  source: string,
  options: ParseProgramOptions,
): NormalizedProgram {
  const file = parse(source, {
    sourceType: options.sourceType,
    sourceFilename: options.filename,
    plugins: options.syntax?.map((plugin) => syntaxPlugins[plugin]),
  });

  return file.program;
}

