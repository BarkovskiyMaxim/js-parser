import { expect, test } from 'vitest';
import { ReplaceVariableProcessor } from '../../sources/executors/processor';

test('processor supports modern syntax through its legacy API', () => {
  const processor = new ReplaceVariableProcessor([], (name, exists) => (
    exists ? name : `$context.$data.${name}`
  ));

  const output = processor.process(
    "function binding() { return user?.name ?? 'anonymous'; }",
  );

  expect(output).toContain("$context.$data.user?.name??'anonymous'");
  expect(output).not.toContain('eval(');
  expect(output).not.toContain('Function(');
});
