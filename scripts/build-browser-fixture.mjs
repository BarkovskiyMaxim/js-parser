import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { browserDefines } from './browser-defines.mjs';

const outdir = new URL('../.tmp/browser-csp/', import.meta.url);
await mkdir(outdir, { recursive: true });
execFileSync('npm', ['run', 'build'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
const require = createRequire(import.meta.url);
const {
  allowValue,
  compile,
  ReplaceVariableProcessor,
} = require(fileURLToPath(new URL('../dist/index.js', import.meta.url)));

const instrumented = compile('input + 1;', {
  policy: { globals: { input: allowValue(0) } },
}).toModule({
  mode: 'instrumented',
  runtimeImport: '/runtime.js',
});
await writeFile(new URL('instrumented.js', outdir), instrumented.code);

const transformed = new ReplaceVariableProcessor(
  [],
  (name, exists) => exists ? name : `$context.$data.${name}`,
).process('function($context){return value}');
await writeFile(
  new URL('plain.js', outdir),
  `export const binding = ${transformed};\n`,
);

await build({
  entryPoints: [fileURLToPath(new URL('../tests/browser/fixture.ts', import.meta.url))],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: fileURLToPath(new URL('fixture.js', outdir)),
  legalComments: 'none',
  define: browserDefines,
});
