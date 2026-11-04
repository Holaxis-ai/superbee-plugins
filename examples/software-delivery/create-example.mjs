import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const help = 'Usage: node examples/software-delivery/create-example.mjs --out /absolute/absent/directory [--cli /path/to/superbee]';
const options = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i], value = process.argv[i + 1];
  if (key === '--help') { console.log(help); process.exit(0); }
  if (!['--out', '--cli'].includes(key) || !value || options.has(key)) throw new Error(help);
  options.set(key, value);
}
const out = options.get('--out');
if (!out || !path.isAbsolute(out)) throw new Error(help);
const cli = options.get('--cli') ?? 'superbee';
const actor = 'process:fictional-builder';
const root = fileURLToPath(new URL('../../', import.meta.url));
let created = false;
function run(command, args, cwd, expected = 0) {
  // Ambient Git routing/config must not redirect this fictional repository's writes.
  const env = command === 'git' ? {...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null'} : process.env;
  const result = spawnSync(command, args, {cwd, env, encoding: 'utf8', shell: false, timeout: 30_000, maxBuffer: 2 * 1024 * 1024});
  if (result.error || result.signal || result.status !== expected) throw new Error(`Example command failed: ${command} ${args[0]} (${result.status}); ${result.stderr || result.stdout || result.error?.message}`);
  return result.stdout.trim();
}
function sb(args) {
  return JSON.parse(/\.(?:mjs|js)$/.test(cli)
    ? run(process.execPath, [cli, ...args, '--json'])
    : run(cli, [...args, '--json']));
}
try {
  const identity = sb(['version']).identity;
  if (identity.package.version !== '0.4.4-pre.14' || identity.source.commit !== 'da215d8610a39974bc39a195ad87f769c4d87560' || identity.source.dirty || identity.artifact.channel !== 'npm-package') throw new Error('Use the qualified public CLI superbee@0.4.4-pre.14.');
  // mkdir is create-only. An occupied destination, including a symlink, is never adopted.
  mkdirSync(out); created = true;
  const bundle = path.join(out, 'bundle'), source = path.join(out, 'source');
  const native = args => sb([...args, '--actor', actor, '--dir', bundle]);
  // Native init supplies enclosing-bundle/bound-project guards before any source is created.
  sb(['init', '--create-only', '--recipe', 'context-notes', '--dir', bundle]);
  native(['recipe', 'add', 'work-tracking']);
  native(['recipe', 'add', path.join(root, 'recipes/software-delivery')]);
  mkdirSync(source);
  const git = args => run('git', ['-c', 'user.name=Fictional Example', '-c', 'user.email=example@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], source);
  git(['init', '--initial-branch=main']);
  writeFileSync(path.join(source, 'label.mjs'), 'export const label = value => value.trim();\n');
  writeFileSync(path.join(source, 'check.mjs'), "import assert from 'node:assert/strict';\nimport {label} from './label.mjs';\nassert.equal(label('  oak  '), 'oak');\nassert.equal(label(12), '12');\nconsole.log('label smoke passed');\n");
  git(['add', '.']); git(['commit', '-m', 'Synthetic initial implementation']);
  const revisionA = git(['rev-parse', 'HEAD']);
  run(process.execPath, ['check.mjs'], source, 1);
  const task = native(['new', 'Task', 'tasks/label-input', '--title', 'Accept textual and numeric labels', '--progress_status', 'todo', '--body', '# Outcome\nTrim textual input and preserve numeric input as text.\n\n# Acceptance\nThe local feature branch is merged, then the smoke command passes at the actual integration commit. A technical recommendation or source merge alone is insufficient.\n\n# Handoff\nResolve review F1, obtain an assessment of the current source revision, integrate, and verify the integration commit.\n']);
  const beforeClaim = sb(['doc', 'read', 'tasks/label-input', '--dir', bundle]).head_version;
  native(['doc', 'update', 'tasks/label-input', '--assignee', actor, '--progress_status', 'in_progress', '--expected-version', beforeClaim]);
  const reviewBody = `# Scope\nDoes the label function accept strings and numbers? Inspected the complete two-file fictional source at ${revisionA}.\n\n# Findings\nF1: numeric input throws TypeError because value.trim is not a function. Convert input deliberately before trimming.\n\n# Evidence\nRan node check.mjs at ${revisionA}: exit 1 on the numeric case. This was an actual local smoke check, not CI or provider evidence. No integration has occurred.\n\n# Limits\nOnly the two stated inputs were checked. No claim about all JavaScript values, security or a real repository.\n\n[reviews](../tasks/label-input.md)\n`;
  sb(['new', 'Change Review', 'change-reviews/label-a', '--title', 'Numeric input needs a correction', '--target', 'fictional label example/source', '--revision', revisionA, '--question', 'Do the two stated inputs produce their required labels?', '--verdict', 'changes_requested', '--reviewer', 'process:fictional-reviewer', '--body', reviewBody, '--actor', 'process:fictional-reviewer', '--dir', bundle]);
  native(['new', 'Context Note', 'context-notes/label-handoff', '--title', 'Fictional label handoff at revision A', '--timestamp', new Date().toISOString(), '--body', `# Summary\nAt ${revisionA}, numeric input failed the smoke check. The builder owns [the work](../tasks/label-input.md); [review A](../change-reviews/label-a.md) records F1. Next: fix the input conversion, then review the new revision. No integration or delivery has occurred. This note records that checkpoint; inspect current source and records before resuming.\n`]);
  git(['switch', '-c', 'fix-label']);
  writeFileSync(path.join(source, 'label.mjs'), 'export const label = value => String(value).trim();\n');
  git(['add', 'label.mjs']); git(['commit', '-m', 'Synthetic numeric input correction']);
  const revisionB = git(['rev-parse', 'HEAD']);
  console.log(JSON.stringify({synthetic: true, out, bundle, source, revisionA, revisionB, task: task.id ?? 'tasks/label-input', beforeClaim, checkpoint: 'Source B exists; the note and review remain at A. Session two must inspect current evidence.'}));
} catch (error) {
  console.error(`${error.message}${created ? `\nPartial example retained at ${out}; inspect it and choose another absent destination for a new run.` : ''}`);
  process.exitCode = 1;
}
