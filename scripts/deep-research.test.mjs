import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {isolatedEnvironment} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const starter = path.join(root, 'examples/deep-research/create-example.mjs');
const actor = 'process:deep-research-consumer';
function exec(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', shell: false, timeout: 120_000, maxBuffer: 8 * 1024 * 1024, ...options});
  assert.ifError(result.error);
  return result;
}

test('Deep Research public CLI consumer: inert core, evidence graph, corrections and extension', {timeout: 300_000}, async t => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'deep-research-consumer-'));
  try {
    const home = path.join(scratch, 'home');
    await mkdir(home);
    const env = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath)}});
    let cli = process.env.DEEP_RESEARCH_CLI;
    if (!cli) {
      assert.ok(process.env.npm_execpath, 'Use npm exec -- node --test scripts/deep-research.test.mjs, or explicitly select DEEP_RESEARCH_CLI');
      const tool = path.join(scratch, 'tool');
      const installed = exec(process.execPath, [process.env.npm_execpath, 'install', '--prefix', tool, 'superbee@0.4.4-pre.9', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org/'], {env});
      assert.equal(installed.status, 0, installed.stderr || installed.stdout);
      cli = path.join(tool, 'node_modules/superbee/dist/superbee.mjs');
    }
    const invoke = argv => /\.(?:mjs|js)$/.test(cli) ? exec(process.execPath, [cli, ...argv, '--json'], {cwd: scratch, env}) : exec(cli, [...argv, '--json'], {cwd: scratch, env});
    function sb(argv) {
      const result = invoke(argv);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      return JSON.parse(result.stdout);
    }
    const identity = sb(['version']).identity;
    assert.equal(identity.package.version, '0.4.4-pre.9');
    assert.equal(identity.artifact.channel, 'npm-package');
    assert.equal(identity.source.dirty, false);
    t.diagnostic(`public CLI ${identity.package.version}, source ${identity.source.commit}`);

    // Consume copied recipe artifacts outside the checkout, not sibling Core sources.
    const core = path.join(scratch, 'portable-core');
    const extension = path.join(scratch, 'portable-extension');
    await cp(path.join(root, 'recipes/deep-research'), core, {recursive: true});
    await cp(path.join(root, 'examples/deep-research/extensions/place-history'), extension, {recursive: true});
    for (const recipe of [core, extension]) assert.equal(sb(['recipe', 'validate', recipe]).ok, true);

    function clean(bundle) {
      const state = sb(['status', '--dir', bundle]);
      for (const key of ['malformed', 'kind_warnings', 'unresolved_links', 'orphans', 'link_type_violations', 'conformance_debt']) assert.equal(state[key], 0, key);
      return state;
    }
    const read = (bundle, id) => sb(['doc', 'read', id, '--dir', bundle]);
    const links = (bundle, id, label) => sb(['link', 'show', id, '--text', label, '--dir', bundle]);
    const blank = path.join(scratch, 'blank');
    sb(['init', '--create-only', '--recipe', 'none', '--dir', blank]);
    sb(['recipe', 'add', core, '--actor', actor, '--dir', blank]);
    await t.test('inert installation, idempotent add and disjoint extension preserve base bytes', async () => {
      assert.equal(clean(blank).docs, 7, 'only four conventions and three references');
      assert.deepEqual((await readdir(path.join(blank, 'conventions'))).sort(), ['research-claim.md', 'research-observation.md', 'research-question.md', 'research-source.md']);
      const original = await readFile(path.join(blank, 'conventions/research-claim.md'));
      assert.equal(sb(['recipe', 'add', core, '--dir', blank]).changed, false);
      sb(['recipe', 'add', extension, '--dir', blank]);
      assert.deepEqual(await readFile(path.join(blank, 'conventions/research-claim.md')), original);
      assert.equal(sb(['recipe', 'add', extension, '--dir', blank]).changed, false);
      assert.equal(clean(blank).kinds, 5);
      // Re-add must not overwrite a local author's guidance or claim full application.
      const doc = read(blank, 'conventions/research-claim');
      sb(['doc', 'update', doc.id, '--body', doc.body + '\nLocal consumer guidance.\n', '--expected-version', doc.head_version, '--actor', actor, '--dir', blank]);
      const customized = await readFile(path.join(blank, 'conventions/research-claim.md'));
      const receipt = sb(['recipe', 'add', core, '--dir', blank]);
      assert.equal(receipt.changed, false);
      assert.ok(receipt.docs.some(row => row.source_differs));
      assert.deepEqual(await readFile(path.join(blank, 'conventions/research-claim.md')), customized);
    });

    const bundles = {};
    for (const name of ['house-history', 'technical', 'interview']) {
      const bundle = path.join(scratch, name);
      const result = exec(process.execPath, [starter, '--case', name, '--bundle', bundle, '--cli', cli], {cwd: scratch, env});
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(JSON.parse(result.stdout).synthetic, true);
      clean(bundle);
      bundles[name] = bundle;
    }
    await t.test('later house question reaches the missing original and retained correction', () => {
      const b = bundles['house-history'];
      assert.equal(read(b, 'research-questions/lantern-move').superbee_progress_status, 'blocked');
      assert.equal(read(b, 'research-sources/lantern-deed').inspection_state, 'referenced');
      assert.equal(links(b, 'research-questions/lantern-move', 'needs source').outbound[0].to, 'research-sources/lantern-deed');
      assert.equal(links(b, 'research-claims/lantern-current', 'supersedes claim').outbound[0].to, 'research-claims/lantern-old');
      assert.equal(read(b, 'research-claims/lantern-old').evidence_state, 'superseded');
      assert.equal(read(b, 'research-sources/lantern-index').independence_group, read(b, 'research-sources/lantern-transcript').independence_group);
      assert.equal(links(b, 'research-observations/lantern-pointer', 'drawn from').outbound[0].to, 'research-sources/lantern-index');
      assert.equal(links(b, 'research-claims/lantern-current', 'assessed by').backlink_count, 3, 'three domain comparisons refer to one canonical assessment');
    });
    await t.test('bounded technical result has independent support and explicit reasoning dependencies', () => {
      const b = bundles.technical;
      assert.match(read(b, 'research-claims/bench-scoped').scope, /small-input/);
      assert.equal(links(b, 'research-claims/bench-old', 'challenged by').outbound[0].to, 'research-observations/bench-large');
      assert.equal(links(b, 'research-claims/bench-applicability', 'depends on claim').outbound[0].to, 'research-claims/bench-scoped');
      // Explicitly withdraw one recorded support edge, then review; no automatic cascade is claimed.
      const current = read(b, 'research-claims/bench-scoped');
      const body = current.body.replace('[supported by](../research-observations/bench-a.md)', 'Support A withdrawn for this synthetic test; independent B still requires assessment.');
      sb(['doc', 'update', current.id, '--body', body, '--replace-links', '--review_state', 'unreviewed', '--expected-version', current.head_version, '--actor', actor, '--dir', b]);
      assert.equal(links(b, current.id, 'supported by').outbound[0].to, 'research-observations/bench-b');
      assert.equal(read(b, current.id).review_state, 'unreviewed');
      assert.equal(read(b, current.id).evidence_state, 'supported', 'no automatic truth inference from a changed edge');
      clean(b);
    });
    await t.test('interview remark and bounded negative do not become authority or universal absence', () => {
      const b = bundles.interview;
      const c = read(b, 'research-claims/interview-preference');
      assert.equal(c.assertion_mode, 'source_assertion');
      assert.match(c.scope, /not all users/);
      assert.match(c.statement, /do not establish approval/);
      assert.equal(read(b, 'research-questions/interview-authority').superbee_progress_status, 'open');
      assert.match(read(b, 'research-observations/approval-gap').observation, /selected/);
      assert.match(read(b, 'research-questions/interview-authority').revisit_when, /decision record/);
    });
    await t.test('existing target and strict create refusals preserve authored data; typed mistakes are detectable', async () => {
      const b = bundles.interview;
      const before = await readFile(path.join(b, 'research-claims/interview-preference.md'));
      const repeat = exec(process.execPath, [starter, '--case', 'interview', '--bundle', b, '--cli', cli], {env});
      assert.notEqual(repeat.status, 0);
      assert.deepEqual(await readFile(path.join(b, 'research-claims/interview-preference.md')), before);
      const invalid = invoke(['new', 'Research Source', 'bad', '--title', 'Invalid', '--citation', 'Fictional', '--inspection_state', 'proven-true', '--dir', b]);
      assert.notEqual(invalid.status, 0, 'inspection is not truth');
      assert.match(invalid.stderr + invalid.stdout, /inspection_state|proven-true/);
      const wrongTarget = invoke(['new', 'Research Observation', 'wrong-target', '--title', 'Wrong target', '--observation', 'Fictional', '--locator', 'Section 1', '--inspection_mode', 'source_text', '--body', '# Observation\nFictional\n# Evidence and method\n[drawn from](../research-claims/interview-preference.md)\n# Limits\nNegative control', '--dir', b]);
      if (wrongTarget.status === 0) assert.ok(sb(['status', '--dir', b]).link_type_violations > 0, 'native lint detects a Claim used as a Source');
      else assert.match(wrongTarget.stderr + wrongTarget.stdout, /link|Research Source|target/i, 'refusal must concern the typed target');
      // A syntactically valid supported claim without evidence can still be written.
      // Do not falsely advertise schema validity as an epistemic proof.
      sb(['new', 'Research Claim', 'unsupported-shape', '--title', 'Shape-only negative control', '--statement', 'Unsupported fictional proposition', '--scope', 'No inspected evidence', '--assertion_mode', 'hypothesis', '--evidence_state', 'supported', '--review_state', 'unreviewed', '--actor', actor, '--dir', b]);
      assert.equal(links(b, 'research-claims/unsupported-shape', 'supported by').outbound_count, 0);
    });
  } finally {
    await rm(scratch, {recursive: true, force: true});
  }
});
