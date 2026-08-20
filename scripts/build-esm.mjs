import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { browserDefines } from './browser-defines.mjs';

const outdir = new URL('../dist/esm/', import.meta.url);
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: {
    index: fileURLToPath(new URL('../sources/index.ts', import.meta.url)),
    runtime: fileURLToPath(new URL('../sources/runtime.ts', import.meta.url)),
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outdir: fileURLToPath(outdir),
  sourcemap: true,
  legalComments: 'none',
  define: browserDefines,
});
await writeFile(
  new URL('package.json', outdir),
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
);
await Promise.all([
  writeFile(new URL('../index.d.mts', outdir), "export * from './index.js';\n"),
  writeFile(new URL('../runtime.d.mts', outdir), "export * from './runtime.js';\n"),
]);
