import { copyFile, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/parser/', import.meta.url), { recursive: true });
await Promise.all([
  copyFile(
    new URL('../sources/parser/js-parser.js', import.meta.url),
    new URL('../dist/parser/js-parser.js', import.meta.url),
  ),
  copyFile(
    new URL('../sources/parser/js-parser.d.ts', import.meta.url),
    new URL('../dist/parser/js-parser.d.ts', import.meta.url),
  ),
]);
