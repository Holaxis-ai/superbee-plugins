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

// The View's domain rules, lifted the same way: the date helpers, `linked` and `model`.
function rules(unread = {}) {
  const slice = (from, to) => {
    const start = html.indexOf(from), end = html.indexOf(to, start);
    assert.ok(start > 0 && end > start, `${from.trim()} is in the entry`);
    return html.slice(start, end);
  };
  const source = [
    'function str(v) { return typeof v === "string" ? v.trim() : ""; }',
    slice('  function validDate(', '  // Labeled body links'),
    slice('  function linked(', '  // ---- bridge reads'),
    slice('  function model(', '  // ---- rendering'),
  ].join('\n');
  return new Function('unread', `${source}\nreturn {model, todayIn};`)(unread);
}

test('What\'s due: a recorded time zone wins, else the viewer\'s own date classifies the plan', () => {
  const {model, todayIn} = rules();
  const shift = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
  const plan = (id, fm, body = '') => ({id, version: '1', frontmatter: {title: id, plan_status: 'enabled', schedule_mode: 'manual_date', ...fm}, body});
  const empty = {rows: [], cut: false};
  const place = (zone) => {
    const names = {'my-home/homes/h01': {kind: 'home', title: 'Home', fm: zone ? {timezone: zone} : {}}};
    const links = {'my-home/maintenance/p01': [{text: 'home', to: 'my-home/homes/h01'}]};
    return {names, links};
  };
  const classify = (today, fm, zone) => {
    const {names, links} = place(zone);
    const q = {plan: empty, service: empty, home: empty, space: empty, asset: empty};
    return model(q, names, links, [plan('my-home/maintenance/p01', fm)], [], today).rows[0];
  };

  // No zone on the plan or its Home: the viewer's own date decides, nothing is held back.
  const viewer = '2026-11-16';
  assert.equal(classify(viewer, {next_due_on: shift(viewer, -1)}).section, 'overdue');
  assert.equal(classify(viewer, {next_due_on: viewer}).pill.text, 'Today');
  assert.equal(classify(viewer, {next_due_on: shift(viewer, 45)}).section, 'later');

  // The Home's zone wins over the viewer's date when they disagree on what day it is.
  const kiritimati = todayIn('Pacific/Kiritimati'), pagoPago = todayIn('Pacific/Pago_Pago');
  assert.notEqual(kiritimati, pagoPago);
  const row = classify(pagoPago, {next_due_on: pagoPago}, 'Pacific/Kiritimati');
  assert.equal(row.section, 'overdue', 'due yesterday in the Home\'s zone');
  // The plan's own zone wins over its Home's.
  assert.equal(classify(pagoPago, {next_due_on: pagoPago, schedule_timezone: 'Pacific/Pago_Pago'}, 'Pacific/Kiritimati').pill.text, 'Today');
  // Rules unchanged: not enabled or not manual_date never counts as due.
  assert.equal(classify(viewer, {next_due_on: shift(viewer, -1), plan_status: 'paused'}).section, 'later');
  assert.equal(classify(viewer, {next_due_on: shift(viewer, -1), schedule_mode: 'calendar'}).section, 'later');
  assert.equal(html.includes('Needs a time zone'), false);
});

test('What\'s due: a fallback behind an unanswered read on the Home path says so on the row', () => {
  const unread = {'my-home/assets/a01': true};
  const {model} = rules(unread);
  const empty = {rows: [], cut: false};
  const q = {plan: empty, service: empty, home: empty, space: empty, asset: empty};
  const names = {'my-home/assets/a01': {kind: 'asset', title: 'Furnace', fm: {}}};
  const links = {'my-home/maintenance/p01': [{text: 'asset', to: 'my-home/assets/a01'}]};
  const fm = {title: 'p01', plan_status: 'enabled', schedule_mode: 'manual_date', next_due_on: '2026-11-15'};
  const row = (extra) => model(q, names, links, [{id: 'my-home/maintenance/p01', version: '1', frontmatter: {...fm, ...extra}}], [], '2026-11-16').rows[0];
  assert.deepEqual(row({}).notes, ['Some details couldn\u2019t load.']);
  // A recorded zone on the plan does not depend on that read.
  assert.deepEqual(row({schedule_timezone: 'Europe/London'}).notes, []);
});

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

test('What\'s due: the host\'s light or dark wins over the device, and without one the device decides', () => {
  const start = html.indexOf('  function applyScheme(');
  const end = html.indexOf('  function start(', start);
  assert.ok(start > 0 && end > start, 'applyScheme is in the entry');
  const draw = (descriptor) => {
    const attributes = {};
    const document = {documentElement: {setAttribute: (name, value) => { attributes[name] = value; }}};
    new Function('document', `${html.slice(start, end)}\nreturn applyScheme;`)(document)(descriptor);
    return attributes['data-scheme'];
  };
  assert.equal(draw({theme: {scheme: 'dark', ground: '#10243a'}}), 'dark');
  assert.equal(draw({theme: {scheme: 'light'}}), 'light');
  // An older or local host sends no theme, or one this View does not know: the device decides.
  assert.equal(draw({}), undefined);
  assert.equal(draw({theme: {scheme: 'dim'}}), undefined);
  // The stamped scheme is what picks each light-dark() pair.
  assert.match(html, /:root\[data-scheme="light"\] \{ color-scheme: light; \}/);
  assert.match(html, /:root\[data-scheme="dark"\] \{ color-scheme: dark; \}/);
  assert.equal(html.includes('prefers-color-scheme'), false, 'one token set, picked by color-scheme');
});

test('What\'s due: the entry stays a small, inert, self-contained page', () => {
  assert.ok(Buffer.byteLength(html) < 512 * 1024, 'within the 512 KiB entry limit');
  for (const sink of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'fetch(', 'XMLHttpRequest', 'localStorage']) {
    assert.equal(html.includes(sink), false, `uses ${sink}`);
  }
  assert.equal(/<(?:script|link|img)[^>]+(?:src|href)=/i.test(html), false, 'loads nothing external');
});
