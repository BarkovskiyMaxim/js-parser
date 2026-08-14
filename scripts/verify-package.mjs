import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const temp = await mkdtemp(join(tmpdir(), 'js-code-parser-package-'));

try {
  const packOutput = execFileSync(
    'npm',
    ['pack', root, '--json', '--pack-destination', temp],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  const [{ filename }] = JSON.parse(packOutput);
  const tarball = join(temp, filename);

  execFileSync('npm', ['init', '-y'], {
    cwd: temp,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  await writeFile(join(temp, 'contract.cjs'), `
const assert = require('node:assert/strict');
const root = require('js-code-parser');
const deep = require('js-code-parser/executors/processor');
assert.equal(root.ReplaceVariableProcessor, deep.ReplaceVariableProcessor);
const output = new deep.ReplaceVariableProcessor(
  ['Math'],
  (name, exists) => exists ? name : '$context.$data.' + name,
).process('function($context){return Math.max(value,0)}');
assert.match(output, /Math\\.max/);
assert.match(output, /\\$context\\.\\$data\\.value/);
assert.doesNotMatch(output, /eval\\(|new Function/);
`);
  execFileSync('npm', ['install', '--ignore-scripts', tarball], {
    cwd: temp,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  execFileSync(process.execPath, [join(temp, 'contract.cjs')], {
    cwd: temp,
    stdio: 'inherit',
  });

  const installed = JSON.parse(await readFile(
    join(temp, 'node_modules/js-code-parser/package.json'),
    'utf8',
  ));
  assert.equal(installed.name, 'js-code-parser');
} finally {
  await rm(temp, { recursive: true, force: true });
}
