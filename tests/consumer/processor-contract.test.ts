import ko from 'knockout';
import { describe, expect, test } from 'vitest';
import { ReplaceVariableProcessor } from '../../sources/executors/processor';
import {
  contextVariables,
  processorInput,
  processorOutputV001,
} from './fixtures/knockout-binding';

const createProcessor = () => new ReplaceVariableProcessor(
  ['Math', 'Object', 'window'],
  (name, exists) => {
    if (exists || name === 'this') return name;
    const prefix = contextVariables.includes(
      name as (typeof contextVariables)[number],
    ) ? '$context' : '$context.$data';
    return `${prefix}.${name}`;
  },
);

describe('analytics-core-cli compatibility', () => {
  test('preserves the reviewed 0.0.1 processor output', () => {
    expect(createProcessor().process(processorInput)).toBe(processorOutputV001);
  });

  test('processes actual Knockout preProcessBindings output', () => {
    const rewritten = ko.expressionRewriting.preProcessBindings(
      'text: title, visible: $root.ready, click: save',
      { valueAccessors: true },
    );
    const source = `function($context, $element) { return { ${rewritten} } }`;
    const output = createProcessor().process(source);

    expect(output).toContain('$context.$data.title');
    expect(output).toContain('$context.$root.ready');
    expect(output).toContain('$context.$data.save');
    expect(output).not.toContain('eval(');
    expect(output).not.toContain('new Function');
  });
});
