import {
  allowValue,
  compile,
  ReplaceVariableProcessor,
} from '../../sources/index';

const root = document.documentElement;

try {
  const transformed = new ReplaceVariableProcessor(
    [],
    (name, exists) => exists ? name : `$context.$data.${name}`,
  ).process('function($context){return value}');
  if (!transformed.includes('$context.$data.value')) {
    throw new Error('Legacy AOT transform failed');
  }

  const result = compile('Math.max(1, 4);', {
    policy: {
      globals: { Math: allowValue(Math, { call: ['max'] }) },
    },
  }).execute();
  if (result !== 4) throw new Error('Strict execution failed');

  root.dataset.status = 'passed';
  document.querySelector('output')!.textContent = 'passed';
} catch (error) {
  root.dataset.status = 'failed';
  document.querySelector('output')!.textContent = String(error);
  console.error(error);
}

