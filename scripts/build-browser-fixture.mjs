import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { browserDefines } from './browser-defines.mjs';

const outdir = new URL('../.tmp/browser-csp/', import.meta.url);
await mkdir(outdir, { recursive: true });
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
