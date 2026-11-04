import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {copyFile, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {parseRecipeIndex, resolveCookbook} from '@superbee/core/recipe-sources';
import {buildRecipeIndex, compareVersions, escapeWorkflowData} from './build-recipe-index.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const script = fileURLToPath(new URL('./build-recipe-index.mjs', import.meta.url));

function manifest({id = 'alpha', title = 'Alpha', version = '1.0.0'} = {}) {
  return `---\ntype: Recipe\nid: ${id}\ntitle: ${title}\nversion: "${version}"\nsummary: Synthetic fixture.\ncontent_policy: definitions-only\n---\n# ${title}\n`;
}

function convention(kind, folder) {
  return `---\ntype: Convention\ntitle: ${kind}\ngoverns: ${kind}\npath: ${folder}/\ndescription: Synthetic fixture Kind.\nfields: {"required": ["title"]}\n---\n# ${kind}\n`;
}

const baseSource = {
  source: 'fixture',
  title: 'Fixture recipes',
  recipes: [
    {id: 'beta', designation: 'community', maintainer: 'example-org'},
    {id: 'alpha', designation: 'community', maintainer: 'example-org'},
  ],
  cookbooks: [{id: 'both', title: 'Both', summary: 'Synthetic.', designation: 'community', maintainer: 'example-org', recipes: ['alpha', 'beta']}],
  removed: [],
  removed_cookbooks: [],
};

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'recipe-index-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  for (const [id, kind] of [['alpha', 'Alpha Note'], ['beta', 'Beta Note']]) {
    await mkdir(path.join(root, 'recipes', id, 'conventions'), {recursive: true});
    await writeFile(path.join(root, 'recipes', id, 'recipe.md'), manifest({id, title: kind}));
    await writeFile(path.join(root, 'recipes', id, `conventions/${id}-note.md`), convention(kind, id));
  }
  await writeSource(root, baseSource);
  return root;
}

const writeSource = (root, source) => writeFile(path.join(root, 'recipe-index.source.json'), `${JSON.stringify(source, null, 2)}\n`);
const generate = (root, ...args) => spawnSync(process.execPath, [script, '--root', root, ...args], {encoding: 'utf8', env: {...process.env, GITHUB_ACTIONS: ''}});

function run(root, ...args) {
  const result = generate(root, ...args);
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', ...args], {encoding: 'utf8'});
}

/** A fixture with its first index committed, so --compare HEAD compares against it. */
async function published(t) {
  const root = await fixture(t);
  run(root);
  git(root, 'init', '--quiet');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'publish');
  return root;
}

function refused(result, pattern) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, pattern);
}

test('two runs give identical bytes in stable order', async t => {
  const root = await fixture(t);
  run(root);
  const first = await readFile(path.join(root, 'recipe-index.json'));
  run(root);
  assert.deepEqual(await readFile(path.join(root, 'recipe-index.json')), first);
  const index = JSON.parse(first.toString());
  assert.deepEqual(index.recipes.map(entry => entry.id), ['alpha', 'beta']);
  assert.deepEqual(index.recipes[0].files, ['conventions/alpha-note.md', 'recipe.md']);
  assert.doesNotMatch(first.toString(), /\d{4}-\d{2}-\d{2}T/);
});

test('the listing ignores local noise and refuses an undeclared file', async t => {
  const root = await fixture(t);
  run(root);
  const before = await readFile(path.join(root, 'recipe-index.json'));
  await writeFile(path.join(root, 'recipes/alpha/.DS_Store'), 'noise');
  run(root);
  assert.deepEqual(await readFile(path.join(root, 'recipe-index.json')), before);
  await writeFile(path.join(root, 'recipes/alpha/notes.md'), 'undeclared');
  refused(generate(root), /recipe 'alpha' does not parse/);
});

test('--check passes when current and fails on drift', async t => {
  const cases = [
    ['a changed recipe byte', root => writeFile(path.join(root, 'recipes/alpha/conventions/alpha-note.md'), `${convention('Alpha Note', 'alpha')}more\n`)],
    ['a changed title', root => writeFile(path.join(root, 'recipes/alpha/recipe.md'), manifest({title: 'Alpha Renamed'}))],
    ['a hand-edited index', async root => {
      const file = path.join(root, 'recipe-index.json');
      await writeFile(file, (await readFile(file, 'utf8')).replace('"community"', '"supported"'));
    }],
    ['a missing index', root => rm(path.join(root, 'recipe-index.json'))],
  ];
  for (const [name, change] of cases) {
    await t.test(name, async t => {
      const root = await fixture(t);
      run(root);
      run(root, '--check');
      await change(root);
      refused(generate(root, '--check'), /does not match/);
    });
  }
});

test('the generator refuses a cookbook whose members install the same target', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'recipes/beta/conventions/alpha-note.md'), convention('Alpha Note', 'alpha'));
  refused(generate(root), /RECIPE_INDEX_COOKBOOK_CONFLICT/);
});

test('the generator refuses a folder declaring another id and an unorderable version', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'recipes/alpha/recipe.md'), manifest({id: 'other'}));
  refused(generate(root), /declares recipe id 'other'/);
  await writeFile(path.join(root, 'recipes/alpha/recipe.md'), manifest({version: 'latest'}));
  refused(generate(root), /has version 'latest'/);
});

test('compareVersions follows semver precedence', () => {
  const ascending = ['0.1.0-pre.2', '0.1.0-pre.10', '0.1.0-rc', '0.1.0', '0.2.0', '1', '1.0.1', '2', '10'];
  for (let i = 1; i < ascending.length; i += 1) {
    assert.equal(compareVersions(ascending[i - 1], ascending[i]), -1, `${ascending[i - 1]} < ${ascending[i]}`);
    assert.equal(compareVersions(ascending[i], ascending[i - 1]), 1);
  }
  assert.equal(compareVersions('1', '1.0.0'), 0);
});

test('a changed recipe at the same version is refused', async t => {
  const root = await published(t);
  await writeFile(path.join(root, 'recipes/alpha/recipe.md'), `${manifest({title: 'Alpha Note'})}\nchanged\n`);
  run(root);
  refused(generate(root, '--compare', 'HEAD'), /recipe 'alpha' version 1\.0\.0 is immutable, but its files_digest changed/);
});

test('an added file at the same version is refused', async t => {
  const root = await published(t);
  await writeFile(path.join(root, 'recipes/alpha/conventions/extra.md'), convention('Alpha Extra', 'alpha-extra'));
  run(root);
  refused(generate(root, '--compare', 'HEAD'), /its file list changed/);
});

test('a bumped version passes and a version going backwards is refused', async t => {
  const root = await published(t);
  run(root, '--compare', 'HEAD');
  await writeFile(path.join(root, 'recipes/alpha/recipe.md'), manifest({title: 'Alpha Note', version: '1.1.0'}));
  run(root);
  run(root, '--compare', 'HEAD');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'bump');
  await writeFile(path.join(root, 'recipes/alpha/recipe.md'), manifest({title: 'Alpha Note', version: '1.0.0'}));
  run(root);
  refused(generate(root, '--compare', 'HEAD'), /version must move forward, but went from 1\.1\.0 to 1\.0\.0/);
});

test('removing a listed recipe needs a marker, which then stays', async t => {
  const root = await published(t);
  const without = {...baseSource, recipes: baseSource.recipes.filter(entry => entry.id !== 'beta'), cookbooks: [{...baseSource.cookbooks[0], recipes: ['alpha']}]};
  await writeSource(root, without);
  run(root);
  refused(generate(root, '--compare', 'HEAD'), /recipe 'beta' was removed without a marker/);

  await writeSource(root, {...without, removed: [{id: 'beta', last_version: '0.9.0', reason: 'Synthetic.'}]});
  refused(generate(root, '--compare', 'HEAD'), /says last_version '0\.9\.0'/);

  await writeSource(root, {...without, removed: [{id: 'beta', last_version: '1.0.0', reason: 'Synthetic.'}]});
  const removed = run(root, '--compare', 'HEAD');
  assert.match(removed.stdout, /maintainer decision: recipe 'beta' version 1\.0\.0 is removed/);
  run(root);
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'remove beta');

  await writeSource(root, {...baseSource, removed: [{id: 'beta', last_version: '1.0.0', reason: 'Synthetic.'}]});
  refused(generate(root), /marked removed and cannot be listed again/);

  await writeSource(root, without);
  refused(generate(root, '--compare', 'HEAD'), /removed marker for 'beta' must stay/);
});

test('designation and listing changes surface as maintainer decisions without failing', async t => {
  const root = await published(t);
  const recipes = baseSource.recipes.map(entry => entry.id === 'alpha' ? {...entry, designation: 'supported'} : entry);
  await writeSource(root, {...baseSource, recipes});
  const result = run(root, '--compare', 'HEAD');
  assert.match(result.stdout, /maintainer decision: recipe 'alpha' designation changes from 'community' to 'supported'/);
  const annotated = spawnSync(process.execPath, [script, '--root', root, '--compare', 'HEAD'], {encoding: 'utf8', env: {...process.env, GITHUB_ACTIONS: 'true'}});
  assert.equal(annotated.status, 0);
  assert.match(annotated.stdout, /^::warning file=recipe-index\.source\.json::maintainer decision: recipe 'alpha'/m);
});

test('a base without an index is a first publish, and an unresolvable base fails', async t => {
  const root = await fixture(t);
  run(root);
  git(root, 'init', '--quiet');
  git(root, 'commit', '--quiet', '--allow-empty', '-m', 'empty');
  const first = run(root, '--compare', 'HEAD');
  assert.match(first.stdout, /every listing below is new/);
  assert.match(first.stdout, /recipe 'alpha' is newly listed as community/);
  refused(generate(root, '--compare', 'no-such-ref'), /cannot resolve base ref/);
  refused(generate(root, '--compare', '--output=x'), /is not a git ref/);
});

test('removing a cookbook needs a marker, which then stays and blocks reuse', async t => {
  const root = await published(t);
  const without = {...baseSource, cookbooks: []};
  await writeSource(root, without);
  run(root);
  refused(generate(root, '--compare', 'HEAD'), /cookbook 'both' was removed without a marker/);

  const marked = {...without, removed_cookbooks: [{id: 'both', reason: 'Synthetic.'}]};
  await writeSource(root, marked);
  assert.match(run(root, '--compare', 'HEAD').stdout, /maintainer decision: cookbook 'both' is removed from the index: Synthetic\./);
  run(root);
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'remove cookbook');

  await writeSource(root, {...baseSource, removed_cookbooks: marked.removed_cookbooks});
  refused(generate(root), /cookbook 'both' is marked removed/);
  await writeSource(root, without);
  refused(generate(root, '--compare', 'HEAD'), /removed marker for cookbook 'both' must stay/);
});

const hostile = 'x\n::stop-commands::abc';
const noCommandLine = result => assert.doesNotMatch(result.stdout + result.stderr, /^::stop-commands/m);

test('every free-text field refuses control characters and excess length', async t => {
  const fields = [
    ['title', source => ({...source, title: hostile})],
    ['recipes[0].maintainer', source => ({...source, recipes: [{...source.recipes[0], maintainer: hostile}, source.recipes[1]]})],
    ['recipes[0].designation', source => ({...source, recipes: [{...source.recipes[0], designation: hostile}, source.recipes[1]]})],
    ['cookbooks[0].title', source => ({...source, cookbooks: [{...source.cookbooks[0], title: hostile}]})],
    ['cookbooks[0].summary', source => ({...source, cookbooks: [{...source.cookbooks[0], summary: hostile}]})],
    ['cookbooks[0].maintainer', source => ({...source, cookbooks: [{...source.cookbooks[0], maintainer: hostile}]})],
    ['removed[0].reason', source => ({...source, removed: [{id: 'gone', last_version: '1', reason: hostile}]})],
    ['removed[0].last_version', source => ({...source, removed: [{id: 'gone', last_version: hostile, reason: 'Synthetic.'}]})],
    ['removed_cookbooks[0].reason', source => ({...source, removed_cookbooks: [{id: 'gone', reason: hostile}]})],
  ];
  const root = await fixture(t);
  for (const [where, change] of fields) {
    await writeSource(root, change(baseSource));
    const result = generate(root);
    refused(result, new RegExp(`${where.replace(/[[\]]/g, '\\$&')} contains a control or format character`));
    noCommandLine(result);
  }
  await writeSource(root, {...baseSource, removed: [{id: 'gone', last_version: '1', reason: 'r'.repeat(1001)}]});
  refused(generate(root), /removed\[0\]\.reason must be a nonempty string of at most 1000/);
  await writeSource(root, {...baseSource, recipes: [{...baseSource.recipes[0], maintainer: 'm'.repeat(201)}, baseSource.recipes[1]]});
  refused(generate(root), /recipes\[0\]\.maintainer must be a nonempty string of at most 200/);
  await writeSource(root, {...baseSource, removed: [{id: 'x\n::stop-commands::abc', last_version: '1', reason: 'r'}]});
  refused(generate(root), /removed\[0\]\.id is not a plain id/);
});

test('workflow command data cannot start a new command', async t => {
  assert.equal(escapeWorkflowData('50%\r\n::stop-commands::abc'), '50%25%0D%0A::stop-commands::abc');
  const root = await fixture(t);
  await writeFile(path.join(root, 'recipes/alpha/recipe.md'), manifest({id: '"a\\n::stop-commands::abc"'}));
  const result = generate(root);
  assert.equal(result.status, 1);
  noCommandLine(result);
});

test('a symlinked recipe root is refused', async t => {
  const root = await fixture(t);
  await rename(path.join(root, 'recipes/alpha'), path.join(root, 'elsewhere'));
  await symlink(path.join(root, 'elsewhere'), path.join(root, 'recipes/alpha'));
  refused(generate(root), /recipes\/alpha must be a real directory/);
  await rm(path.join(root, 'recipes/alpha'));
  await rename(path.join(root, 'elsewhere'), path.join(root, 'recipes/alpha'));
  await rename(path.join(root, 'recipes'), path.join(root, 'moved'));
  await symlink(path.join(root, 'moved'), path.join(root, 'recipes'));
  refused(generate(root), /recipes must be a real directory/);
});

test('ids differing only by case are refused across every list', async t => {
  const root = await fixture(t);
  const cases = [
    {...baseSource, recipes: [...baseSource.recipes, {id: 'ALPHA', designation: 'community', maintainer: 'example-org'}]},
    {...baseSource, cookbooks: [...baseSource.cookbooks, {...baseSource.cookbooks[0], id: 'Both'}]},
    {...baseSource, cookbooks: [{...baseSource.cookbooks[0], id: 'Alpha'}]},
    {...baseSource, removed: [{id: 'Beta', last_version: '1', reason: 'Synthetic.'}]},
    {...baseSource, removed_cookbooks: [{id: 'BOTH', reason: 'Synthetic.'}]},
  ];
  for (const source of cases) {
    await writeSource(root, source);
    refused(generate(root), /differ only by case/);
  }
});

test('a recipe and a cookbook may share one exact id', async t => {
  const root = await fixture(t);
  await writeSource(root, {...baseSource, cookbooks: [{...baseSource.cookbooks[0], id: 'alpha'}]});
  run(root);
});

test('.gitattributes keeps digests stable through a line-ending-converting checkout', async t => {
  const root = await fixture(t);
  await copyFile(path.join(repo, '.gitattributes'), path.join(root, '.gitattributes'));
  run(root);
  git(root, 'init', '--quiet');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'publish');
  const clone = await mkdtemp(path.join(tmpdir(), 'recipe-index-crlf-'));
  t.after(() => rm(clone, {recursive: true, force: true}));
  execFileSync('git', ['clone', '--quiet', '-c', 'core.autocrlf=true', '-c', 'core.eol=crlf', root, clone]);
  assert.doesNotMatch(await readFile(path.join(clone, 'recipes/alpha/recipe.md'), 'utf8'), /\r/);
  run(clone, '--check');
});

test('the committed index is current and Core accepts it', async () => {
  const bytes = await readFile(path.join(repo, 'recipe-index.json'));
  const parsed = parseRecipeIndex(bytes);
  assert.equal(parsed.ok, true, JSON.stringify(parsed.error));
  assert.deepEqual((await buildRecipeIndex(repo)).bytes, bytes);
  assert.deepEqual(parsed.index.recipes.map(entry => entry.id), ['deep-research', 'my-home', 'my-home-costs', 'my-home-maintenance']);
  assert.deepEqual(parsed.index.cookbooks.map(entry => [entry.id, entry.recipes]), [
    ['my-home', ['my-home', 'my-home-maintenance', 'my-home-costs']],
    ['research', ['deep-research']],
  ]);
  assert.match(parsed.index.cookbooks[1].summary, /experimental/i);
  assert.equal(parsed.index.recipes[0].version, '0.1.0-pre.2');
});

test('both cookbooks resolve through a reader over this checkout, verifying every digest', async () => {
  const {index} = parseRecipeIndex(await readFile(path.join(repo, 'recipe-index.json')));
  const seen = [];
  const read = location => {
    seen.push(location);
    return readFile(path.join(repo, location));
  };
  for (const [id, members] of [['my-home', ['my-home', 'my-home-maintenance', 'my-home-costs']], ['research', ['deep-research']]]) {
    const result = await resolveCookbook(index, id, read);
    assert.equal(result.ok, true, JSON.stringify(result.error));
    assert.deepEqual(result.recipes.map(entry => entry.recipe.id), members);
    for (const entry of result.recipes) {
      assert.equal(entry.source_digest, index.recipes.find(candidate => candidate.id === entry.recipe.id).source_digest);
    }
  }
  const listed = index.recipes.flatMap(entry => entry.files.map(file => `${entry.root}/${file}`));
  assert.deepEqual(seen.sort(), listed.sort());

  const tampered = await resolveCookbook(index, 'research', async location => {
    const bytes = await readFile(path.join(repo, location));
    return location.endsWith('recipe.md') ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;
  });
  assert.equal(tampered.ok, false);
  assert.equal(tampered.error.code, 'RECIPE_INDEX_DIGEST_MISMATCH');
});
