import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';

execFileSync(process.execPath, ['scripts/build-browser-fixture.mjs'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
});

const candidates = process.platform === 'win32'
  ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
  : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
const executablePath = process.env.BROWSER_EXECUTABLE
  ?? candidates.find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error('No installed Chromium-family browser was found');

const files = {
  '/': ['../tests/browser/fixtures/csp.html', 'text/html; charset=utf-8'],
  '/fixture.js': ['../.tmp/browser-csp/fixture.js', 'text/javascript; charset=utf-8'],
  '/instrumented.js': ['../.tmp/browser-csp/instrumented.js', 'text/javascript; charset=utf-8'],
  '/plain.js': ['../.tmp/browser-csp/plain.js', 'text/javascript; charset=utf-8'],
};
for (const entry of await readdir(new URL('../dist/esm/', import.meta.url), {
  withFileTypes: true,
})) {
  if (entry.isFile() && entry.name.endsWith('.js')) {
    files[`/${entry.name}`] = [
      `../dist/esm/${entry.name}`,
      'text/javascript; charset=utf-8',
    ];
  }
}
const server = createServer(async (request, response) => {
  const entry = files[request.url ?? '/'];
  if (!entry) {
    response.writeHead(404).end();
    return;
  }
  const [path, type] = entry;
  response.writeHead(200, {
    'Content-Type': type,
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'",
  });
  response.end(await readFile(new URL(path, import.meta.url)));
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

let browser;
try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server has no port');
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      errors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  const response = await page.goto(`http://127.0.0.1:${address.port}/`, {
    waitUntil: 'load',
  });
  if (!response?.ok()) throw new Error(`Fixture request failed: ${response?.status()}`);
  await page.locator("html[data-status='passed']").waitFor({ timeout: 15_000 });
  if (errors.length > 0) throw new Error(errors.join('\n'));
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  if (!csp || csp.includes('unsafe-eval')) throw new Error(`Invalid CSP: ${csp}`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
