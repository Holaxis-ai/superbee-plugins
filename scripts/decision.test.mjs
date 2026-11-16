import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test, {before, after} from 'node:test';
import {parseMarkdown} from '@superbee/core';
import {isolatedEnvironment} from './vendor/package-verification/src/harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const ownership = 'ns-10fe0c6e18c73ef84d3a025b4fda1a80fd97e7f950e7a949cbe607884f3026d3';
const decisionType = name => 'github.com/holaxis-ai/superbee-plugins/decision/' + name;
const researchType = name => 'github.com/holaxis-ai/superbee-plugins/deep-research/' + name;
const recipe = path.join(root, 'recipes', ownership);
const example = path.join(root, 'examples/decision/records');
const actor = 'process:decision-example-test';
const read = file => readFileSync(file, 'utf8');

const frontmatter = source => parseMarkdown(source, 'synthetic.md').frontmatter;
const field = (header, key) => header[key] ?? null;
const kindLinks = source => new Map(Object.entries(frontmatter(source).links ?? {}));
const conventions = () => {
  const dir = path.join(recipe, 'conventions', ownership);
  return new Map(readdirSync(dir).map(name => {
    const source = read(path.join(dir, name));
    return [field(frontmatter(source), 'governs'), {name, source, links: kindLinks(source)}];
  }));
};

let consumerCli = process.env.DECISION_CLI;
let toolRoot;
let consumerEnv;
before(() => {
  toolRoot = mkdtempSync(path.join(os.tmpdir(), 'decision-consumer-tool-'));
  const home = path.join(toolRoot, 'home'); mkdirSync(home);
  consumerEnv = isolatedEnvironment({home, values: {PATH: process.env.PATH ?? path.dirname(process.execPath), SUPERBEE_ACTOR: actor}});
  if (consumerCli) return;
  assert.ok(process.env.npm_execpath, 'Run through npm exec -- node --test, or set DECISION_CLI');
  const installed = spawnSync(process.execPath, [process.env.npm_execpath, 'install', '--prefix', toolRoot,
    'superbee@0.4.4-pre.9', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false',
    '--registry=https://registry.npmjs.org/'], {encoding: 'utf8', env: consumerEnv, timeout: 120_000});
  assert.ifError(installed.error);
  assert.equal(installed.status, 0, installed.stderr || installed.stdout);
  consumerCli = path.join(toolRoot, 'node_modules/superbee/dist/superbee.mjs');
});
after(() => { if (toolRoot) rmSync(toolRoot, {recursive: true, force: true}); });

function invokeCli(cli, args) {
  const script = /\.(?:mjs|js)$/.test(cli);
  const proc = spawnSync(script ? process.execPath : cli,
    [...(script ? [cli] : []), ...args, '--json'],
    {encoding: 'utf8', env: consumerEnv, timeout: 120_000, maxBuffer: 8 * 1024 * 1024});
  assert.ifError(proc.error);
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  return JSON.parse(proc.stdout);
}

test('Decision is a definitions-only recipe with three independent Kinds', () => {
  const source = read(path.join(recipe, 'recipe.md'));
  const header = frontmatter(source);
  assert.equal(field(header, 'type'), 'Recipe');
  assert.equal(field(header, 'id'), ownership);
  assert.equal(field(header, 'content_policy'), 'definitions-only');
  assert.equal(field(header, 'requires'), null);
  assert.equal(field(header, 'composes'), null);

  const declared = conventions();
  assert.deepEqual([...declared.keys()].sort(), ['Decision', 'Decision Option', 'Decision Question'].map(decisionType));
  assert.deepEqual([...declared.values()].map(x => x.name).sort(),
    ['decision.md', 'decision-question.md', 'decision-option.md'].sort());
  assert.equal(declared.has('Task'), false);
  assert.equal(declared.has('Research Question'), false);

  for (const name of ['decision-model', 'adopting-existing-decisions']) {
    const reference = read(path.join(recipe, 'references', ownership, name + '.md'));
    assert.equal(field(frontmatter(reference), 'type'), 'Reference');
    assert.ok(frontmatter(source).references.includes('references/' + ownership + '/' + name + '.md'));
    // Superbee 0.4.5 extracts Markdown links even inside code spans/fences.
    // Installed references must not contain illustrative .md links to missing targets.
    assert.doesNotMatch(reference, /\]\([^\n)]*\.md(?:#[^\n)]*)?\)/,
      name + ' reference must not contain Markdown links to .md targets');
  }
  const guide = read(path.join(recipe, 'references', ownership, 'adopting-existing-decisions.md'));
  assert.match(guide, /first-by-ID/);
  assert.match(guide, /pre-install check/i);
  assert.match(guide, /conventions\/project-decision/);
  assert.match(guide, /does not rewrite historical Decision instances/i);
  assert.match(guide, /bulk-retype its records/i);
});

test('Decision relationships preserve one canonical edge direction', () => {
  const declared = conventions();
  const choice = declared.get(decisionType('Decision'));
  const question = declared.get(decisionType('Decision Question'));
  const option = declared.get(decisionType('Decision Option'));
  for (const state of ['proposed', 'recorded', 'superseded', 'withdrawn']) {
    assert.match(choice.source, new RegExp('\\b' + state + '\\b'));
  }
  assert.equal(choice.links.get('resolves question'), decisionType('Decision Question'));
  assert.equal(choice.links.get('selects'), decisionType('Decision Option'));
  assert.equal(choice.links.get('follow-up'), 'Task');
  assert.equal(choice.links.get('review task'), 'Task');
  assert.equal(choice.links.get('superseded decision'), decisionType('Decision'));
  assert.equal(question.links.get('considers'), decisionType('Decision Option'));
  assert.equal(question.links.get('needs research'), researchType('Research Question'));
  assert.equal(question.links.get('investigated by'), 'Task');
  assert.equal(option.links.get('supported by'), researchType('Research Claim'));
  assert.equal(option.links.get('challenged by'), researchType('Research Claim'));
  assert.equal(question.links.has('resolved by'), false,
    'the Decision is the single authoritative source of the resolution edge');
  assert.equal(choice.links.has('investigation task'), false,
    'pre-decision investigation belongs to the Question');
  assert.match(question.source, /superbee_progress_status/);
  assert.match(choice.source, /recorded is a claim of a decision/i);
});

test('synthetic Decision Question, Decision Options and Tasks match convention links', () => {
  const files = [
    'decision-questions/notifications.md',
    'decision-options/service-a.md',
    'decision-options/service-b.md',
    'decisions/select-service-a.md',
    'tasks/test-service-a.md',
    'tasks/configure-service-a.md',
  ];
  const docs = new Map(files.map(relative => {
    const source = read(path.join(example, relative));
    return [relative, {source, type: field(frontmatter(source), 'type')}];
  }));
  const declared = conventions();
  const externalLinks = new Map([['Task', new Map([['depends on', 'Task']])]]);
  let checked = 0;
  for (const [relative, doc] of docs) {
    const links = declared.get(doc.type)?.links ?? externalLinks.get(doc.type);
    assert.ok(links, 'unknown source Kind ' + doc.type);
    for (const match of doc.source.matchAll(/\[([^\]]+)\]\(([^)]+\.md)\)/g)) {
      const [, label, target] = match;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), target));
      assert.ok(docs.has(resolved), 'missing ' + relative + ' -> ' + resolved);
      assert.equal(docs.get(resolved).type, links.get(label),
        'type mismatch for "' + label + '" from ' + relative);
      checked++;
    }
  }
  assert.ok(checked >= 7);
  assert.match(docs.get('decisions/select-service-a.md').source, /decision_status: recorded/);
  assert.match(docs.get('tasks/configure-service-a.md').source, /superbee_progress_status: todo/);
  assert.match(docs.get('tasks/test-service-a.md').source, /superbee_progress_status: done/);
});

test('public CLI validates Decision recipe', () => {
  const {identity} = invokeCli(consumerCli, ['version']);
  assert.equal(identity.artifact.channel, 'npm-package');
  assert.equal(identity.source.dirty, false);
  const result = invokeCli(consumerCli,
    ['recipe', 'validate', recipe]);
  assert.equal(result.ok, true);
});

test('public CLI fresh-bundle install and example have zero structural debt', {
  timeout: 180_000,
}, () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), 'superbee-decision-'));
  const cli = consumerCli;
  const bundle = path.join(scratch, 'bundle');
  const sb = args => invokeCli(cli, [...args, '--dir', bundle]);
  try {
    sb(['init', '--create-only', '--recipe', 'none']);
    sb(['recipe', 'add', 'work-tracking', '--actor', actor]);
    sb(['recipe', 'add', recipe, '--actor', actor]);
    for (const relative of [
      'decision-options/service-a.md',
      'decision-options/service-b.md',
      'tasks/test-service-a.md',
      'tasks/configure-service-a.md',
      'decision-questions/notifications.md',
      'decisions/select-service-a.md',
    ]) {
      sb(['promote', path.join(example, relative), '--doc-key', relative, '--strict']);
    }
    const status = sb(['status']);
    for (const key of ['kind_warnings', 'conformance_debt', 'link_type_violations', 'unresolved_links']) {
      assert.equal(status[key], 0, key + ' must be zero in the new bundle');
    }
    const decision = sb(['doc', 'read', 'decisions/select-service-a']);
    assert.equal(decision.decision_status, 'recorded');
    const follow = sb(['link', 'show', 'decisions/select-service-a', '--text', 'follow-up']);
    assert.equal(follow.outbound[0].to, 'tasks/configure-service-a');
    const task = sb(['doc', 'read', 'tasks/configure-service-a']);
    assert.equal(task.superbee_progress_status, 'todo');
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
});
