import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const entry = new URL('../recipes/my-home-maintenance/views/my-home-maintenance/whats-due.html', import.meta.url);
const html = await readFile(entry, 'utf8');

// The View's own link scanner, lifted from the committed entry so the test runs the shipped bytes.
function scanner() {
  const start = html.indexOf('  function bodyLinks(');
  const end = html.indexOf('  function linked(', start);
  assert.ok(start > 0 && end > start, 'bodyLinks is in the entry');
  const constant = html.indexOf('MAX_SCAN = ');
  assert.ok(constant > 0, 'the scan bound is declared');
  const bound = Number.parseInt(html.slice(constant + 'MAX_SCAN = '.length), 10);
  return new Function('MAX_SCAN', `${html.slice(start, end)}\nreturn bodyLinks;`)(bound);
}

test('What\'s due: typed body links resolve the way the bundle writes them', () => {
  const bodyLinks = scanner();
  const body = [
    '[asset](../assets/a01.md)',
    '[performed in space](/my-home/spaces/s04.md#top)',
    '![photo](../assets/a01.md)',
    '[site](https://example.test/x.md)',
    '`[asset](../assets/a02.md)`',
    '```\n[asset](../assets/a03.md)\n```',
    '[Plan](../maintenance/p01.md)',
  ].join('\n\n');
  assert.deepEqual(bodyLinks('my-home/services/v01', body), [
    {text: 'asset', to: 'my-home/assets/a01'},
    {text: 'performed in space', to: 'my-home/spaces/s04'},
    {text: 'plan', to: 'my-home/maintenance/p01'},
  ]);
  assert.deepEqual(bodyLinks('my-home/services/v01', undefined), []);
});

test('What\'s due: a 1 MiB hostile body scans in well under a second and the scan is bounded', () => {
  const bodyLinks = scanner();
  const size = 1024 * 1024;
  const fill = (unit) => unit.repeat(Math.ceil(size / unit.length)).slice(0, size);
  for (const unit of ['[](', '[', '](', '(', '[a](b', '```', '`', '[a](b(c']) {
    const body = fill(unit) + '\n[asset](../assets/a01.md)';
    const began = performance.now();
    bodyLinks('my-home/maintenance/p01', body);
    const took = performance.now() - began;
    assert.ok(took < 500, `${JSON.stringify(unit)} took ${took.toFixed(0)} ms`);
  }
  // Past the bound nothing more is read, so a link after 1 MiB is not seen.
  assert.deepEqual(bodyLinks('my-home/maintenance/p01', fill(' ') + '[asset](../assets/a01.md)'), []);
});

test('What\'s due: the entry stays a small, inert, self-contained page', () => {
  assert.ok(Buffer.byteLength(html) < 512 * 1024, 'within the 512 KiB entry limit');
  for (const sink of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'fetch(', 'XMLHttpRequest', 'localStorage']) {
    assert.equal(html.includes(sink), false, `uses ${sink}`);
  }
  assert.equal(/<(?:script|link|img)[^>]+(?:src|href)=/i.test(html), false, 'loads nothing external');
});
