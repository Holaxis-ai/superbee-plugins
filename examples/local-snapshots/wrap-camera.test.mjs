import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, symlink, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { canonicalJson } from '@superbee/core/site-capabilities';
import { cameraSnapshot, sha256 } from './wrap-camera.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = fileURLToPath(new URL('./camera/', import.meta.url));
const wrapper = fileURLToPath(new URL('./wrap-camera.mjs', import.meta.url));

async function world(t) {
  const dir = await mkdtemp(join(tmpdir(), 'snapshot-example-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cameraFile = join(dir, 'camera.json');
  const settingsFile = join(dir, 'settings.json');
  const scene = join(dir, 'scene-original.txt');
  const reference = join(dir, 'reference-original.txt');
  const inputsFile = join(dir, 'selection.json');
  await writeFile(cameraFile, await readFile(join(fixtures, 'exported-camera.json')));
  await writeFile(settingsFile, await readFile(join(fixtures, 'original-settings.json')));
  await writeFile(scene, await readFile(join(fixtures, 'original-scene.txt')));
  await writeFile(reference, await readFile(join(fixtures, 'original-reference.txt')));
  await writeFile(inputsFile, JSON.stringify({ inputs: { scene, reference } }));
  const options = { cameraFile, settingsFile, inputsFile, key: 'shot-front-001', resource: 'urn:example:camera-study', generation: 1 };
  return { dir, scene, reference, options, snapshot: async override => JSON.parse(await cameraSnapshot({ ...options, ...override })) };
}

test('same selected bytes produce the checked-in snapshot, independent of acquisition path', async t => {
  const w = await world(t);
  const first = await cameraSnapshot(w.options);
  assert.deepEqual(first, await cameraSnapshot(w.options));
  assert.deepEqual(first, await readFile(join(fixtures, 'snapshot-g1.json')));
  const data = JSON.parse(first);
  assert.equal(data.complete, false);
  assert.deepEqual(data.records[0].camera, JSON.parse(await readFile(w.options.cameraFile)));
  assert.deepEqual(data.records[0].camera.matrixWorld, [[1, 0, 0, 0], [0, 1, 0, -8], [0, 0, 1, 3], [0, 0, 0, 1]]);
  const text = first.toString();
  for (const path of [w.dir, w.scene, w.reference, w.options.cameraFile, w.options.settingsFile, w.options.inputsFile]) {
    assert.equal(text.includes(path), false);
  }
});

test('rename and export relocation retain caller key; generation changes only when explicitly supplied', async t => {
  const w = await world(t);
  const before = await w.snapshot();
  const camera = before.records[0].camera;
  camera.camera = 'Renamed Camera';
  const moved = join(w.dir, 'moved-export.json');
  await writeFile(moved, JSON.stringify(camera));
  const renamed = await w.snapshot({ cameraFile: moved, generation: 2 });
  assert.equal(renamed.records[0].key, before.records[0].key);
  assert.equal(renamed.records[0].camera.camera, 'Renamed Camera');
  assert.deepEqual(renamed.evidence, before.evidence);
  assert.equal(renamed.generation, 2);
  assert.equal((await w.snapshot()).generation, 1);
  for (const generation of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(cameraSnapshot({ ...w.options, generation }));
  }
});

test('explicit original bytes and original settings affect their own evidence dimensions', async t => {
  const w = await world(t);
  const before = await w.snapshot();
  await writeFile(w.scene, 'changed synthetic original\n');
  const changedInput = await w.snapshot();
  const digest = data => data.evidence.inputs.find(row => row.id === 'scene').sha256;
  assert.notEqual(digest(before), digest(changedInput));
  assert.equal(changedInput.evidence.settings_digest, before.evidence.settings_digest);
  const settings = JSON.parse(await readFile(w.options.settingsFile));
  await writeFile(w.options.settingsFile, JSON.stringify(Object.fromEntries(Object.entries(settings).reverse())));
  assert.equal((await w.snapshot()).evidence.settings_digest, before.evidence.settings_digest);
  settings.samples = 16;
  await writeFile(w.options.settingsFile, JSON.stringify(settings));
  const changedSettings = await w.snapshot();
  assert.notEqual(changedSettings.evidence.settings_digest, before.evidence.settings_digest);
  assert.equal(changedSettings.evidence.settings_digest, sha256(canonicalJson(settings)));
  assert.equal(digest(changedSettings), digest(changedInput));
});

test('input and required identity namespaces stay separate and use only explicit selections', async t => {
  const w = await world(t);
  await writeFile(w.options.inputsFile, JSON.stringify({ inputs: { scene: w.scene }, required_identities: { scene: w.reference } }));
  const data = await w.snapshot();
  assert.deepEqual(data.evidence.inputs, [{ id: 'scene', sha256: sha256(await readFile(w.scene)) }]);
  assert.deepEqual(data.evidence.required_identities, [{ id: 'scene', sha256: sha256(await readFile(w.reference)) }]);
  assert.equal(data.evidence.association, 'caller_asserted');
});

test('closed selections, bounded JSON and ordinary-file constraints refuse without output', async t => {
  const w = await world(t);
  for (const selection of [{ inputs: {} }, { inputs: { '/path-id': w.scene } }, { inputs: { scene: w.scene }, manifest: w.scene }]) {
    await writeFile(w.options.inputsFile, JSON.stringify(selection));
    await assert.rejects(cameraSnapshot(w.options));
  }
  await writeFile(w.options.inputsFile, JSON.stringify({ inputs: { scene: w.scene } }));
  await writeFile(w.options.cameraFile, '{"number":1e999}');
  await assert.rejects(cameraSnapshot(w.options));
  await writeFile(w.options.cameraFile, '{"data":"' + 'x'.repeat(2 * 1024 * 1024) + '"}');
  await assert.rejects(cameraSnapshot(w.options));
  const symlinkPath = join(w.dir, 'linked.json');
  await symlink(join(fixtures, 'exported-camera.json'), symlinkPath);
  await assert.rejects(cameraSnapshot({ ...w.options, cameraFile: symlinkPath }));
  const hardlink = join(w.dir, 'hardlink-settings.json');
  await link(w.options.settingsFile, hardlink);
  await assert.rejects(cameraSnapshot({ ...w.options, cameraFile: join(fixtures, 'exported-camera.json') }));
});

test('CLI writes once and reports only digest/count facts', async t => {
  const w = await world(t);
  const output = join(w.dir, 'snapshot.json');
  const args = [wrapper, '--camera-file', w.options.cameraFile, '--settings-file', w.options.settingsFile,
    '--inputs-file', w.options.inputsFile, '--key', w.options.key, '--resource', w.options.resource, '--generation', '1', '--out', output];
  const receipt = JSON.parse(execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8' }));
  const first = await readFile(output);
  assert.deepEqual(receipt, { sha256: sha256(first), generation: 1, records: 1, complete: false });
  const repeat = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  assert.equal(repeat.status, 1);
  assert.equal(repeat.stderr.trim(), 'EXAMPLE_INPUT_INVALID_OR_IO_FAILURE');
  assert.deepEqual(await readFile(output), first);
});

test('nested benchmark generations retain stable case identity and original input basis', async () => {
  const base = new URL('./benchmark/', import.meta.url);
  const [first, second] = await Promise.all([1, 2].map(async generation => JSON.parse(await readFile(new URL(`snapshot-g${generation}.json`, base)))));
  assert.equal(first.records[0].key, second.records[0].key);
  assert.notEqual(first.records[0].result.label, second.records[0].result.label);
  assert.notEqual(first.records[0].result.metrics.latency.p95_ms, second.records[0].result.metrics.latency.p95_ms);
  assert.deepEqual(second.evidence, { v: 1, association: 'caller_asserted', inputs: [
    { id: 'workload', sha256: sha256(await readFile(new URL('original-workload.json', base))) },
  ] });
  assert.deepEqual([first.generation, second.generation], [1, 2]);
  assert.equal(first.scope, second.scope);
  assert.equal(second.complete, true);
  assert.equal(first.records.length - second.records.length, 1);
});
