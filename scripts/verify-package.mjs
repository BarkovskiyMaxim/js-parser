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
assert.equal(typeof root.parseProgram, 'function');
assert.equal(typeof root.transformSource, 'function');
assert.equal(typeof root.generateProgram, 'function');
assert.equal(typeof root.createReplaceVariablesTransform, 'function');
assert.equal(typeof root.compile, 'function');
assert.equal(typeof root.allowValue, 'function');
assert.equal(typeof root.SafeJavaScriptError, 'function');
assert.equal(root.ReplaceVariableProcessor, deep.ReplaceVariableProcessor);
const strict = root.compile('Math.max(1, 4);', {
  policy: {
    globals: {
      Math: root.allowValue(Math, { call: ['max'] }),
    },
  },
});
assert.equal(strict.execute(), 4);
assert.throws(
  () => root.compile('process;'),
  (error) => error instanceof root.SafeJavaScriptError
    && error.code === 'POLICY_GLOBAL_DENIED',
);
const transformed = root.transformSource(
  'const label = user?.name ?? "anonymous"',
  {
    sourceType: 'script',
    transforms: [root.createReplaceVariablesTransform(
      [],
      (name, exists) => exists ? name : 'scope.' + name,
    )],
  },
).toString({ compact: true });
assert.equal(
  transformed,
  'const label=scope.user?.name??"anonymous";',
);
const output = new deep.ReplaceVariableProcessor(
  ['Math'],
  (name, exists) => exists ? name : '$context.$data.' + name,
).process('function($context){return Math.max(value,0)}');
assert.match(output, /Math\\.max/);
assert.match(output, /\\$context\\.\\$data\\.value/);
assert.doesNotMatch(output, /eval\\(|new Function/);
`);
  await writeFile(join(temp, 'contract.mjs'), `
import assert from 'node:assert/strict';
import * as root from 'js-code-parser';
import { executeSerializedProgram } from 'js-code-parser/runtime';
assert.equal(typeof root.compile, 'function');
assert.equal(typeof executeSerializedProgram, 'function');
assert.equal(root.compile('1 + 2;').execute(), 3);
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
  execFileSync(process.execPath, [join(temp, 'contract.mjs')], {
    cwd: temp,
    stdio: 'inherit',
  });

  const installed = JSON.parse(await readFile(
    join(temp, 'node_modules/js-code-parser/package.json'),
    'utf8',
  ));
  assert.equal(installed.name, 'js-code-parser');
  await Promise.all([
    readFile(join(temp, 'node_modules/js-code-parser/SECURITY.md'), 'utf8'),
    readFile(join(temp, 'node_modules/js-code-parser/docs/knockout-aot.md'), 'utf8'),
  ]);
} finally {
  await rm(temp, { recursive: true, force: true });
}
