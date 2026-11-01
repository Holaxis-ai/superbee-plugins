import assert from 'node:assert/strict';
import test from 'node:test';
import {cp, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createWorkspace, isolatedEnvironment, runProcess} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const actor = 'process:my-house-fictional-consumer';
const packages = [
  ['core', 'my-house', 'base'],
  ['maintenance', 'my-house-maintenance', 'extension'],
  ['costs', 'my-house-costs', 'extension'],
];
async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(dir, prefix), {withFileTypes: true})) {
    const name = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(dir, name));
    else result.push({path: name, bytes: await readFile(path.join(dir, name), 'utf8')});
  }
  return result;
}

test('My House: installed public artifacts, inert composition and scoped fictional journeys', {timeout: 300_000}, async t => {
  const workspace = await createWorkspace();
  const scratch = workspace.root;
  try {
    const home = path.join(scratch, 'home');
    await mkdir(home);
    const env = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath)}});
    const run = (command, args, expected = 0) => runProcess(command, args, {cwd: scratch, env, expected, timeout: 120_000, maxBuffer: 8 * 1024 * 1024});
    assert.ok(process.env.npm_execpath, 'Run with npm exec -- node --test scripts/my-house-consumer.test.mjs');
    await writeFile(path.join(scratch, 'package.json'), JSON.stringify({private: true, type: 'module'}));
    await run(process.execPath, [process.env.npm_execpath, 'install', 'superbee@0.4.4-pre.9', '@superbee/core@0.2.0-pre.41', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org/']);
    const require = createRequire(path.join(scratch, 'package.json'));
    const core = await import(require.resolve('@superbee/core'));
    const {parseRecipeFiles} = await import(require.resolve('@superbee/core/recipes'));
    const {prepareRecipeInstall} = await import(require.resolve('@superbee/core/recipe-lifecycle'));
    const {preflightRecipeSet, recipePreflightDigest: digest} = await import(require.resolve('@superbee/core/recipe-set-preflight'));
    const {stringifyDoc} = await import(require.resolve('@superbee/core/document-codec'));
    const cli = path.join(scratch, 'node_modules/superbee/dist/superbee.mjs');
    const sb = async (args, expected = 0) => {
      const result = await run(process.execPath, [cli, ...args, '--json'], expected);
      if (expected === 0) return JSON.parse(result.stdout);
      // CLI usage failures may use their human error envelope even with --json.
      return {output: result.stdout + result.stderr};
    };
    const identity = (await sb(['version'])).identity;
    assert.equal(identity.package.version, '0.4.4-pre.9');
    assert.equal(identity.artifact.channel, 'npm-package');
    assert.equal(identity.source.dirty, false);
    assert.equal(JSON.parse(await readFile(path.join(path.dirname(require.resolve('@superbee/core')), '../package.json'), 'utf8')).version, '0.2.0-pre.41');

    // Consume copied artifacts outside the checkout. Never install into an ambient bundle.
    const example = path.join(scratch, 'example');
    await cp(path.join(root, 'examples/my-house'), example, {recursive: true});
    const parsed = new Map(), selected = [], recipeDirs = [];
    for (const [key, name, role] of packages) {
      const dir = path.join(scratch, name);
      await cp(path.join(root, 'recipes', name), dir, {recursive: true});
      recipeDirs.push(dir);
      assert.equal((await sb(['recipe', 'validate', dir])).ok, true);
      const artifactFiles = await files(dir);
      const loaded = parseRecipeFiles(artifactFiles, `copied-${name}`, {okfVersion: '0.2'});
      assert.equal(loaded.ok, true, JSON.stringify(loaded));
      assert.deepEqual(loaded.recipe.warnings, []);
      parsed.set(key, loaded.recipe);
      const artifact = {identity: {publisher: 'superbee-plugins', recipeId: loaded.recipe.id, release: loaded.recipe.version}, files: artifactFiles.map(f => ({...f, digest: digest(f.bytes)}))};
      selected.push({key, ...artifact.identity, role, artifactDigest: digest(artifact), artifact});
    }
    const descriptors = [];
    for (const name of ['consumer.json', 'maintenance-consumer.json']) {
      const descriptor = JSON.parse(await readFile(path.join(example, name), 'utf8'));
      descriptor.descriptorDigest = digest(descriptor);
      descriptors.push(descriptor);
    }
    function proposed(selection = selected) {
      const observations = selection.map(s => {
        const prepared = prepareRecipeInstall(parsed.get(s.key), {okfVersion: '0.2', now: '2026-01-01T00:00:00.000Z'});
        return {id: `${s.key}-proposal`, provider: s.key, scope: 'local', availability: 'available', complete: true, observedVersion: 'synthetic-proposal-not-live-observation', definitions: [...prepared.docs, ...prepared.references.map(r => r.doc)].map(d => ({id: d.id, bytes: stringifyDoc(d.frontmatter, d.body)}))};
      });
      return {schema: 'recipe-set-preflight/v1', selected: selection, consumers: descriptors, endpoints: descriptors.flatMap(c => c.requirements.map(r => ({id: `${c.id}:${r.id}`, consumer: c.id, requirement: r.id, placement: 'local'}))), observations, placementInventories: [{id: 'synthetic-proposed-placement', scope: 'local', availability: 'available', complete: true, observedVersion: 'synthetic-proposal-not-live-observation', files: observations.flatMap(o => o.definitions.map(d => ({path: `${d.id}.md`, bytes: d.bytes})))}]};
    }
    await t.test('existing preflight handles selected composition, missing base, collisions and unsupported predicates', async () => {
      const ready = await preflightRecipeSet(proposed());
      assert.equal(ready.verdict, 'valid', JSON.stringify(ready));
      assert.equal(ready.externalConsumers, 'unknown-out-of-scope');
      assert.equal((await preflightRecipeSet(proposed(selected.filter(s => s.key !== 'core')))).verdict, 'refused');
      const collision = proposed();
      collision.placementInventories[0].files.push({path: 'conventions/duplicate-home.md', bytes: collision.observations[0].definitions.find(d => d.id === 'conventions/my-house-home').bytes});
      assert.equal((await preflightRecipeSet(collision)).verdict, 'refused');
      const unsupported = proposed();
      unsupported.consumers = structuredClone(unsupported.consumers);
      unsupported.consumers[0].requirements[0].unsupported = ['financial-truth'];
      const {descriptorDigest: _old, ...changed} = unsupported.consumers[0];
      unsupported.consumers[0].descriptorDigest = digest(changed);
      assert.equal((await preflightRecipeSet(unsupported)).verdict, 'partial');
    });

    const bundle = path.join(scratch, 'fictional-bundle');
    const native = args => sb([...args, '--dir', bundle]);
    await native(['init', '--create-only', '--recipe', 'none']);
    for (const dir of recipeDirs) await native(['recipe', 'add', dir, '--actor', actor]);
    const clean = async () => {
      const state = await native(['status']);
      for (const key of ['malformed', 'kind_warnings', 'unresolved_links', 'link_type_violations', 'conformance_debt']) assert.equal(state[key], 0, `${key}: ${JSON.stringify(state)}`);
      return state;
    };
    await t.test('installation creates only seven definitions and static references; repeat preserves customization', async () => {
      const before = await clean();
      assert.equal(before.kinds, 7);
      const listing = await native(['list', '--limit', '0']);
      assert.ok(listing.docs.every(d => d.id.startsWith('conventions/') || d.id.startsWith('references/')));
      const observed = proposed();
      for (const observation of observed.observations) {
        for (const definition of observation.definitions) {
          definition.bytes = await readFile(path.join(bundle, `${definition.id}.md`), 'utf8');
        }
        observation.observedVersion = 'native-owned-single-writer-fixture';
      }
      observed.placementInventories[0].files = [];
      for (const doc of listing.docs) observed.placementInventories[0].files.push({path: `${doc.id}.md`, bytes: await readFile(path.join(bundle, `${doc.id}.md`), 'utf8')});
      observed.placementInventories[0].observedVersion = 'native-owned-single-writer-fixture';
      assert.equal((await preflightRecipeSet(observed)).verdict, 'valid', 'actual installed bytes, separately from proposed evidence');
      for (const dir of recipeDirs) assert.equal((await native(['recipe', 'add', dir, '--actor', actor])).changed, false);
      const id = 'conventions/my-house-home';
      const existing = await native(['doc', 'read', id]);
      await native(['doc', 'update', id, '--body', `${existing.body}\nLocal fictional customization.\n`, '--expected-version', existing.head_version, '--actor', actor]);
      const bytes = await readFile(path.join(bundle, `${id}.md`));
      const repeat = await native(['recipe', 'add', recipeDirs[0], '--actor', actor]);
      assert.equal(repeat.changed, false);
      assert.ok(repeat.docs.some(d => d.source_differs));
      assert.deepEqual(await readFile(path.join(bundle, `${id}.md`)), bytes);
    });
    await t.test('native authoring rejects invalid supplied dates, workflow enums and unsafe/fractional integers', async () => {
      for (const [id, args] of [
        ['bad-date', ['--record_kind', 'invoice', '--effective_on', '2026-02-30']],
        ['bad-enum', ['--record_kind', 'bank-transfer']],
        ['fraction', ['--record_kind', 'payment', '--amount_minor', '1.5']],
        ['unsafe', ['--record_kind', 'payment', '--amount_minor', '9007199254740992']],
      ]) {
        const result = await sb(['new', 'My House Money Record', `my-house/money/${id}`, '--title', 'Fictional invalid input', ...args, '--actor', actor, '--dir', bundle], 2);
        assert.match(JSON.stringify(result), /KIND_FIELD_TYPE|KIND_FIELD_VALUE/);
        assert.equal((await native(['list', '--limit', '0'])).docs.some(d => d.id.endsWith(`/${id}`)), false);
      }
    });

    // Fixture insertion uses the public strict mutation primitive, preserving nested breakdown data.
    const fixture = JSON.parse(await readFile(path.join(example, 'fixture.json'), 'utf8'));
    const registry = await core.loadKinds({root: bundle});
    assert.deepEqual(registry.warnings, []);
    const stored = [];
    for (const doc of fixture.documents) {
      await core.mutateDocument({bundle: {root: bundle}, id: doc.id, mode: 'create-only', registry, strict: true, actor, buildCandidate: () => ({frontmatter: doc.frontmatter, body: doc.body})});
      const read = await core.readDocVersioned({root: bundle}, doc.id);
      stored.push({...read.doc, version: read.version});
    }
    await clean();
    t.diagnostic(`Public CLI ${identity.package.version} source ${identity.source.commit}; public Core41. All writes are isolated fictional fixtures; no live bundle, plugin binding, scheduler or payment execution.`);
    // Reader assertions below are domain checks over the assessed snapshots, not native write invariants.
    const reader = await import(path.join(example, 'reader.mjs'));
    const policy = JSON.parse(await readFile(path.join(example, 'currency-policy.json'), 'utf8'));
    await exerciseReaders(t, reader, stored, policy, fixture);
    await run(process.execPath, ['--test', path.join(example, 'reader.test.mjs')]);
  } finally {
    await workspace.close();
  }
});

async function exerciseReaders(t, reader, documents, policy, fixture) {
  assert.equal(typeof reader.assessMaintenance, 'function');
  assert.equal(typeof reader.assessMoney, 'function');
  await t.test('native readback supports the exact staged money story without counting every stage as spend', () => {
    const expected = {
      quotes: ['0', '0', '0', '0', null],
      authorized: ['110000', '0', '0', '0', null],
      invoiced: ['112000', '112000', '0', '0', '112000'],
      partial: ['112000', '112000', '40000', '40000', '72000'],
      mistyped: ['112000', '112000', '110000', '110000', '2000'],
      corrected: ['112000', '112000', '112000', '112000', '0'],
      refunded: ['112000', '107000', '112000', '107000', '0'],
    };
    for (const [stage, ids] of Object.entries(fixture.stages)) {
      const input = documents.filter(d => d.frontmatter.type !== 'My House Money Record' || ids.includes(d.id));
      const report = reader.assessMoney(input, {scope: fixture.scope, policy});
      assert.deepEqual(report.unresolved, [], `${stage}: ${JSON.stringify(report)}`);
      const group = report.groups[0];
      assert.equal(group.totals.budget, '150000');
      assert.deepEqual([group.totals.committed, group.totals.net_invoiced, group.totals.gross_paid, group.totals.net_spent, group.invoices[0]?.outstanding ?? null], expected[stage]);
      assert.equal(group.quotes.length, 2, 'offers are alternatives, not cash');
      assert.ok(report.assessed.every(row => row.version), 'reader exposes native source versions');
    }
  });
  await t.test('native readback supports reported maintenance history; ownership moves do not move the old service', () => {
    const report = reader.assessMaintenance(documents, fixture.plan_id);
    assert.deepEqual(report.unresolved, []);
    assert.equal(report.last_completion.id, 'my-house/services/s01');
    assert.equal(report.last_completion.occurred_on, '2026-11-02');
    assert.equal(report.next_recorded_date.date, '2026-12-01');
    const changed = structuredClone(documents);
    changed.find(d => d.id === 'my-house/assets/a01').body = '[at home](/my-house/homes/h02.md)';
    assert.equal(reader.assessMaintenance(changed, fixture.plan_id).last_completion.location.id, 'my-house/homes/h01');
  });
  await t.test('household rollup counts each effective monetary fact once and does not roll project budgets into house budget', () => {
    const report = reader.assessMoney(documents, {scope: fixture.home_scope, policy});
    assert.deepEqual(report.unresolved, []);
    const group = report.groups[0];
    assert.equal(group.totals.net_spent, '107000');
    assert.equal(group.totals.budget, null, 'there is no directly Home-scoped budget');
    assert.equal(group.budgets.length, 1, 'Project budget remains separately visible');
  });
}
