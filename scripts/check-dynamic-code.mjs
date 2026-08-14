import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { readFile, readdir } from 'node:fs/promises';

const traverse = traverseModule.default;
const roots = [
  new URL('../dist/esm/', import.meta.url),
  new URL('../.tmp/browser-csp/', import.meta.url),
];

const fail = (kind, file, node) => {
  throw new Error(`${kind} found in ${file.pathname}:${node.loc?.start.line ?? 0}`);
};

for (const root of roots) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const file = new URL(entry.name, root);
    const source = await readFile(file, 'utf8');
    const ast = parse(source, { sourceType: 'module' });
    traverse(ast, {
      CallExpression(path) {
        if (
          path.node.callee.type === 'Identifier'
          && (path.node.callee.name === 'eval' || path.node.callee.name === 'Function')
        ) {
          fail('Dynamic code call', file, path.node);
        }
        if (
          path.node.callee.type === 'Identifier'
          && path.node.callee.name === 'require'
          && path.node.arguments[0]?.type === 'StringLiteral'
          && path.node.arguments[0].value.startsWith('node:')
        ) {
          fail('Node built-in require', file, path.node);
        }
      },
      NewExpression(path) {
        if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'Function') {
          fail('Function constructor', file, path.node);
        }
      },
      ImportDeclaration(path) {
        if (path.node.source.value.startsWith('node:')) {
          fail('Node built-in import', file, path.node);
        }
      },
    });
  }
}
