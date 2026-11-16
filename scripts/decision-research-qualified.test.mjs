import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {parseMarkdown} from '@superbee/core';
import {buildRecipeIndex} from './build-recipe-index.mjs';
import {isolatedEnvironment} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const configuration = path.join(root, 'examples/decision-research-qualified/qualification.json');
const actor = 'process:qualified-recipe-pilot';
const candidateCommit = '578c8a0dac515f769148f10ca7404085e2588f44';
const ns = key => `github.com/holaxis-ai/superbee-plugins/${key}`;
const selector = (key, name) => `${ns(key)}/${name}`;

async function snapshot(dir) {
  const files = {};
  async function visit(relative) {
    for (const entry of await readdir(path.join(dir, relative), {withFileTypes: true})) {
      const next = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await visit(next);
      else {assert.ok(entry.isFile(), 'snapshot accepts regular files only'); files[next] = await readFile(path.join(dir, next), 'utf8');}
    }
  }
  await visit('');
  return files;
}

// Test adapter only: a complete, successful, trusted fixture envelope goes into a new
// private mkdtemp descendant. This is not a user-facing materializer or publisher.
async function materialize(envelope, destination) {
  assert.equal(envelope.schema, 'recipe-qualification-output/v1');
  assert.ok(envelope.files.length > 0 && envelope.files.length <= 512);
  assert.ok(Buffer.byteLength(JSON.stringify(envelope)) <= 16 * 1024 * 1024);
  const seen = new Set();
  for (const file of envelope.files) {
    assert.equal(typeof file.bytes, 'string');
    assert.ok(Buffer.byteLength(file.bytes) <= 2 * 1024 * 1024);
    assert.match(file.path, /^(decision|deep-research)\/[A-Za-z0-9_./-]+\.md$/);
    assert.ok(file.path.split('/').every(part => part && part !== '.' && part !== '..'));
    assert.ok(!seen.has(file.path)); seen.add(file.path);
  }
  await mkdir(destination); // refuse an occupied root before writing anything
  for (const file of envelope.files) {
    const target = path.join(destination, file.path);
    await mkdir(path.dirname(target), {recursive: true});
    await writeFile(target, file.bytes, {flag: 'wx'});
  }
}

test('real Decision and Deep Research qualified artifacts work through ordinary installed tools', {
  skip: !process.env.QUALIFIED_RECIPE_CLI && 'Set QUALIFIED_RECIPE_CLI to the installed reviewed candidate CLI; see examples/decision-research-qualified/README.md',
  timeout: 300_000,
}, async t => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'decision-research-qualified-'));
  t.after(() => process.env.QUALIFIED_RECIPE_KEEP_EVIDENCE === '1' ? undefined : rm(scratch, {recursive: true, force: true}));
  if (process.env.QUALIFIED_RECIPE_KEEP_EVIDENCE === '1') t.diagnostic(`retained synthetic evidence: ${scratch}`);
  const home = path.join(scratch, 'home'); await mkdir(home);
  const env = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath)}});
  const candidate = process.env.QUALIFIED_RECIPE_CLI;
  const consumer = process.env.QUALIFIED_RECIPE_CONSUMER_CLI || 'superbee';
  function invoke(cli, args) {
    const script = /\.[cm]?js$/.test(cli);
    const result = spawnSync(script ? process.execPath : cli, [...(script ? [cli] : []), ...args, '--json'], {
      cwd: scratch, env, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
    });
    assert.ifError(result.error);
    return result;
  }
  function ok(cli, args) {
    const result = invoke(cli, args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  }
  const identity = ok(candidate, ['version']).identity;
  assert.equal(identity.source.commit, candidateCommit);
  assert.equal(identity.source.dirty, false);
  assert.equal(identity.artifact.channel, 'npm-package');
  const old = ok(consumer, ['version']).identity;
  assert.equal(old.package.version, '0.4.6-pre.7');
  assert.equal(old.artifact.channel, 'npm-package');
  assert.equal(old.source.dirty, false);
  assert.notEqual(old.source.commit, candidateCommit, 'consumer must be the published older artifact, not the qualifier candidate');
  t.diagnostic(`qualifier ${identity.package.version}@${identity.source.commit}; published consumer ${old.package.version}@${old.source.commit}`);

  const bundle = path.join(scratch, 'bundle');
  const sb = args => ok(consumer, [...args, '--dir', bundle]);
  sb(['init', '--create-only', '--recipe', 'work-tracking']);
  sb(['doc', 'write', 'decisions/legacy', '--type', 'Decision', '--title', 'Legacy decision', '--body', 'Historical bare record.', '--actor', actor]);
  const before = await snapshot(bundle);
  const sourceBefore = await Promise.all(['decision', 'deep-research'].map(key => snapshot(path.join(root, 'recipes', key))));
  const envelope = ok(candidate, ['recipe', 'qualify', configuration, '--dir', bundle]);
  assert.deepEqual(ok(candidate, ['recipe', 'qualify', configuration, '--dir', bundle]), envelope);
  assert.deepEqual(await snapshot(bundle), before, 'preparation reads the prerequisite bundle only');
  assert.deepEqual(await Promise.all(['decision', 'deep-research'].map(key => snapshot(path.join(root, 'recipes', key)))), sourceBefore);
  assert.deepEqual(envelope.receipt.prerequisites.map(p => p.governs), ['Task']);
  const mapping = new Map(envelope.receipt.recipes.map(r => [r.key, r]));
  assert.equal(mapping.get('decision').kinds.length, 3);
  assert.equal(mapping.get('deep-research').kinds.length, 4);
  for (const [key, receipt] of mapping) {
    assert.equal(receipt.namespace, ns(key));
    assert.match(receipt.id, /^ns-[a-f0-9]{64}$/);
    for (const kind of receipt.kinds) assert.equal(kind.selector, selector(key, kind.source));
  }
  const headers = envelope.files.filter(f => f.path.includes('/conventions/')).map(f => parseMarkdown(f.bytes, f.path).frontmatter);
  assert.equal(new Set(headers.map(h => h.governs)).size, 7);
  const decision = headers.find(h => h.governs === selector('decision', 'Decision'));
  assert.equal(decision.title, 'Decision'); assert.equal(decision.path, 'decisions/');
  assert.equal(decision.links['supported by'], selector('deep-research', 'Research Claim'));
  assert.equal(decision.links['follow-up'], 'Task');
  const question = headers.find(h => h.governs === selector('decision', 'Decision Question'));
  assert.equal(question.links['needs research'], selector('deep-research', 'Research Question'));
  await writeFile(path.join(scratch, 'preparation.json'), JSON.stringify(envelope, null, 2));
  await writeFile(path.join(scratch, 'tool-identities.json'), JSON.stringify({qualifier: identity, consumer: old}, null, 2));
  const prepared = path.join(scratch, 'prepared'); await materialize(envelope, prepared);
  for (const key of mapping.keys()) assert.equal(ok(consumer, ['recipe', 'validate', path.join(prepared, key)]).ok, true);

  // Existing generator/parser/resolver compute and verify digests over EXPANDED bytes.
  // The production catalog remains untouched and the fixture claims no maintainer status.
  const indexed = path.join(scratch, 'indexed'); await mkdir(path.join(indexed, 'recipes'), {recursive: true});
  for (const [key, receipt] of mapping) await cp(path.join(prepared, key), path.join(indexed, 'recipes', receipt.id), {recursive: true});
  const ids = [...mapping.values()].map(r => r.id);
  const listing = {source: 'synthetic-qualified-pilot', title: 'Synthetic qualified pilot', recipes: ids.map(id => ({id, designation: 'community', maintainer: 'synthetic-fixture'})),
    cookbooks: [{id: 'decision-research', title: 'Decision and research', summary: 'Disposable artifact proof.', designation: 'community', maintainer: 'synthetic-fixture', recipes: ids}], removed: [], removed_cookbooks: []};
  await writeFile(path.join(indexed, 'recipe-index.source.json'), JSON.stringify(listing));
  const built = await buildRecipeIndex(indexed);
  for (const entry of built.index.recipes) {
    const receipt = [...mapping.values()].find(r => r.id === entry.id);
    assert.equal(entry.source_digest, receipt.output_digest);
    assert.equal(entry.files_digest, receipt.output_files_digest);
  }
  const index = path.join(indexed, 'recipe-index.json'); await writeFile(index, built.bytes);
  sb(['recipe', 'add', 'decision-research', '--cookbook', '--index', index, '--actor', actor]);
  assert.equal(sb(['recipe', 'add', 'decision-research', '--cookbook', '--index', index, '--actor', actor]).changed, false);
  for (const [file, bytes] of Object.entries(before)) assert.equal((await snapshot(bundle))[file], bytes, `legacy prerequisite ${file}`);
  assert.equal(sb(['doc', 'read', 'decisions/legacy']).type, 'Decision');

  function create(key, kind, id, fields, links = []) {
    const args = ['new', key ? selector(key, kind) : kind, id, '--title', `Synthetic ${id}`, '--actor', actor];
    for (const [name, value] of Object.entries(fields)) args.push(`--${name}`, value);
    for (const edge of links) args.push('--link', edge);
    return sb(args);
  }
  create('deep-research', 'Research Source', 'fixture', {citation: 'Synthetic bench output', inspection_state: 'inspected'});
  create('deep-research', 'Research Observation', 'fixture', {observation: 'Synthetic run completed.', locator: 'row 1', inspection_mode: 'execution_output'}, ['drawn from=research-sources/fixture']);
  create('deep-research', 'Research Claim', 'fixture', {statement: 'Option A fits this synthetic case.', scope: 'Fixture only', assertion_mode: 'inference', evidence_state: 'supported', review_state: 'unreviewed'}, ['supported by=research-observations/fixture']);
  create('deep-research', 'Research Question', 'fixture', {progress_status: 'answered', next_action: 'Recheck if fixture changes.'}, ['answered by=research-claims/fixture']);
  create('decision', 'Decision Option', 'fixture', {}, ['supported by=research-claims/fixture']);
  create('decision', 'Decision Question', 'fixture', {progress_status: 'resolved'}, ['considers=decision-options/fixture', 'needs research=research-questions/fixture']);
  create(null, 'Task', 'fixture', {progress_status: 'todo'});
  create('decision', 'Decision', 'fixture', {decision_status: 'proposed'}, ['selects=decision-options/fixture', 'resolves question=decision-questions/fixture', 'supported by=research-claims/fixture', 'follow-up=tasks/fixture']);
  assert.equal(sb(['link', 'show', 'decisions/fixture', '--text', 'follow-up']).outbound[0].to, 'tasks/fixture');
  assert.equal(sb(['link', 'show', 'research-observations/fixture', '--text', 'drawn from']).outbound[0].to, 'research-sources/fixture');
  assert.equal(sb(['list', '--type', selector('decision', 'Decision')]).count, 1);
  assert.equal(sb(['list', '--type', 'Decision']).count, 1, 'bare query still selects only legacy records');
  const current = sb(['doc', 'read', 'decisions/fixture']);
  sb(['doc', 'update', current.id, '--description', 'Updated through the published consumer.', '--expected-version', current.head_version, '--actor', actor]);
  assert.equal(sb(['doc', 'read', current.id]).description, 'Updated through the published consumer.');
  const state = sb(['status']);
  for (const key of ['malformed', 'kind_warnings', 'conformance_debt', 'link_type_violations', 'unresolved_links']) assert.equal(state[key], 0, key);

  await t.test('wrong relationship target is ordinary lint and duplicate creation preserves bytes', async () => {
    const bytes = await readFile(path.join(bundle, 'decisions/fixture.md'));
    const duplicate = invoke(consumer, ['new', selector('decision', 'Decision'), 'fixture', '--title', 'Overwrite attempt', '--decision_status', 'proposed', '--dir', bundle]);
    assert.notEqual(duplicate.status, 0); assert.deepEqual(await readFile(path.join(bundle, 'decisions/fixture.md')), bytes);
    const wrong = path.join(scratch, 'wrong-target'); await cp(bundle, wrong, {recursive: true});
    ok(consumer, ['link', 'add', 'decisions/fixture', 'tasks/fixture', '--text', 'supported by', '--actor', actor, '--dir', wrong]);
    assert.ok(ok(consumer, ['status', '--dir', wrong]).link_type_violations > 0);
  });

  await t.test('missing prerequisite, missing binding and View source emit no inventory', async () => {
    const absent = path.join(scratch, 'absent-task'); ok(consumer, ['init', '--create-only', '--recipe', 'none', '--dir', absent]);
    const config = JSON.parse(await readFile(configuration, 'utf8'));
    for (const entry of config.recipes) entry.source = path.relative(scratch, path.join(root, 'recipes', entry.key));
    async function refuses(value, dir, reason) {
      const file = path.join(scratch, 'refused.json'); await writeFile(file, JSON.stringify(value));
      const result = invoke(candidate, ['recipe', 'qualify', file, '--dir', dir]);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, reason);
      assert.doesNotMatch(result.stdout, /recipe-qualification-output\/v1|"files"\s*:|"receipt"\s*:/);
    }
    await refuses(config, absent, /Task/);
    const missing = structuredClone(config); delete missing.recipes[1].bindings['Research Claim']; await refuses(missing, bundle, /Research Claim/);
    const view = structuredClone(config); view.recipes[0].source = path.relative(scratch, path.join(root, 'recipes/my-home-maintenance')); await refuses(view, bundle, /unsupported|View|pages|views/i);
  });

  await t.test('compatible regeneration evolves only intended schema; incompatible required field refuses', async () => {
    const author = path.join(scratch, 'author'); await mkdir(author);
    for (const key of mapping.keys()) await cp(path.join(root, 'recipes', key), path.join(author, key), {recursive: true});
    const config = JSON.parse(await readFile(configuration, 'utf8'));
    for (const entry of config.recipes) entry.source = `./${entry.key}`;
    const file = path.join(author, 'qualification.json'); await writeFile(file, JSON.stringify(config));
    const convention = path.join(author, 'decision/conventions/decision.md');
    const original = await readFile(convention, 'utf8');
    await writeFile(convention, original.replace('optional: [description,', 'optional: [pilot_note, description,'));
    const manifest = path.join(author, 'decision/recipe.md');
    await writeFile(manifest, (await readFile(manifest, 'utf8')).replace('version: "0.1.1"', 'version: "0.1.2"'));
    const expanded = ok(candidate, ['recipe', 'qualify', file, '--dir', bundle]);
    for (const receipt of expanded.receipt.recipes) {
      assert.equal(receipt.id, mapping.get(receipt.key).id);
      assert.deepEqual(receipt.kinds, mapping.get(receipt.key).kinds);
      assert.deepEqual(receipt.definitions, mapping.get(receipt.key).definitions);
    }
    const next = path.join(scratch, 'next'); await materialize(expanded, next);
    const previous = await snapshot(bundle);
    const plan = sb(['recipe', 'evolve', path.join(next, 'decision')]);
    assert.equal(plan.ready, true, JSON.stringify(plan));
    sb(['recipe', 'evolve', path.join(next, 'decision'), '--apply', plan.plan_token, '--actor', actor]);
    const after = await snapshot(bundle);
    const ownDefinitions = new Set(mapping.get('decision').definitions.map(d => `${d.destination}.md`));
    for (const [name, bytes] of Object.entries(previous)) if (!ownDefinitions.has(name)) assert.equal(after[name], bytes, name);
    const evolved = sb(['doc', 'read', mapping.get('decision').definitions.find(d => d.source === 'conventions/decision').destination]);
    assert.ok(evolved.fields.optional.includes('pilot_note'));
    await writeFile(convention, original.replace('optional: [description,', 'optional: [pilot_note, description,').replace('required: [title, decision_status]', 'required: [title, decision_status, missing_required]'));
    await writeFile(manifest, (await readFile(manifest, 'utf8')).replace('version: "0.1.2"', 'version: "0.1.3"'));
    const incompatible = ok(candidate, ['recipe', 'qualify', file, '--dir', bundle]);
    const bad = path.join(scratch, 'incompatible'); await materialize(incompatible, bad);
    const refusal = invoke(consumer, ['recipe', 'evolve', path.join(bad, 'decision'), '--dir', bundle]);
    const result = JSON.parse(refusal.stdout);
    assert.equal(result.ready, false, JSON.stringify(result));
    assert.match(JSON.stringify(result), /missing_required/);
    assert.deepEqual(await snapshot(bundle), after);
  });
});
