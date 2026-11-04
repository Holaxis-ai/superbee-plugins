import assert from 'node:assert/strict';
import {cp, mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {createWorkspace, isolatedEnvironment, runProcess} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const builder = 'process:fictional-builder', reviewer = 'process:fictional-reviewer';

test('software delivery: public CLI, inert composition and a two-session revision handoff', {timeout: 300_000}, async t => {
  const workspace = await createWorkspace();
  try {
    const scratch = workspace.root, home = path.join(scratch, 'home');
    await mkdir(home);
    const env = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath)}});
    const run = (command, args, expected = 0, cwd = scratch) => runProcess(command, args, {cwd, env, expected, timeout: 120_000, maxBuffer: 4 * 1024 * 1024});
    assert.ok(process.env.npm_execpath, 'Run with npm exec -- node --test scripts/software-delivery.test.mjs');
    const tool = path.join(scratch, 'tool');
    await run(process.execPath, [process.env.npm_execpath, 'install', '--prefix', tool, 'superbee@0.4.4-pre.14', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org/']);
    const cli = path.join(tool, 'node_modules/superbee/dist/superbee.mjs');
    const sb = async (args, expected = 0) => {
      const result = await run(process.execPath, [cli, ...args, '--json'], expected);
      return expected === 0 ? JSON.parse(result.stdout) : result.stdout + result.stderr;
    };
    const identity = (await sb(['version'])).identity;
    assert.equal(identity.package.version, '0.4.4-pre.14');
    assert.equal(identity.source.commit, 'da215d8610a39974bc39a195ad87f769c4d87560');
    assert.equal(identity.source.dirty, false);
    assert.equal(identity.artifact.channel, 'npm-package');
    const portable = path.join(scratch, 'portable');
    const recipe = path.join(portable, 'recipes/software-delivery');
    await cp(path.join(root, 'recipes/software-delivery'), recipe, {recursive: true});
    await cp(path.join(root, 'examples/software-delivery'), path.join(portable, 'examples/software-delivery'), {recursive: true});
    assert.equal((await sb(['recipe', 'validate', recipe])).ok, true);
    const read = (bundle, id) => sb(['doc', 'read', id, '--offset', '0', '--dir', bundle]);
    const native = (bundle, args, actor = builder, expected = 0) => sb([...args, '--actor', actor, '--dir', bundle], expected);
    const clean = async bundle => {
      const state = await sb(['status', '--dir', bundle]);
      for (const key of ['malformed', 'kind_warnings', 'unresolved_links', 'orphans', 'link_type_violations', 'conformance_debt']) assert.equal(state[key], 0, `${key}: ${JSON.stringify(state)}`);
      return state;
    };

    await t.test('inert install, repeat preservation and conflicting reference refusal', async () => {
      const bundle = path.join(scratch, 'blank');
      await sb(['init', '--create-only', '--recipe', 'context-notes', '--dir', bundle]);
      await native(bundle, ['recipe', 'add', 'work-tracking']);
      const base = await Promise.all(['context-note', 'task'].map(name => readFile(path.join(bundle, `conventions/${name}.md`))));
      await native(bundle, ['recipe', 'add', recipe]);
      assert.equal((await clean(bundle)).docs, 4, 'three conventions and one reference, no work instances');
      for (const type of ['Task', 'Context Note', 'Change Review']) assert.equal((await sb(['list', '--type', type, '--dir', bundle])).count, 0);
      assert.equal((await native(bundle, ['recipe', 'add', recipe])).changed, false);
      for (let i = 0; i < base.length; i++) assert.deepEqual(await readFile(path.join(bundle, `conventions/${['context-note', 'task'][i]}.md`)), base[i]);
      const convention = await read(bundle, 'conventions/change-review');
      await native(bundle, ['doc', 'update', convention.id, '--body', convention.body + '\nLocal guidance.\n', '--expected-version', convention.head_version]);
      const changed = await readFile(path.join(bundle, 'conventions/change-review.md'));
      const repeated = await native(bundle, ['recipe', 'add', recipe]);
      assert.ok(repeated.docs.some(row => row.source_differs));
      assert.deepEqual(await readFile(path.join(bundle, 'conventions/change-review.md')), changed);
      const collision = path.join(scratch, 'collision');
      await sb(['init', '--create-only', '--recipe', 'none', '--dir', collision]);
      await native(collision, ['doc', 'write', 'references/software-delivery', '--type', 'Reference', '--title', 'Existing authored reference', '--body', 'Keep this text.']);
      const occupied = await readFile(path.join(collision, 'references/software-delivery.md'));
      assert.match(await native(collision, ['recipe', 'add', recipe], builder, 5), /conflict|existing|differs/i);
      assert.deepEqual(await readFile(path.join(collision, 'references/software-delivery.md')), occupied);
      assert.equal((await sb(['list', '--type', 'Convention', '--dir', collision])).count, 0, 'preflight does not partly install a conflicting recipe');
    });

    const out = path.join(scratch, 'fictional-example');
    const starter = path.join(portable, 'examples/software-delivery/create-example.mjs');
    const started = JSON.parse((await run(process.execPath, [starter, '--out', out, '--cli', cli])).stdout);
    const {bundle, source, revisionA, revisionB} = started;
    const git = async args => (await run('git', ['-c', 'user.name=Fictional Example', '-c', 'user.email=example@example.invalid', '-c', 'commit.gpgsign=false', ...args], 0, source)).stdout.trim();
    const reviewA = await readFile(path.join(bundle, 'change-reviews/label-a.md'));
    await t.test('fresh session recovers current work and rejects stale ownership/invalid assessments', async () => {
      const task = await read(bundle, 'tasks/label-input');
      const previous = await read(bundle, 'change-reviews/label-a');
      const note = await read(bundle, 'context-notes/label-handoff');
      assert.equal(task.assignee, builder);
      assert.equal(task.superbee_progress_status, 'in_progress');
      assert.match(task.body, /merged.*smoke command passes/s);
      assert.equal(await git(['rev-parse', 'HEAD']), revisionB);
      assert.equal(previous.revision, revisionA);
      assert.notEqual(previous.revision, revisionB, 'old assessment does not silently follow the source');
      assert.equal(previous.verdict, 'changes_requested');
      assert.match(previous.body, /F1.*numeric/s);
      assert.match(note.body, new RegExp(revisionA));
      assert.match(task.body, /obtain an assessment.*integrate.*verify/s);
      assert.match(await native(bundle, ['doc', 'update', task.id, '--assignee', 'process:fictional-racer', '--progress_status', 'in_progress', '--expected-version', started.beforeClaim], 'process:fictional-racer', 5), /STALE_HEAD|conflict/i);
      assert.equal((await read(bundle, task.id)).assignee, builder);
      const flags = ['--title', 'Invalid example', '--target', 'fictional source', '--revision', revisionB, '--question', 'Do the inputs work?'];
      await native(bundle, ['new', 'Change Review', 'change-reviews/invalid-enum', ...flags, '--verdict', 'human_approved'], reviewer, 2);
      await native(bundle, ['new', 'Change Review', 'change-reviews/invalid-sections', ...flags, '--verdict', 'acceptable', '--body', '# Scope\nOnly one heading.'], reviewer, 2);
      await clean(bundle);
      t.diagnostic('recovered owner, acceptance, source B, review A scope, finding F1 and re-review/integration/verification next steps; the note alone was stale');
    });
    await t.test('successor assessment preserves A; source merge stays active until integration evidence', async () => {
      assert.equal((await run(process.execPath, ['check.mjs'], 0, source)).stdout.trim(), 'label smoke passed');
      const body = `# Scope\nThe complete fictional source at ${revisionB}; only the two stated inputs.\n\n# Findings\nF1 is resolved by explicit conversion before trimming.\n\n# Evidence\nInspected label.mjs and ran node check.mjs at ${revisionB}: exit 0. This is a local smoke check, not CI. Integration is not yet performed.\n\n# Limits\nOther JavaScript values and real-provider behavior were not assessed. This is a technical recommendation, not human approval.\n\n[reviews](../tasks/label-input.md)\n\n[supersedes](../change-reviews/label-a.md)\n`;
      await native(bundle, ['new', 'Change Review', 'change-reviews/label-b', '--title', 'The stated inputs pass at B', '--target', 'fictional label example/source', '--revision', revisionB, '--question', 'Do the two stated inputs produce their required labels?', '--verdict', 'acceptable', '--reviewer', reviewer, '--body', body], reviewer);
      assert.deepEqual(await readFile(path.join(bundle, 'change-reviews/label-a.md')), reviewA);
      assert.equal((await sb(['link', 'show', 'change-reviews/label-b', '--text', 'supersedes', '--dir', bundle])).outbound[0].to, 'change-reviews/label-a');
      await git(['switch', 'main']);
      await git(['merge', '--no-ff', 'fix-label', '-m', 'Synthetic local feature integration']);
      const integration = await git(['rev-parse', 'HEAD']);
      assert.notEqual(integration, revisionB, 'tested source and integration revisions are different');
      let task = await read(bundle, 'tasks/label-input');
      const pending = task.body + `\n# Integration receipt\nActual local Git merge commit ${integration} includes source ${revisionB}. [Technical assessment B](../change-reviews/label-b.md) applies to B. The agreed integration smoke check has not run; keep the Task active. No GitHub PR was created or merged.\n`;
      await native(bundle, ['doc', 'update', task.id, '--body', pending, '--expected-version', task.head_version]);
      assert.equal((await read(bundle, task.id)).superbee_progress_status, 'in_progress');
      assert.equal((await sb(['list', '--type', 'Task', '--open', '--dir', bundle])).count, 1);
      assert.equal((await run(process.execPath, ['check.mjs'], 0, source)).stdout.trim(), 'label smoke passed');
      task = await read(bundle, task.id);
      await native(bundle, ['doc', 'update', task.id, '--body', task.body + `\n# Accepted evidence\nRan node check.mjs at integration ${integration}: exit 0. Actual local merge and integration smoke acceptance are both met.\n`, '--progress_status', 'done', '--expected-version', task.head_version]);
      const note = await read(bundle, 'context-notes/label-handoff');
      await native(bundle, ['doc', 'update', note.id, '--body', `# Summary\n[Task](../tasks/label-input.md) acceptance is complete: source ${revisionB} was assessed in [review B](../change-reviews/label-b.md), then merged locally as ${integration} and smoke checked there. [Review A](../change-reviews/label-a.md) remains at ${revisionA}; its earlier failure is retained. No provider PR, human approval, release or deployment is implied.\n`, '--expected-version', note.head_version]);
      assert.equal((await read(bundle, 'change-reviews/label-b')).revision, revisionB);
      assert.deepEqual(await readFile(path.join(bundle, 'change-reviews/label-a.md')), reviewA);
      assert.equal((await sb(['list', '--type', 'Task', '--open', '--dir', bundle])).count, 0);
      await clean(bundle);
      t.diagnostic(`actual local integration ${integration}; reviewed/tested source ${revisionB}; separate integration check passed before done`);
    });
    await t.test('starter refuses an occupied destination without changing the existing example', async () => {
      const before = await readFile(path.join(bundle, 'tasks/label-input.md'));
      await run(process.execPath, [starter, '--out', out, '--cli', cli], 1);
      assert.deepEqual(await readFile(path.join(bundle, 'tasks/label-input.md')), before);
      const retainedHead = await git(['rev-parse', 'HEAD']);
      const other = path.join(scratch, 'another-fictional-example');
      await runProcess(process.execPath, [starter, '--out', other, '--cli', cli], {cwd: scratch, env: {...env, GIT_DIR: path.join(source, '.git'), GIT_WORK_TREE: source}, timeout: 30_000});
      assert.equal(await git(['rev-parse', 'HEAD']), retainedHead, 'ambient Git selection cannot redirect starter writes');
      assert.deepEqual(await readFile(path.join(bundle, 'tasks/label-input.md')), before);
    });
    t.diagnostic(`installed public CLI ${identity.package.version}, clean source ${identity.source.commit}; all bundle/source content fictional`);
  } finally {
    await workspace.close();
  }
});
