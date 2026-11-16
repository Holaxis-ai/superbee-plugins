import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {parseMarkdown} from '@superbee/core';
import {isolatedEnvironment} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const ids = {decision: 'ns-10fe0c6e18c73ef84d3a025b4fda1a80fd97e7f950e7a949cbe607884f3026d3', 'deep-research': 'ns-815e3ae7d133368a71937aa924183b9b1643329543c6de13fa03ecd0ccbf35bb'};
const actor = 'process:qualified-recipe-consumer';
const selector = (key, name) => `github.com/holaxis-ai/superbee-plugins/${key}/${name}`;
const kinds = {decision: ['Decision Option', 'Decision Question', 'Decision'], 'deep-research': ['Research Claim', 'Research Observation', 'Research Question', 'Research Source']};

async function snapshot(dir) {
  const files = {};
  async function visit(relative) {
    for (const entry of await readdir(path.join(dir, relative), {withFileTypes: true})) {
      const next = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await visit(next);
      else {assert.ok(entry.isFile(), 'snapshot accepts regular files only'); files[next] = await readFile(path.join(dir, next), 'utf8');}
    }
  }
  await visit(''); return files;
}

function verifyDeclarations(artifacts) {
  const headers = [];
  for (const [key, files] of Object.entries(artifacts)) {
    assert.equal(parseMarkdown(files['recipe.md'], 'recipe.md').frontmatter.id, ids[key]);
    const declarations = Object.entries(files).filter(([name]) => name.startsWith('conventions/')).map(([name, bytes]) => parseMarkdown(bytes, name).frontmatter);
    assert.deepEqual(declarations.map(h => h.governs).sort(), kinds[key].map(name => selector(key, name)).sort());
    for (const h of declarations) assert.equal(h.title, h.governs.slice(selector(key, '').length), 'friendly title remains a label');
    headers.push(...declarations);
  }
  const declared = new Set(headers.map(h => h.governs));
  assert.equal(declared.size, 7);
  for (const h of headers) for (const target of Object.values(h.links ?? {})) assert.ok(target === 'Task' || declared.has(target), `unbound target: ${target}`);
  const decision = headers.find(h => h.governs === selector('decision', 'Decision'));
  assert.equal(decision.path, 'decisions/');
  assert.equal(decision.links['supported by'], selector('deep-research', 'Research Claim'));
  assert.equal(decision.links['follow-up'], 'Task');
  const question = headers.find(h => h.governs === selector('decision', 'Decision Question'));
  assert.equal(question.links['needs research'], selector('deep-research', 'Research Question'));
  return headers;
}

async function product() {
  return Object.fromEntries(await Promise.all(Object.entries(ids).map(async ([key, id]) => [key, await snapshot(path.join(root, 'recipes', id))])));
}

test('actual distributed declarations enforce exact identities and cross-recipe bindings', async () => {
  const artifacts = await product(); verifyDeclarations(artifacts);
  const wrong = structuredClone(artifacts);
  const file = `conventions/${ids.decision}/decision.md`;
  wrong.decision[file] = wrong.decision[file].replace(selector('deep-research', 'Research Claim'), 'Research Claim');
  assert.throws(() => verifyDeclarations(wrong), /unbound target: Research Claim/);
  const identity = structuredClone(artifacts);
  identity.decision[file] = identity.decision[file].replace(`governs: ${selector('decision', 'Decision')}`, 'governs: Decision');
  assert.throws(() => verifyDeclarations(identity), /Expected values to be strictly deep-equal/);
});

test('actual qualified recipes install, compose and evolve through published CLI', {timeout: 300_000}, async t => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'qualified-recipe-consumer-'));
  t.after(() => process.env.QUALIFIED_RECIPE_KEEP_EVIDENCE === '1' ? undefined : rm(scratch, {recursive: true, force: true}));
  if (process.env.QUALIFIED_RECIPE_KEEP_EVIDENCE === '1') t.diagnostic(`retained synthetic evidence: ${scratch}`);
  const home = path.join(scratch, 'home'); await mkdir(home);
  const env = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath)}});
  let consumer = process.env.QUALIFIED_RECIPE_CONSUMER_CLI;
  if (!consumer) {
    assert.ok(process.env.npm_execpath, 'Run through npm exec -- node --test or supply QUALIFIED_RECIPE_CONSUMER_CLI');
    const tool = path.join(scratch, 'tool');
    const installed = spawnSync(process.execPath, [process.env.npm_execpath, 'install', '--prefix', tool, 'superbee@0.4.6-pre.7', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org/'], {env, encoding: 'utf8', timeout: 120_000});
    assert.ifError(installed.error); assert.equal(installed.status, 0, installed.stderr || installed.stdout);
    consumer = path.join(tool, 'node_modules/superbee/dist/superbee.mjs');
  }
  function invoke(cli, args) {
    const script = /\.[cm]?js$/.test(cli);
    const result = spawnSync(script ? process.execPath : cli, [...(script ? [cli] : []), ...args, '--json'], {cwd: scratch, env, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024});
    assert.ifError(result.error); return result;
  }
  function ok(cli, args) {const r = invoke(cli, args); assert.equal(r.status, 0, r.stderr || r.stdout); return JSON.parse(r.stdout);}
  const identity = ok(consumer, ['version']).identity;
  assert.equal(identity.package.version, '0.4.6-pre.7');
  assert.equal(identity.artifact.channel, 'npm-package'); assert.equal(identity.source.dirty, false);
  assert.equal(identity.source.commit, 'f98d11d4e5ecabcc0ad9f60caa509c2cd36ee30b');
  t.diagnostic(`published consumer ${identity.package.version}@${identity.source.commit}`);
  await writeFile(path.join(scratch, 'tool-identity.json'), JSON.stringify(identity, null, 2));
  const artifacts = await product(); verifyDeclarations(artifacts);
  const bundle = path.join(scratch, 'bundle');
  const sb = args => ok(consumer, [...args, '--dir', bundle]);
  sb(['init', '--create-only', '--recipe', 'work-tracking']);
  sb(['doc', 'write', 'decisions/legacy', '--type', 'Decision', '--title', 'Legacy decision', '--body', 'Historical bare record.', '--actor', actor]);
  sb(['doc', 'write', 'research-claims/legacy', '--type', 'Research Claim', '--title', 'Legacy research', '--body', 'Historical bare research record.', '--actor', actor]);
  const before = await snapshot(bundle);
  const portable = path.join(scratch, 'portable'); await mkdir(portable);
  for (const [key, id] of Object.entries(ids)) {
    await cp(path.join(root, 'recipes', id), path.join(portable, key), {recursive: true});
    assert.equal(ok(consumer, ['recipe', 'validate', path.join(portable, key)]).ok, true);
  }
  // The normal product index, not a synthetic alternate catalog, selects research.
  sb(['recipe', 'add', 'research', '--cookbook', '--index', path.join(root, 'recipe-index.json'), '--actor', actor]);
  sb(['recipe', 'add', path.join(portable, 'decision'), '--actor', actor]);
  assert.equal(sb(['recipe', 'add', path.join(portable, 'decision'), '--actor', actor]).changed, false);
  for (const [file, bytes] of Object.entries(before)) assert.equal((await snapshot(bundle))[file], bytes, `legacy prerequisite ${file}`);
  assert.equal(sb(['doc', 'read', 'decisions/legacy']).type, 'Decision');
  assert.equal(sb(['doc', 'read', 'research-claims/legacy']).type, 'Research Claim');
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


  await t.test('strict invalid instance refusal does not create a record', () => {
    const invalid = invoke(consumer, ['new', selector('decision', 'Decision'), 'invalid', '--title', 'Invalid', '--decision_status', 'invented', '--dir', bundle]);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stdout + invalid.stderr, /KIND_FIELD_VALUE/);
    const missing = invoke(consumer, ['doc', 'read', 'decisions/invalid', '--dir', bundle]);
    assert.notEqual(missing.status, 0); assert.match(missing.stdout + missing.stderr, /NOT_FOUND/);
  });

  await t.test('ordinary additive evolution preserves records and incompatible schema refuses', async () => {
    const next = path.join(scratch, 'next'); await cp(path.join(portable, 'decision'), next, {recursive: true});
    const convention = path.join(next, 'conventions', ids.decision, 'decision.md');
    const original = await readFile(convention, 'utf8');
    assert.match(original, /optional:\n/);
    const additive = original.replace('optional:\n', 'optional:\n    - future_note\n');
    await writeFile(convention, additive);
    const manifest = path.join(next, 'recipe.md');
    await writeFile(manifest, (await readFile(manifest, 'utf8')).replace('version: 0.1.1', 'version: 0.1.2'));
    const previous = await snapshot(bundle);
    const plan = sb(['recipe', 'evolve', next]); assert.equal(plan.ready, true, JSON.stringify(plan));
    sb(['recipe', 'evolve', next, '--apply', plan.plan_token, '--actor', actor]);
    const after = await snapshot(bundle);
    for (const [name, bytes] of Object.entries(previous)) if (!name.startsWith(`conventions/${ids.decision}/`) && !name.startsWith(`references/${ids.decision}/`)) assert.equal(after[name], bytes, name);
    const evolved = sb(['doc', 'read', `conventions/${ids.decision}/decision`]); assert.ok(evolved.fields.optional.includes('future_note'));
    await writeFile(convention, additive.replace('required:\n', 'required:\n    - missing_required\n'));
    await writeFile(manifest, (await readFile(manifest, 'utf8')).replace('version: 0.1.2', 'version: 0.1.3'));
    const refusal = invoke(consumer, ['recipe', 'evolve', next, '--dir', bundle]);
    const result = JSON.parse(refusal.stdout); assert.equal(result.ready, false, JSON.stringify(result));
    assert.match(JSON.stringify(result), /missing_required/); assert.deepEqual(await snapshot(bundle), after);
  });
  assert.deepEqual(await product(), artifacts, 'product source bytes remain unchanged');
});
