import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const recipe = path.join(root, 'recipes/decision');
const example = path.join(root, 'examples/decision/records');
const actor = 'process:decision-example-test';
const read = file => readFileSync(file, 'utf8');

function frontmatter(source) {
  assert.match(source, /^---\n/);
  const end = source.indexOf('\n---\n', 4);
  assert.ok(end > 4, 'frontmatter closing delimiter');
  return source.slice(4, end);
}
function field(header, key) {
  const escaped = key.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
  return header.match(new RegExp('^' + escaped + ':\\s*(.+)$', 'm'))?.[1]?.trim() ?? null;
}
function kindLinks(source) {
  const header = frontmatter(source);
  const block = header.match(/^links:\n((?:[ \t]+[^\n]*\n)*)/m)?.[1] ?? '';
  const links = new Map();
  for (const line of block.split('\n')) {
    const match = line.match(/^  ([^:\n]+):\s*(\S.*?)\s*$/);
    if (match) links.set(match[1], match[2]);
  }
  return links;
}
const conventions = () => {
  const dir = path.join(recipe, 'conventions');
  return new Map(readdirSync(dir).map(name => {
    const source = read(path.join(dir, name));
    return [field(frontmatter(source), 'governs'), {name, source, links: kindLinks(source)}];
  }));
};

function invokeCli(cli, args) {
  const script = /\.(?:mjs|js)$/.test(cli);
  const proc = spawnSync(script ? process.execPath : cli,
    [...(script ? [cli] : []), ...args, '--json'],
    {encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024});
  assert.ifError(proc.error);
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  return JSON.parse(proc.stdout);
}

test('Decision is a definitions-only recipe with three independent Kinds', () => {
  const source = read(path.join(recipe, 'recipe.md'));
  const header = frontmatter(source);
  assert.equal(field(header, 'type'), 'Recipe');
  assert.equal(field(header, 'id'), 'decision');
  assert.equal(field(header, 'content_policy'), 'definitions-only');
  assert.equal(field(header, 'requires'), null);
  assert.equal(field(header, 'composes'), null);

  const declared = conventions();
  assert.deepEqual([...declared.keys()].sort(), ['Decision', 'Decision Question', 'Option']);
  assert.deepEqual([...declared.values()].map(x => x.name).sort(),
    ['decision.md', 'decision-question.md', 'option.md'].sort());
  assert.equal(declared.has('Task'), false);
  assert.equal(declared.has('Research Question'), false);

  for (const name of ['decision-model', 'adopting-existing-decisions']) {
    const reference = read(path.join(recipe, 'references', name + '.md'));
    assert.equal(field(frontmatter(reference), 'type'), 'Reference');
    assert.ok(source.includes('references/' + name + '.md'));
  }
  const guide = read(path.join(recipe, 'references', 'adopting-existing-decisions.md'));
  assert.match(guide, /first-by-ID/);
  assert.match(guide, /pre-install check/i);
  assert.match(guide, /conventions\/project-decision/);
  assert.match(guide, /does not rewrite historical Decision instances/i);
  assert.match(guide, /bulk-retype its records/i);
  const model = read(path.join(recipe, 'references', 'decision-model.md'));
  const tick = String.fromCharCode(96);
  assert.ok(model.includes(tick + '[selects](../options/queue.md)' + tick),
    'example link must be literal code, not an installed unresolved link');
});

test('Decision relationships preserve one canonical edge direction', () => {
  const declared = conventions();
  const choice = declared.get('Decision');
  const question = declared.get('Decision Question');
  const option = declared.get('Option');
  for (const state of ['proposed', 'recorded', 'superseded', 'withdrawn']) {
    assert.match(choice.source, new RegExp('\\b' + state + '\\b'));
  }
  assert.equal(choice.links.get('resolves question'), 'Decision Question');
  assert.equal(choice.links.get('selects'), 'Option');
  assert.equal(choice.links.get('follow-up'), 'Task');
  assert.equal(choice.links.get('review task'), 'Task');
  assert.equal(choice.links.get('superseded decision'), 'Decision');
  assert.equal(question.links.get('considers'), 'Option');
  assert.equal(question.links.get('needs research'), 'Research Question');
  assert.equal(question.links.get('investigated by'), 'Task');
  assert.equal(option.links.get('supported by'), 'Research Claim');
  assert.equal(option.links.get('challenged by'), 'Research Claim');
  assert.equal(question.links.has('resolved by'), false,
    'the Decision is the single authoritative source of the resolution edge');
  assert.equal(choice.links.has('investigation task'), false,
    'pre-decision investigation belongs to the Question');
  assert.match(question.source, /superbee_progress_status/);
  assert.match(choice.source, /recorded is a claim of a decision/i);
});

test('synthetic Decision Question, Options and Tasks match convention links', () => {
  const files = [
    'decision-questions/notifications.md',
    'options/service-a.md',
    'options/service-b.md',
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

test('public CLI validates Decision recipe', {
  skip: !process.env.DECISION_CLI && 'Set DECISION_CLI to a reviewed Superbee executable',
}, () => {
  const result = invokeCli(process.env.DECISION_CLI,
    ['recipe', 'validate', recipe]);
  assert.equal(result.ok, true);
});

test('public CLI fresh-bundle install and example have zero structural debt', {
  skip: !process.env.DECISION_CLI && 'Set DECISION_CLI to a reviewed Superbee executable',
  timeout: 180_000,
}, () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), 'superbee-decision-'));
  const cli = process.env.DECISION_CLI;
  const bundle = path.join(scratch, 'bundle');
  const sb = args => invokeCli(cli, [...args, '--dir', bundle]);
  try {
    sb(['init', '--create-only', '--recipe', 'none']);
    sb(['recipe', 'add', 'work-tracking', '--actor', actor]);
    sb(['recipe', 'add', recipe, '--actor', actor]);
    for (const relative of [
      'options/service-a.md',
      'options/service-b.md',
      'tasks/test-service-a.md',
      'tasks/configure-service-a.md',
      'decision-questions/notifications.md',
      'decisions/select-service-a.md',
    ]) {
      sb(['promote', path.join(example, relative), '--doc-key', relative, '--actor', actor]);
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
