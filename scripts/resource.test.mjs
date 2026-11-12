import assert from 'node:assert/strict';
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {createWorkspace, isolatedEnvironment, runProcess} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
test('resource: portable inert recipe and native pointer relationships', {timeout: 300_000}, async t => {
  const workspace = await createWorkspace();
  try {
    const scratch = workspace.root, home = path.join(scratch, 'home');
    await mkdir(home);
    const env = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath)}});
    const run = (command, args, expected = 0) => runProcess(command, args, {cwd: scratch, env, expected, timeout: 120_000});
    assert.ok(process.env.npm_execpath, 'Run with npm exec -- node --test scripts/resource.test.mjs');
    const tool = path.join(scratch, 'tool');
    await run(process.execPath, [process.env.npm_execpath, 'install', '--prefix', tool, 'superbee@0.4.6-pre.2', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org/']);
    const cli = path.join(tool, 'node_modules/superbee/dist/superbee.mjs');
    const sb = async (args, expected = 0) => {
      const result = await run(process.execPath, [cli, ...args, '--json'], expected);
      return expected === 0 ? JSON.parse(result.stdout) : result.stdout + result.stderr;
    };
    const identity = (await sb(['version'])).identity;
    assert.equal(identity.package.version, '0.4.6-pre.2');
    assert.equal(identity.source.commit, '2b1d8f3f0c9e2e556e6f7a7343c3a82b559735db');
    assert.equal(identity.source.dirty, false);
    assert.equal(identity.artifact.channel, 'npm-package');
    const recipe = path.join(scratch, 'portable/resource'), bundle = path.join(scratch, 'bundle');
    await cp(path.join(root, 'recipes/resource'), recipe, {recursive: true});
    const native = (args, expected = 0) => sb([...args, '--actor', 'process:resource-example', '--dir', bundle], expected);
    const read = id => sb(['doc', 'read', id, '--dir', bundle]);
    const state = () => sb(['status', '--dir', bundle]);
    await t.test('portable validation and inert idempotent installation', async () => {
      assert.equal((await sb(['recipe', 'validate', recipe])).ok, true);
      await sb(['init', '--create-only', '--recipe', 'none', '--dir', bundle]);
      await native(['recipe', 'add', recipe]);
      assert.equal((await state()).docs, 2);
      assert.equal((await sb(['list', '--type', 'Resource', '--dir', bundle])).count, 0);
      const bytes = await readFile(path.join(bundle, 'conventions/resource.md'));
      assert.equal((await native(['recipe', 'add', recipe])).changed, false);
      assert.deepEqual(await readFile(path.join(bundle, 'conventions/resource.md')), bytes);
    });
    await t.test('minimal and full pointers preserve metadata and directed relationships', async () => {
      await native(['new', 'Resource', 'folder', '--title', 'Project folder', '--url', 'https://example.invalid/folder', '--resource_type', 'folder']);
      await native(['new', 'Resource', 'site', '--title', 'Project website', '--url', 'https://example.invalid/site']);
      const url = 'https://example.invalid/document?view=outline#scope';
      await native(['new', 'Resource', 'doc', '--title', 'Project overview', '--url', url, '--description', 'Start here.', '--resource_type', 'document', '--provider', 'google-drive', '--external_id', 'fictional-doc-id', '--media_type', 'application/vnd.google-apps.document', '--tags', 'project', '--tags', 'onboarding', '--link', 'part of=resources/folder', '--link', 'related to=resources/site']);
      const doc = await read('resources/doc');
      for (const [key, value] of Object.entries({title: 'Project overview', url, description: 'Start here.', resource_type: 'document', provider: 'google-drive', external_id: 'fictional-doc-id', media_type: 'application/vnd.google-apps.document', tags: ['project', 'onboarding']})) assert.deepEqual(doc[key], value);
      for (const [relation, target] of [['part of', 'resources/folder'], ['related to', 'resources/site']]) {
        const links = await sb(['link', 'show', 'resources/doc', '--text', relation, '--dir', bundle]);
        assert.equal(links.outbound.length, 1);
        assert.equal(links.outbound[0].to, target);
        assert.equal((await sb(['link', 'show', target, '--text', relation, '--dir', bundle])).outbound.length, 0);
      }
      const status = await state();
      for (const key of ['malformed', 'kind_warnings', 'unresolved_links', 'orphans', 'link_type_violations', 'conformance_debt']) assert.equal(status[key], 0, key);
      await native(['new', 'Resource', 'custom', '--title', 'Custom scheme', '--url', 'example-resource://catalog/123', '--resource_type', 'custom-domain-type']);
      assert.equal((await read('resources/custom')).url, 'example-resource://catalog/123');
      assert.equal((await state()).orphans, 1, 'a standalone pointer is a legitimate orphan');
    });
    await t.test('missing fields and invalid types are rejected without records', async () => {
      for (const args of [
        ['missing-url', '--title', 'Incomplete'],
        ['missing-title', '--url', 'https://example.invalid'],
      ]) {
        assert.match(await native(['new', 'Resource', ...args], 2), /required|missing/i);
      }
      const doc = await read('resources/doc');
      // A typed payload exercises native list validation rather than CLI string coercion.
      const invalid = path.join(scratch, 'invalid-tags.json');
      await writeFile(invalid, '[42]');
      assert.match(await native(['doc', 'field', 'replace-all', 'resources/doc', 'tags', '--from-file', invalid, '--expected-version', doc.head_version], 2), /string|list|type|tags/i);
      assert.equal((await read('resources/doc')).head_version, doc.head_version);
      assert.equal((await sb(['list', '--type', 'Resource', '--dir', bundle])).count, 4);
    });
    await t.test('wrong target Kind is visible to native diagnostics', async () => {
      await native(['doc', 'write', 'notes/not-resource', '--type', 'Note', '--title', 'Not a Resource', '--body', 'Synthetic wrong target.']);
      await native(['link', 'add', 'resources/doc', 'notes/not-resource', '--text', 'part of']);
      assert.equal((await state()).link_type_violations, 1);
    });
    await t.test('duplicate Resource conventions warn and select the first document ID', async () => {
      for (const name of ['asset', 'web-asset']) {
        const target = path.join(scratch, `collision-${name}`);
        const seed = path.join(scratch, `seed-${name}`);
        await mkdir(path.join(seed, 'conventions'), {recursive: true});
        await writeFile(path.join(seed, 'recipe.md'), `---\ntype: Recipe\nid: seed-${name}\ntitle: Synthetic existing Resource\nsummary: Existing Resource collision fixture.\nversion: "0.1.0"\ncontent_policy: definitions-only\n---\n# Synthetic fixture\n`);
        await writeFile(path.join(seed, `conventions/${name}.md`), `---\ntype: Convention\ntitle: Existing Resource\ngoverns: Resource\npath: resources/\nfields:\n  required: [title]\n---\n# Synthetic existing convention\n`);
        const local = (args, expected = 0) => sb([...args, '--dir', target, '--actor', 'process:resource-example'], expected);
        await sb(['init', '--create-only', '--recipe', 'none', '--dir', target]);
        await local(['recipe', 'add', seed]);
        await local(['new', 'Resource', 'existing', '--title', 'Existing pointer without URL']);
        const before = await readFile(path.join(target, 'resources/existing.md'));
        const installed = await local(['recipe', 'add', recipe]);
        assert.ok(installed.warnings.some(w => w.code === 'KIND_DUPLICATE_GOVERNS'));
        assert.deepEqual(await readFile(path.join(target, 'resources/existing.md')), before, 'installation does not rewrite existing instances');
        const status = await sb(['status', '--dir', target]);
        if (name === 'asset') {
          assert.equal(status.kind_warnings, 0);
          assert.equal(status.conformance_debt, 0);
          assert.match(await local(['new', 'Resource', 'new', '--title', 'New pointer', '--url', 'https://example.invalid/new'], 2), /unknown field/i);
        } else {
          assert.equal(status.kind_warnings, 1);
          assert.equal(status.conformance_debt, 1);
          await local(['new', 'Resource', 'new', '--title', 'New pointer', '--url', 'https://example.invalid/new']);
          assert.equal((await sb(['doc', 'read', 'resources/new', '--dir', target])).url, 'https://example.invalid/new');
        }
      }
    });
    t.diagnostic(`Public CLI ${identity.package.version}; source ${identity.source.commit}; synthetic pointers only.`);
  } finally {
    await workspace.close();
  }
});
