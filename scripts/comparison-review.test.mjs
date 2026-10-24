import assert from 'node:assert/strict';
import {copyFile, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {parseMarkdown} from '@superbee/core';
import {parseRecipeFiles} from '@superbee/core/recipes';
import {decodeSnapshot} from '@superbee/core/source-engine';
import {createWorkspace, isolatedEnvironment, runProcess} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const recipeRoot = path.join(root, 'recipes/comparison-review');
const examples = path.join(root, 'examples/comparison-review');
const snapshots = path.join(root, 'examples/local-snapshots');
const actor = 'process:comparison-review-example';

// One installed CLI serves both consumers. Everything it observes or writes is synthetic.
test('comparison recipe preserves exact evidence and human decisions across two source refreshes', async t => {
  const files = [];
  async function collect(relative = '') {
    for (const entry of await readdir(path.join(recipeRoot, relative), {withFileTypes: true})) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) await collect(file);
      else files.push({path: file.split(path.sep).join('/'), bytes: await readFile(path.join(recipeRoot, file), 'utf8')});
    }
  }
  await collect();
  const parsed = parseRecipeFiles(files, 'comparison-review', {okfVersion: '0.2'});
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.recipe.governs, ['Comparison Finding']);
  assert.deepEqual(parsed.recipe.warnings, []);
  assert.equal(parsed.recipe.contentPolicy, 'definitions-only');
  assert.equal(parsed.recipe.references.length, 1);
  assert.equal(parsed.recipe.pages.length, 0);
  assert.equal(parsed.recipe.connectors, undefined);

  const workspace = await createWorkspace();
  const scratch = workspace.root;
  const home = path.join(scratch, 'home');
  await mkdir(home);
  const env = isolatedEnvironment({home, values: {PATH: path.dirname(process.execPath), SUPERBEE_ACTOR: actor}});
  const run = (command, args, expected = 0) => runProcess(command, args, {cwd: scratch, env, expected, timeout: 120_000, maxBuffer: 4 * 1024 * 1024});
  try {
    assert.ok(process.env.npm_execpath, 'run this proof with npm exec or npm run test:packaged');
    const selected = process.env.SUPERBEE_CLI_TARBALL ?? 'superbee@0.4.3';
    const selectedBytes = process.env.SUPERBEE_CLI_TARBALL ? await readFile(selected) : undefined;
    await writeFile(path.join(scratch, 'package.json'), JSON.stringify({private: true, type: 'module'}));
    await run(process.execPath, [process.env.npm_execpath, 'install', selected, '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org/']);
    const cli = path.join(scratch, 'node_modules/superbee/dist/superbee.mjs');
    const command = async (args, expected = 0) => (await run(process.execPath, [cli, ...args, '--json'], expected)).stdout;
    const json = async args => JSON.parse(await command(args));
    const identity = await json(['version']);
    const expectedVersion = selectedBytes ? '0.4.4-pre.4' : '0.4.3';
    const expectedSource = selectedBytes ? '128ccfcc43843e6dd97380a124b85e5bfe1d1711' : 'bb3589106691c27d15b156d8b45e4178836bd4be';
    assert.equal(identity.identity.package.version, expectedVersion);
    assert.equal(identity.identity.source.commit, expectedSource);
    assert.equal(identity.identity.source.dirty, false);
    assert.equal(identity.identity.artifact.channel, 'npm-package');
    t.diagnostic(`installed CLI ${expectedVersion} source=${identity.identity.source.commit} channel=${identity.identity.artifact.channel}`);

    for (const consumer of ['camera', 'benchmark']) {
      const bundle = path.join(scratch, consumer, '.superbee');
      const flags = ['--dir', bundle];
      await json(['init', '--create-only', '--recipe', 'none', ...flags]);
      await json(['recipe', 'add', recipeRoot, ...flags]);
      assert.deepEqual((await readdir(path.join(bundle, 'conventions'))).sort(), ['comparison-finding.md']);
      assert.deepEqual((await readdir(path.join(bundle, 'references'))).sort(), ['comparison-review.md']);
      await assert.rejects(readFile(path.join(bundle, 'comparison-findings/one.md')), {code: 'ENOENT'});
      const conventionFile = path.join(bundle, 'conventions/comparison-finding.md');
      await writeFile(conventionFile, await readFile(conventionFile, 'utf8') + '\nLocal authored guidance survives re-add.\n');
      const convention = await readFile(conventionFile);
      await json(['recipe', 'add', recipeRoot, ...flags]);
      assert.deepEqual(await readFile(conventionFile), convention, 're-add never overwrites the existing convention');

      const source = `sources/${consumer}`;
      const target = consumer === 'camera' ? 'camera-observations/front' : 'benchmark-results/search';
      const conventionName = consumer === 'camera' ? 'camera-observation' : 'benchmark-result';
      for (const [from, to] of [
        [path.join(snapshots, `conventions/${conventionName}.md`), `conventions/${conventionName}.md`],
        [path.join(root, 'recipes/source-feeds/conventions/signal.md'), 'conventions/signal.md'],
        [path.join(snapshots, `${source}.md`), `${source}.md`],
        [path.join(snapshots, `${target}.md`), `${target}.md`],
      ]) {
        await mkdir(path.dirname(path.join(bundle, to)), {recursive: true});
        await copyFile(from, path.join(bundle, to));
      }
      const g1 = path.join(snapshots, consumer, 'snapshot-g1.json');
      let g2 = path.join(snapshots, consumer, 'snapshot-g2.json');
      if (consumer === 'camera') {
        const next = JSON.parse(await readFile(g1, 'utf8'));
        next.generation = 2;
        next.records[0].camera.camera = 'Synthetic revised camera';
        next.records[0].camera.lensMm = 55;
        g2 = path.join(scratch, 'camera-g2.json');
        await writeFile(g2, JSON.stringify(next));
      }
      const binding = await json(['source', 'snapshot', 'bind', source, ...flags]);
      await json(['source', 'snapshot', 'bind', source, '--accept', binding.digest, ...flags]);
      async function ingest(file) {
        const preview = await json(['source', 'snapshot', 'run', source, '--snapshot', file, ...flags]);
        assert.equal(preview.effects_planned, false);
        return json(['source', 'snapshot', 'run', source, '--snapshot', file, '--accept', preview.digest, ...flags]);
      }
      assert.equal(decodeSnapshot(await readFile(g1)).data.generation, 1);
      assert.equal(decodeSnapshot(await readFile(g2)).data.generation, 2);
      await ingest(g1);
      const targetBody = parseMarkdown(await readFile(path.join(bundle, target + '.md'), 'utf8')).body;
      async function artifact(file, title) {
        const created = await json(['artifact', 'create', path.join(examples, file), '--title', title, ...flags]);
        const pulled = path.join(scratch, `${consumer}-${title.replaceAll(' ', '-')}.html`);
        const receipt = await json(['pull', '--doc-key', created.entry, '--out', pulled, ...flags]);
        assert.equal(receipt.version, created.entry_version);
        assert.deepEqual(await readFile(pulled), await readFile(path.join(examples, file)));
        return created;
      }
      const firstArtifact = await artifact(consumer === 'camera' ? 'camera-g1.html' : 'benchmark.html', `${consumer} synthetic first`);
      async function bodyFile(file, output, evidence, snapshot, more = {}) {
        const decoded = decodeSnapshot(await readFile(snapshot));
        const replacements = {artifact_id: evidence.id, artifact_entry: evidence.entry, artifact_entry_version: evidence.entry_version, generation: decoded.data.generation, snapshot_sha256: decoded.sha256, ...more};
        let body = await readFile(path.join(examples, file), 'utf8');
        for (const [key, value] of Object.entries(replacements)) body = body.replaceAll(`{{${key}}}`, String(value));
        assert.doesNotMatch(body, /\{\{/);
        for (const row of [
          `| Artifact ID | \`${evidence.id}\` |`,
          `| Artifact entry | \`${evidence.entry}\` |`,
          `| Artifact entry_version | \`${evidence.entry_version}\` |`,
          `| Capture generation | ${decoded.data.generation} |`,
          `| Exact snapshot SHA256 | \`${decoded.sha256}\` |`,
        ]) assert.ok(body.includes(row), `example must carry actual basis row: ${row}`);
        const out = path.join(scratch, output);
        await writeFile(out, body);
        return out;
      }
      const template = `${consumer}-finding.md`;
      const initialBody = await bodyFile(template, `${consumer}-body.md`, firstArtifact, g1, {observed_x: 35, offset: 3, p95_ms: 12.5});
      const id = 'comparison-findings/first';
      const create = ['new', 'Comparison Finding', id, '--title', `${consumer} synthetic discrepancy`, '--progress_status', 'open', '--assignee', actor, '--body-file', initialBody, ...flags];
      await json(create);
      const links = await json(['link', 'show', id, '--text', 'evidence', ...flags]);
      assert.ok(JSON.stringify(links).includes(firstArtifact.id));
      const badBody = path.join(scratch, 'missing-sections.md');
      await writeFile(badBody, '# Observation\nIncomplete synthetic record.\n');
      for (const [badId, extra, reason] of [
        ['bad-enum', ['--progress_status', 'approved', '--body-file', initialBody], /approved/],
        ['bad-sections', ['--progress_status', 'open', '--body-file', badBody], /section/i],
        ['bad-date', ['--progress_status', 'open', '--decided_at', 'yesterday', '--body-file', initialBody], /datetime|timestamp|date/i],
      ]) {
        const refusal = await command(['new', 'Comparison Finding', `comparison-findings/${badId}`, '--title', 'Invalid synthetic finding', ...extra, ...flags], 2);
        assert.match(refusal, reason);
        await assert.rejects(readFile(path.join(bundle, `comparison-findings/${badId}.md`)), {code: 'ENOENT'});
      }
      const head = await json(['doc', 'read', id, ...flags]);
      await json(['doc', 'update', id, '--progress_status', 'resolved', '--resolution', 'Synthetic process disposition: investigate this illustrated mismatch only; no human acceptance.', '--decided_at', '2026-10-20T12:00:00Z', '--expected-version', head.head_version, ...flags]);
      const historical = await readFile(path.join(bundle, id + '.md'));
      assert.ok(historical.toString().includes('resolved'));
      assert.ok(historical.toString().includes('Synthetic process disposition'));
      const rejected = await command(['doc', 'update', id, '--resolution', 'Stale overwrite attempt', '--expected-version', head.head_version, ...flags], 5);
      assert.match(rejected, /version|conflict/i);
      assert.deepEqual(await readFile(path.join(bundle, id + '.md')), historical);
      await ingest(g2);
      assert.deepEqual(await readFile(path.join(bundle, id + '.md')), historical, 'source refresh preserves finding, decision and pinned basis');
      const refreshed = parseMarkdown(await readFile(path.join(bundle, target + '.md'), 'utf8'));
      assert.equal(refreshed.body, targetBody);
      assert.equal(refreshed.frontmatter[consumer === 'camera' ? 'lens_mm' : 'p95_ms'], consumer === 'camera' ? 55 : 13);
      assert.deepEqual(await readFile(path.join(bundle, firstArtifact.entry)), await readFile(path.join(examples, consumer === 'camera' ? 'camera-g1.html' : 'benchmark.html')));

      const originalId = consumer === 'camera' ? 'scene' : 'workload';
      const originalFile = path.join(snapshots, consumer, consumer === 'camera' ? 'original-scene.txt' : 'original-workload.json');
      const selectedMap = path.join(scratch, `${consumer}-inputs.json`);
      const inputs = {[originalId]: originalFile};
      if (consumer === 'camera') inputs.reference = path.join(snapshots, 'camera/original-reference.txt');
      const settings = consumer === 'camera' ? ['--settings-file', path.join(snapshots, 'camera/original-settings.json')] : [];
      async function freshness(selected) {
        await writeFile(selectedMap, JSON.stringify({inputs: selected}));
        return json(['source', 'snapshot', 'check', g2, '--inputs-file', selectedMap, ...settings]);
      }
      assert.equal((await freshness(inputs)).status, 'current');
      const changed = path.join(scratch, `${consumer}-changed-original.txt`);
      await writeFile(changed, await readFile(originalFile, 'utf8') + '\nSynthetic changed original.\n');
      assert.equal((await freshness({...inputs, [originalId]: changed})).status, 'stale');
      assert.equal((await freshness({[originalId]: path.join(scratch, 'missing-original')})).status, 'unverifiable');
      assert.deepEqual(await readFile(path.join(bundle, id + '.md')), historical, 'applicability checks never restamp the historical decision');

      if (consumer === 'camera') {
        const nextArtifact = await artifact('camera-g2.html', 'camera synthetic successor');
        assert.notEqual(nextArtifact.entry_version, firstArtifact.entry_version);
        const nextBody = await bodyFile(template, 'camera-successor-body.md', nextArtifact, g2, {observed_x: 32, offset: 0});
        const nextId = 'comparison-findings/successor';
        await json(['new', 'Comparison Finding', nextId, '--title', 'Later synthetic camera assessment', '--progress_status', 'open', '--body-file', nextBody, ...flags]);
        await json(['link', 'add', nextId, id, '--text', 'supersedes', ...flags]);
        const successor = await readFile(path.join(bundle, nextId + '.md'), 'utf8');
        assert.ok(successor.includes(nextArtifact.entry_version));
        assert.ok(successor.includes(decodeSnapshot(await readFile(g2)).sha256));
        assert.deepEqual(await readFile(path.join(bundle, id + '.md')), historical);
      }
      await json(['list', '--type', 'Comparison Finding', ...flags]);
      const status = await json(['status', ...flags]);
      assert.ok(status);
      t.diagnostic(`${consumer}: real Artifact create/pull, enum/section/date refusals, stale CAS, refresh isolation and current/stale/unverifiable passed`);
    }
    if (selectedBytes) assert.deepEqual(await readFile(selected), selectedBytes, 'selected CLI archive remains unchanged');
  } finally {
    await workspace.close();
  }
});
