import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const recipe = path.join(root, 'recipes/decision');
const example = path.join(root, 'examples/decision/records');
const read = file => readFileSync(file, 'utf8');
const frontmatter = text => {
  assert.match(text, /^---\n/);
  const end = text.indexOf('\n---\n', 4);
  assert.ok(end > 4, 'frontmatter closing delimiter');
  return text.slice(4, end);
};
const field = (header, key) => {
  const escaped = key.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
  const match = header.match(new RegExp('^' + escaped + ':\\s*(.+)$', 'm'));
  return match?.[1]?.trim() ?? null;
};
const readDoc = p => {
  const source = read(p);
  return {source, header: frontmatter(source)};
};

test('Decision is a definitions-only, independently installable recipe', () => {
  const {header} = readDoc(path.join(recipe, 'recipe.md'));
  assert.equal(field(header, 'type'), 'Recipe');
  assert.equal(field(header, 'id'), 'decision');
  assert.equal(field(header, 'content_policy'), 'definitions-only');
  assert.equal(field(header, 'requires'), null, 'no unsupported dependency manifest');
  assert.equal(field(header, 'composes'), null, 'no unsupported composition manifest');

  const expected = {
    'decision-case.md': 'Decision Case',
    'decision-option.md': 'Decision Option',
    'decision.md': 'Decision',
  };
  const dir = path.join(recipe, 'conventions');
  assert.deepEqual(readdirSync(dir).sort(), Object.keys(expected).sort());
  for (const [filename, kind] of Object.entries(expected)) {
    const {header} = readDoc(path.join(dir, filename));
    assert.equal(field(header, 'type'), 'Convention');
    assert.equal(field(header, 'governs'), kind);
  }
  assert.ok(!readdirSync(dir).some(name => /^(?:task|research-)/.test(name)),
    'Task and Research Kinds are owned by other recipes');

  for (const name of ['decision-model', 'adopting-existing-decisions']) {
    const {header} = readDoc(path.join(recipe, 'references', name + '.md'));
    assert.equal(field(header, 'type'), 'Reference');
    assert.ok(read(path.join(recipe, 'recipe.md')).includes('references/' + name + '.md'));
  }
});

test('Decision model preserves authority and follow-through distinctions', () => {
  const choice = read(path.join(recipe, 'conventions/decision.md'));
  const deliberation = read(path.join(recipe, 'conventions/decision-case.md'));
  const option = read(path.join(recipe, 'conventions/decision-option.md'));
  for (const lifecycle of ['proposed', 'recorded', 'superseded', 'withdrawn']) {
    assert.match(choice, new RegExp('\\b' + lifecycle + '\\b'));
  }
  assert.match(choice, /follow-up: Task/);
  assert.match(choice, /investigation task: Task/);
  assert.match(choice, /review task: Task/);
  assert.match(choice, /superseded decision: Decision/);
  assert.match(choice, /selects: Decision Option/);
  assert.match(choice, /resolves case: Decision Case/);
  assert.match(deliberation, /needs research: Research Question/);
  assert.match(deliberation, /investigated by: Task/);
  assert.match(option, /supported by: Research Claim/);
  assert.match(option, /challenged by: Research Claim/);
  assert.match(choice, /recorded is a claim of a decision/i);
  const adoption = read(path.join(recipe, 'references/adopting-existing-decisions.md'));
  assert.match(adoption, /does not.*migrat/i);
  assert.match(adoption, /do not.*bulk-retype/i);
});

test('synthetic decision, options, case and tasks resolve to the expected types', () => {
  const files = [
    'decision-cases/notifications.md',
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
  const types = {
    'considers': 'Decision Option',
    'investigated by': 'Task',
    'resolved by': 'Decision',
    'tested by': 'Task',
    'resolves case': 'Decision Case',
    'selects': 'Decision Option',
    'investigation task': 'Task',
    'follow-up': 'Task',
    'depends on': 'Task',
  };
  let links = 0;
  for (const [relative, doc] of docs) {
    for (const match of doc.source.matchAll(/\[([^\]]+)\]\(([^)]+\.md)\)/g)) {
      const [, label, target] = match;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), target));
      assert.ok(docs.has(resolved), 'missing target ' + relative + ' → ' + resolved);
      assert.equal(docs.get(resolved).type, types[label], relative + ' ' + label);
      links++;
    }
  }
  assert.ok(links >= 8, 'connected example includes deliberation and follow-up');
  assert.equal(docs.get('decisions/select-service-a.md').type, 'Decision');
  assert.match(docs.get('decisions/select-service-a.md').source, /decision_status: recorded/);
  assert.match(docs.get('tasks/configure-service-a.md').source, /superbee_progress_status: todo/);
  assert.match(docs.get('tasks/test-service-a.md').source, /superbee_progress_status: done/);
});

test('optional installed public Superbee CLI parses recipe', {
  skip: !process.env.DECISION_CLI && 'Set DECISION_CLI to an installed reviewed Superbee executable to test native parsing',
}, () => {
  const selected = process.env.DECISION_CLI;
  const script = /\.(?:mjs|js)$/.test(selected);
  const proc = spawnSync(script ? process.execPath : selected,
    [...(script ? [selected] : []), 'recipe', 'validate', recipe, '--json'],
    {encoding: 'utf8', timeout: 120_000});
  assert.ifError(proc.error);
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  const result = JSON.parse(proc.stdout);
  assert.equal(result.ok, true);
});
