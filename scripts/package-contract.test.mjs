import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const readJson = async file => JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
test('private integration metadata retains optional compatibility and lockfile contains only installable tools',async () => {
  const root = await readJson('../package.json');
  const pkg = await readJson('../integrations/github/package.json');
  const lock = await readJson('../package-lock.json');
  assert.deepEqual(root.workspaces,['integrations/*']);
  assert.equal(pkg.name,'@superbee/integration-github');
  assert.equal(pkg.version,'0.1.0-pre.1');
  assert.equal(pkg.private,true);
  assert.equal(pkg.publishConfig,undefined);
  assert.deepEqual(pkg.repository,{type:'git',url:'git+https://github.com/Holaxis-ai/superbee-plugins.git',directory:'integrations/github'});
  assert.deepEqual(pkg.peerDependencies,{'@superbee/core':'0.2.0-pre.32'});
  assert.deepEqual(pkg.peerDependenciesMeta,{'@superbee/core':{optional:true}});
  assert.equal(pkg.superbeeIntegration.core,pkg.peerDependencies['@superbee/core']);
  assert.deepEqual(pkg.superbeeIntegration.profiles,[{id:'github-issues',version:1,entry:'dist/profile.mjs'}]);
  assert.equal(pkg.dependencies,undefined);
  assert.equal(pkg.devDependencies,undefined);
  assert.equal(root.dependencies,undefined);
  assert.equal(root.devDependencies['@superbee/core'],undefined);
  assert.equal(lock.packages['node_modules/@superbee/core'],undefined,'npm ci must not require unpublished Core');
  for (const [name,row] of Object.entries(lock.packages)) {
    if (row.link) assert.ok(['integrations/github','integrations/blender'].includes(row.resolved));
    else if (name.startsWith('node_modules/')) assert.match(row.resolved,/^https:\/\/registry\.npmjs\.org\//,'no local candidate paths in committed dependency sources');
    else assert.ok(['', 'integrations/github', 'integrations/blender'].includes(name),'only the intended plugin workspace belongs in the lockfile');
  }
  assert.deepEqual(lock.packages['integrations/github'].peerDependencies,pkg.peerDependencies);
  assert.deepEqual(lock.packages['integrations/github'].peerDependenciesMeta,pkg.peerDependenciesMeta);
  assert.match(pkg.scripts.prepublishOnly,/Integration npm publication is disabled/);
  assert.match(pkg.scripts.prepublishOnly,/process\.exit\(1\)/);
  assert.equal(root.devDependencies.tsx,'4.23.15');
});

test('Blender local operation retains exact Core compatibility',async () => {
  const blender = await readJson('../integrations/blender/package.json');
  assert.equal(blender.superbeeLocalOperations.core,'0.2.0-pre.32');
});
