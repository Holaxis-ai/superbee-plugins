import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const entry = new URL('../recipes/my-home-maintenance/views/my-home-maintenance/whats-due.html', import.meta.url);
const html = await readFile(entry, 'utf8');

// The View's domain rules, lifted from the committed entry: the date helpers, `linked` and `model`.
function rules(missing = {}) {
  const slice = (from, to) => {
    const start = html.indexOf(from), end = html.indexOf(to, start);
    assert.ok(start > 0 && end > start, `${from.trim()} is in the entry`);
    return html.slice(start, end);
  };
  const source = [
    'function str(v) { return typeof v === "string" ? v.trim() : ""; }',
    slice('  function validDate(', '  // Typed links are the host'),
    slice('  function linked(', '  // ---- bridge reads'),
    slice('  function model(', '  // ---- rendering'),
  ].join('\n');
  const fn = new Function(`${source}\nreturn {model, todayIn};`)();
  return {todayIn: fn.todayIn, model: (...args) => fn.model(...args, missing)};
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

test('What\'s due: a fallback behind a record too large to answer on the Home path says so on the row', () => {
  const {model} = rules({'my-home/assets/a01': 'large'});
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

// The View's load path, lifted from the committed entry (constants through the domain rules) and
// run against a fake bridge, so the test counts the calls the shipped bytes make.
function loader(bridge, hello = {edges: true}) {
  const start = html.indexOf('  var KINDS = {');
  const end = html.indexOf('  // ---- rendering', start);
  assert.ok(start > 0 && end > start, 'the load path is in the entry');
  const document = {getElementById: () => ({})};
  const make = new Function('document', 'window', `${html.slice(start, end)}
    host.caps = []; host.edges = ${JSON.stringify(!!hello.edges)};
    return {load, edgeCache};`);
  return make(document, {Bridge: bridge});
}
function fixture(plans, visits, assets = 10, spaces = 3) {
  const fm = (title, extra) => ({title, ...extra});
  const today = new Date().toISOString().slice(0, 10);
  const rows = {
    'My Home Maintenance Plan': Array.from({length: plans}, (_, i) => ({id: `my-home/maintenance/p${i}`, version: 'v1',
      frontmatter: fm(`Plan ${i}`, {plan_status: 'enabled', schedule_mode: 'manual_date', next_due_on: today})})),
    'My Home Service Record': Array.from({length: visits}, (_, i) => ({id: `my-home/services/v${i}`, version: 'v1', frontmatter: fm(`Visit ${i}`, {occurred_on: today})})),
    'My Home Home': [{id: 'my-home/homes/h', version: 'v1', frontmatter: fm('Home', {timezone: 'Pacific/Kiritimati'})}],
    'My Home Space': Array.from({length: spaces}, (_, i) => ({id: `my-home/spaces/s${i}`, version: 'v1', frontmatter: fm(`Space ${i}`)})),
    'My Home Asset': Array.from({length: assets}, (_, i) => ({id: `my-home/assets/a${i}`, version: 'v1', frontmatter: fm(`Asset ${i}`)})),
  };
  const links = [];
  rows['My Home Maintenance Plan'].forEach((r, i) => links.push({from: r.id, to: `my-home/assets/a${i % assets}`, text: 'asset'}));
  rows['My Home Service Record'].forEach((r, i) => links.push({from: r.id, to: `my-home/assets/a${i % assets}`, text: 'asset'}));
  rows['My Home Asset'].forEach((r, i) => links.push({from: r.id, to: `my-home/spaces/s${i % spaces}`, text: 'located in'}));
  rows['My Home Space'].forEach((r) => links.push({from: r.id, to: 'my-home/homes/h', text: 'home'}));
  return {rows, links};
}
function fakeBridge({rows, links}, answer = (from, out) => ({edges: out, count: out.length})) {
  const calls = {query: 0, edges: 0, read: 0}, sizes = [];
  return {
    calls, sizes,
    query: async ({type}) => { calls.query++; const list = rows[type] || []; return {rows: list, count: list.length}; },
    read: async () => { calls.read++; throw Object.assign(new Error('no'), {code: 'NOT_FOUND'}); },
    edges: async ({from, ...rest}) => {
      calls.edges++; sizes.push(from.length);
      assert.deepEqual(Object.keys(rest), [], 'asks by from only');
      assert.ok(Array.isArray(from) && from.length >= 1 && from.length <= 32, '1 to 32 ids per call');
      return answer(from, links.filter((l) => !l || typeof l.from !== 'string' || from.includes(l.from)));
    },
  };
}
async function draw(bridge, hello) {
  const {load} = loader(bridge, hello);
  const shown = [];
  await load(() => true, (next, done) => shown.push({next, done}));
  return shown;
}

test('What\'s due: 300 plans and 300 visits take 23 edges calls of at most 32 ids, and no reads', async () => {
  const bridge = fakeBridge(fixture(300, 300, 100, 30));
  const shown = await draw(bridge);
  assert.deepEqual(bridge.calls, {query: 5, edges: 23, read: 0});
  assert.equal(Math.ceil(730 / 32), 23);
  const last = shown.at(-1).next;
  assert.equal(shown.at(-1).done, true);
  // Placed through asset -> space -> home, and classified in the Home's zone.
  const p0 = last.rows.find((r) => r.id === 'my-home/maintenance/p0');
  assert.equal(p0.about, 'Asset 0 · Space 0');
  assert.deepEqual(last.notes, []);
  // Tiles never show a plan number before the plan-side calls are done.
  assert.equal(shown[0].next.plansFinal, false);
});

test('What\'s due: a TOO_LARGE answer splits the call in half and retries, down to one id', async () => {
  const data = fixture(20, 0, 10, 2);
  let first = true;
  const bridge = fakeBridge(data, (from, out) => {
    if (first) { first = false; throw Object.assign(new Error('too many'), {code: 'TOO_LARGE'}); }
    if (from.includes('my-home/maintenance/p3')) throw Object.assign(new Error('too many'), {code: 'TOO_LARGE'});
    return {edges: out, count: out.length};
  });
  const last = (await draw(bridge)).at(-1).next;
  assert.deepEqual(bridge.sizes, [32, 16, 8, 4, 2, 2, 1, 1, 4, 8, 16]);
  const p3 = last.rows.find((r) => r.id === 'my-home/maintenance/p3');
  assert.deepEqual(p3.notes, ['Some details couldn’t load.']);
  assert.equal(p3.about, '');
  assert.equal(last.rows.find((r) => r.id === 'my-home/maintenance/p2').about, 'Asset 2 · Space 0');
  assert.deepEqual(last.notes, [], 'a record too large to answer is not a refusal');
});

test('What\'s due: a refused call or a host without edges draws records without placement, said once', async () => {
  const refusing = fakeBridge(fixture(40, 5), () => { throw Object.assign(new Error('indexing'), {code: 'RUNTIME'}); });
  const refused = (await draw(refusing)).at(-1).next;
  assert.equal(refusing.calls.edges, 2);
  assert.deepEqual(refused.notes, ['Can’t show what some items are about right now.']);
  assert.ok(refused.rows.every((r) => r.about === '' && r.notes.length === 0));

  const older = fakeBridge(fixture(40, 5));
  const shown = await draw(older, {edges: false});
  assert.deepEqual(older.calls, {query: 5, edges: 0, read: 0}, 'no reads and no link parsing on such hosts');
  assert.deepEqual(shown.at(-1).next.notes, ['Can’t show what some items are about right now.']);
  // Without placement the plan falls back to its own zone, else the viewer's: still classified.
  assert.ok(shown.at(-1).next.rows.some((r) => r.section === 'soon' || r.section === 'overdue'));
});

test('What\'s due: labels are matched exactly and hostile text or targets place nothing', async () => {
  const data = fixture(1, 0, 1, 1);
  data.links = data.links.filter((l) => l.from !== 'my-home/maintenance/p0');
  for (const text of ['Asset', ' asset', 'asset ', 'ASSET', '<img src=x onerror=alert(1)>', '__proto__', 'constructor', 'x'.repeat(1024)]) {
    data.links.push({from: 'my-home/maintenance/p0', to: 'my-home/assets/a0', text});
  }
  data.links.push({from: 'my-home/maintenance/p0', to: '__proto__', text: 'space'}, {from: 'my-home/maintenance/p0', to: 'constructor', text: 'home'},
    {from: 'my-home/maintenance/p0', to: 'my-home/assets/a0', text: 7}, {from: 'elsewhere/x', to: 'my-home/assets/a0', text: 'asset'}, null);
  const last = (await draw(fakeBridge(data))).at(-1).next;
  const p0 = last.rows.find((r) => r.id === 'my-home/maintenance/p0');
  assert.equal(p0.about, '');
  assert.equal(p0.asset, null);
  assert.equal(p0.space, null);
  // The one exact label does place it.
  data.links.push({from: 'my-home/maintenance/p0', to: 'my-home/assets/a0', text: 'asset'});
  const placed = (await draw(fakeBridge(data))).at(-1).next.rows.find((r) => r.id === 'my-home/maintenance/p0');
  assert.equal(placed.about, 'Asset 0 · Space 0');
});

test('What\'s due: the View keeps no link parser of its own', () => {
  for (const gone of ['bodyLinks', 'Bridge.read(', 'MAX_SCAN', 'toLowerCase']) assert.equal(html.includes(gone), false, `still has ${gone}`);
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
