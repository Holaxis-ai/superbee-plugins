import assert from 'node:assert/strict';
import {cp, mkdtemp, readFile, readdir, writeFile, mkdir, rm, symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {isolatedEnvironment} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function exec(args, options) {
  const p = spawnSync(process.execPath, args, {encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, ...options});
  assert.ifError(p.error);
  return p;
}
test('local recipe author adapter delegates to public Core on explicit snapshots', {timeout: 300000}, async t => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'recipe-author-preflight-'));
  try {
    const home = path.join(scratch, 'home'); await mkdir(home);
    const env = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath)}});
    const options = {env, cwd: scratch};
    assert.ok(process.env.npm_execpath, 'Run through npm exec -- node --test');
    const adapter = path.join(scratch, 'adapter');
    await cp(path.join(root, 'examples/deep-research/preflight'), adapter, {recursive: true, filter: p => !p.split(path.sep).includes('node_modules')});
    let p = exec([process.env.npm_execpath, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], {...options, cwd: adapter});
    assert.equal(p.status, 0, p.stderr);
    const tool = path.join(scratch, 'tool');
    p = exec([process.env.npm_execpath, 'install', '--prefix', tool, 'superbee@0.4.4-pre.9', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org/'], options);
    assert.equal(p.status, 0, p.stderr);
    const cli = path.join(tool, 'node_modules/superbee/dist/superbee.mjs');
    const core = path.join(scratch, 'core'); const extension = path.join(scratch, 'place');
    await cp(path.join(root, 'recipes/deep-research'), core, {recursive: true});
    await cp(path.join(root, 'examples/deep-research/extensions/place-history'), extension, {recursive: true});
    const plan = JSON.parse(await readFile(path.join(adapter, 'place-plan.json'), 'utf8'));
    plan.recipes[0].path = core; plan.recipes[1].path = extension;
    const planPath = path.join(scratch, 'plan.json');
    async function save(value = plan) { await writeFile(planPath, JSON.stringify(value, null, 2)); }
    await save();
    function sb(args) {const r = exec([cli, ...args, '--json'], options); assert.equal(r.status, 0, r.stderr || r.stdout); return JSON.parse(r.stdout);}
    function check(bundle, extra = []) {return exec([path.join(adapter, 'check.mjs'), '--plan', planPath, '--bundle', bundle, ...extra], options);}
    function blank(name) {const b = path.join(scratch, name); sb(['init', '--create-only', '--recipe', 'none', '--dir', b]); return b;}
    function add(b, recipe) {sb(['recipe', 'add', recipe, '--actor', 'process:preflight-test', '--dir', b]);}
    const good = blank('good'); add(good, core); add(good, extension);
    const evidence = path.join(scratch, 'evidence.json');
    await t.test('one command prepares complete evidence; public verdict valid; inputs stay unchanged', async () => {
      const before = await readFile(path.join(good, 'conventions/research-claim.md'));
      const r = check(good, ['--evidence', evidence]); assert.equal(r.status, 0, r.stderr || r.stdout);
      const report = JSON.parse(r.stdout); assert.equal(report.result.verdict, 'valid');
      const proof = JSON.parse(await readFile(evidence, 'utf8'));
      assert.equal(proof.input.selected.length, 2); assert.equal(proof.input.endpoints.length, 4);
      assert.equal(proof.input.placementInventories[0].files.length, 9);
      assert.deepEqual(await readFile(path.join(good, 'conventions/research-claim.md')), before);
      // No fixtures, hashes, observed stamps or snapshots are authored in the plan.
      assert.equal(plan.consumers[0].requirements.length, 4);
      assert.ok(!('observations' in plan)); assert.ok(!JSON.stringify(plan).includes('sha256:'));
      assert.ok(!JSON.stringify(plan).includes('x_recipe'));
      assert.ok((await readFile(evidence, 'utf8')).length > (await readFile(planPath, 'utf8')).length);
      const repeated = check(good); assert.equal(repeated.status, 0, repeated.stderr);
      assert.deepEqual(JSON.parse(repeated.stdout).result, report.result);
    });
    await t.test('missing base reports refusal instead of installing it', () => {
      const b = blank('missing-base'); add(b, extension);
      const r = check(b); assert.equal(r.status, 2, r.stderr || r.stdout);
      assert.ok(JSON.parse(r.stdout).result.issues.some(i => ['REQUIRED_KIND_MISSING', 'DEFINITION_UNOBSERVED'].includes(i.code)));
      assert.equal(sb(['status', '--dir', b]).kinds, 1);
      const empty = blank('empty'); const e = check(empty); assert.equal(e.status, 2, e.stderr || e.stdout);
    });
    await t.test('full convention inventory catches an unselected duplicate; does not hide it', async () => {
      const duplicate = path.join(good, 'conventions/duplicate-claim.md');
      await cp(path.join(good, 'conventions/research-claim.md'), duplicate);
      const r = check(good); assert.equal(r.status, 2, r.stderr || r.stdout);
      assert.ok(JSON.parse(r.stdout).result.issues.some(i => i.code === 'KIND_DUPLICATE_GOVERNS'));
      await rm(duplicate);
    });
    await t.test('explicit requirements matter; unsupported semantics remain partial', async () => {
      const wrong = structuredClone(plan); wrong.consumers[0].requirements[0].fields = ['nonexistent-field']; await save(wrong);
      let r = check(good); assert.equal(r.status, 2, r.stderr); assert.ok(JSON.parse(r.stdout).result.issues.some(i => i.code === 'REQUIRED_FIELD_MISSING'));
      const incomplete = structuredClone(plan); incomplete.consumers[0].requirements = incomplete.consumers[0].requirements.filter(r => r.id !== 'source'); await save(incomplete);
      r = check(good); assert.equal(r.status, 3, r.stderr); assert.ok(JSON.parse(r.stdout).result.issues.some(i => i.code === 'LINK_TARGET_UNOBSERVED'));
      const unsupported = structuredClone(plan); unsupported.consumers[0].requirements[0].unsupported = ['truth']; await save(unsupported);
      r = check(good); assert.equal(r.status, 3, r.stderr); assert.ok(JSON.parse(r.stdout).result.issues.some(i => i.code === 'UNSUPPORTED_CONSTRAINT'));
      await save();
    });
    await t.test('local customization is not erased or reported as exact recipe conformance', async () => {
      const f = path.join(good, 'conventions/research-claim.md'); const before = await readFile(f, 'utf8');
      await writeFile(f, before + '\nLocal customization.\n');
      const r = check(good); assert.equal(r.status, 2, r.stderr || r.stdout);
      assert.ok(JSON.parse(r.stdout).result.issues.some(i => ['LOCAL_ADAPTATION', 'DEFINITION_DIVERGENT'].includes(i.code)));
      assert.equal(await readFile(f, 'utf8'), before + '\nLocal customization.\n'); await writeFile(f, before);
    });
    await t.test('UTF-8 BOM is retained in supplied snapshot evidence', async () => {
      const file = path.join(good, 'conventions/research-claim.md');
      const before = await readFile(file);
      await writeFile(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), before]));
      const bomEvidence = path.join(scratch, 'bom-evidence.json');
      const r = check(good, ['--evidence', bomEvidence]);
      assert.ok([0, 2, 3].includes(r.status), r.stderr || r.stdout);
      const after = JSON.parse(await readFile(bomEvidence, 'utf8'));
      const snapshot = after.input.placementInventories[0].files.find(f => f.path === 'conventions/research-claim.md');
      assert.deepEqual(Buffer.from(snapshot.bytes, 'utf8'), await readFile(file), 'snapshot preserves physical UTF-8 BOM bytes');
      const baseline = JSON.parse(await readFile(evidence, 'utf8'));
      assert.notDeepEqual(after.input, baseline.input, 'BOM-only change cannot disappear from evidence');
      assert.notEqual(after.input.placementInventories[0].observedVersion, baseline.input.placementInventories[0].observedVersion);
      await writeFile(file, before);
      t.diagnostic(`BOM-only physical change retained; Core verdict ${after.report.result.verdict} remains Core policy`);
    });
    await t.test('collection controls refuse symlinks, overlarge files, wrong scope and output overwrite', async () => {
      const link = path.join(good, 'conventions/link.md'); await symlink(path.join(good, 'conventions/research-claim.md'), link);
      let r = check(good); assert.equal(r.status, 1); assert.match(r.stderr, /non-symlink/); await rm(link);
      const large = path.join(good, 'references/large.md'); await writeFile(large, 'a'.repeat(1024 * 1024 + 1));
      r = check(good); assert.equal(r.status, 1); assert.match(r.stderr, /1 MiB/); await rm(large);
      const bytes = await readFile(evidence); r = check(good, ['--evidence', evidence]); assert.equal(r.status, 1); assert.deepEqual(await readFile(evidence), bytes);
      r = check(good, ['--evidence', path.join(good, 'proof.json')]); assert.equal(r.status, 1); assert.match(r.stderr, /outside/);
      const unknown = structuredClone(plan); unknown.fetchDependencies = true; await save(unknown);
      r = check(good); assert.equal(r.status, 1); assert.match(r.stderr, /unknown field/); await save();
      const wrong = path.join(scratch, 'not-a-bundle'); await mkdir(wrong); r = check(wrong); assert.equal(r.status, 1);
      const dirs = await readdir(good); assert.ok(!dirs.includes('proof.json'));
    });
    t.diagnostic('Public Core 0.2.0-pre.41 and public CLI 0.4.4-pre.9; no sibling engine imports. Adapter computes evidence, Core owns all verdicts.');
  } finally {await rm(scratch, {recursive: true, force: true});}
});
