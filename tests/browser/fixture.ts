const root = document.documentElement;

const verify = async () => {
  try {
    const rootUrl = '/index.js';
    const instrumentedUrl = '/instrumented.js';
    const plainUrl = '/plain.js';
    const [{ allowValue }, { execute }, { binding }] = await Promise.all([
      import(rootUrl),
      import(instrumentedUrl),
      import(plainUrl),
    ]);
    if (binding({ $data: { value: 7 } }) !== 7) {
      throw new Error('Plain Knockout AOT execution failed');
    }
    const result = execute(
      { globals: { input: allowValue(0) } },
      { input: 4 },
    );
    if (result !== 5) throw new Error('Instrumented CSP execution failed');

    root.dataset.status = 'passed';
    document.querySelector('output')!.textContent = 'passed';
  } catch (error) {
    root.dataset.status = 'failed';
    document.querySelector('output')!.textContent = String(error);
    console.error(error);
  }
};

void verify();
